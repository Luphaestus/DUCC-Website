/**
 * authDB.js
 * 
 * This module manages database operations for authentication and password resets.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';

export default class AuthDB {
    /**
     * Find a user by email.
     */
    static async getUserByEmail(db, email) {
        return await db.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    /**
     * Find a user by ID.
     */
    static async getUserById(db, id) {
        return await db.get('SELECT * FROM users WHERE id = ?', [id]);
    }

    /**
     * Register a new user.
     */
    static async createUser(db, email, hashedPassword, first_name, last_name) {
        try {
            await db.run('INSERT INTO users (email, hashed_password, first_name, last_name) VALUES (?, ?, ?, ?)', [email, hashedPassword, first_name, last_name]);
            return new statusObject(201, 'User registered successfully.');
        } catch (err) {
            Logger.error(err);
            if (err.message && (err.message.includes('UNIQUE constraint failed') || err.code === 'ER_DUP_ENTRY')) {
                return new statusObject(400, 'Email is already taken.');
            }
            return new statusObject(500, 'Registration failed.');
        }
    }

    /**
     * Restore a deleted account.
     */
    static async restoreUser(db, id, email, hashedPassword, first_name, last_name) {
        try {
            await db.run(`
                UPDATE users SET 
                    email = ?, 
                    hashed_password = ?, 
                    first_name = ?, 
                    last_name = ?,
                    created_at = CURRENT_TIMESTAMP 
                WHERE id = ?`, 
                [email, hashedPassword, first_name, last_name, id]
            );
            return new statusObject(200, 'Account restored successfully.');
        } catch (err) {
            Logger.error(err);
            return new statusObject(500, 'Account restoration failed.');
        }
    }

    /**
     * Create a password reset token.
     */
    static async createPasswordReset(db, userId, token, expiresAt) {
        await db.run('DELETE FROM password_resets WHERE user_id = ?', [userId]);
        await db.run(
            'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
            [userId, token, expiresAt]
        );
    }

    /**
     * Find a valid password reset record by token.
     */
    static async getValidPasswordReset(db, token) {
        return await db.get(
            'SELECT * FROM password_resets WHERE token = ? AND expires_at > CURRENT_TIMESTAMP',
            [token]
        );
    }

    /**
     * Reset a user's password.
     */
    static async resetPassword(db, userId, hashedPassword) {
        await db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [hashedPassword, userId]);
        await db.run('DELETE FROM password_resets WHERE user_id = ?', [userId]);
    }

    /**
     * Update a user's password.
     */
    static async updatePassword(db, id, hashedPassword) {
        await db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [hashedPassword, id]);
    }

    /**
     * Set TOTP secret for a user.
     */
    static async setTOTPSecret(db, userId, secret) {
        await db.run('UPDATE users SET totp_secret = ? WHERE id = ?', [secret, userId]);
    }

    /**
     * Enable or disable TOTP for a user.
     */
    static async setTOTPEnabled(db, userId, enabled) {
        await db.run('UPDATE users SET totp_enabled = ? WHERE id = ?', [enabled ? 1 : 0, userId]);
    }

    /**
     * Get user's authenticators.
     */
    static async getUserAuthenticators(db, userId) {
        return await db.all('SELECT * FROM authenticators WHERE user_id = ?', [userId]);
    }

    /**
     * Get an authenticator by ID.
     */
    static async getAuthenticatorById(db, id) {
        return await db.get('SELECT * FROM authenticators WHERE id = ?', [id]);
    }

    /**
     * Save a new authenticator.
     */
    static async saveAuthenticator(db, userId, authenticator) {
        const credential = authenticator.credential || {};
        let credentialID = credential.id || authenticator.credentialID || authenticator.credentialId;
        let credentialPublicKey = credential.publicKey || authenticator.credentialPublicKey;
        
        // Ensure credentialID is a string (Base64URL)
        if (credentialID instanceof Uint8Array || credentialID instanceof Buffer) {
            credentialID = Buffer.from(credentialID).toString('base64url');
        }

        // Ensure publicKey is a Buffer (it might be a Uint8Array or object from JSON)
        if (credentialPublicKey && !(credentialPublicKey instanceof Buffer)) {
             // Handle the case where it's an object-like map {0: x, 1: y} which happens with some JSON parsers on Uint8Arrays
             if (typeof credentialPublicKey === 'object' && !Array.isArray(credentialPublicKey) && !credentialPublicKey.buffer) {
                 credentialPublicKey = Buffer.from(Object.values(credentialPublicKey));
             } else {
                 credentialPublicKey = Buffer.from(credentialPublicKey);
             }
        }

        const counter = credential.counter ?? authenticator.counter ?? 0;
        const transports = credential.transports || authenticator.transports;

        if (!credentialID) {
            Logger.error('saveAuthenticator: Missing credentialID', authenticator);
            throw new Error('Authenticator data is missing credentialID.');
        }

        await db.run(
            'INSERT INTO authenticators (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)',
            [credentialID, userId, credentialPublicKey, counter, transports ? JSON.stringify(transports) : null]
        );
    }

    /**
     * Update authenticator counter.
     */
    static async updateAuthenticatorCounter(db, id, counter) {
        await db.run('UPDATE authenticators SET counter = ? WHERE id = ?', [counter, id]);
    }

    /**
     * Delete an authenticator.
     */
    static async deleteAuthenticator(db, userId, id) {
        await db.run('DELETE FROM authenticators WHERE id = ? AND user_id = ?', [id, userId]);
    }
}
