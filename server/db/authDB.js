/**
 * authDB.js
 * 
 * This module manages database operations for authentication and password resets.
 */

const { statusObject } = require('../misc/status.js');

class AuthDB {
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
            console.error(err);
            if (err.message && err.message.includes('UNIQUE constraint failed')) {
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
            console.error(err);
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
}

module.exports = AuthDB;