/**
 * emailsDB.ts
 * 
 * This module handles database operations for multiple user emails.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';

export default class EmailsDB {
    /**
     * Get all emails for a user.
     */
    static async getUserEmails(db: DatabaseWrapper, userId: number): Promise<statusObject> {
        try {
            const emails = await db.all('SELECT * FROM user_emails WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC', [userId]);
            return new statusObject(200, null, emails);
        } catch (error) {
            Logger.error('Database error in getUserEmails:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Add a new email to a user.
     */
    static async addEmail(db: DatabaseWrapper, userId: number, email: string, verificationToken: string): Promise<statusObject> {
        try {
            await db.run(
                'INSERT INTO user_emails (user_id, email, verification_token) VALUES (?, ?, ?)',
                [userId, email.toLowerCase(), verificationToken]
            );
            return new statusObject(201, 'Email added.');
        } catch (error: any) {
            Logger.error('Database error in addEmail:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return new statusObject(400, 'This email is already associated with an account.');
            }
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Verify an email.
     */
    static async verifyEmail(db: DatabaseWrapper, token: string): Promise<statusObject> {
        try {
            const emailRecord = await db.get('SELECT * FROM user_emails WHERE verification_token = ?', [token]);
            if (!emailRecord) return new statusObject(404, 'Invalid or expired verification token.');

            await db.run('UPDATE user_emails SET is_verified = 1, verification_token = NULL WHERE id = ?', [emailRecord.id]);
            
            // If the user's main email in 'users' table is not verified but this matches it, update it too
            const user = await db.get('SELECT email, is_verified FROM users WHERE id = ?', [emailRecord.user_id]);
            if (user && user.email === emailRecord.email && !user.is_verified) {
                await db.run('UPDATE users SET is_verified = 1 WHERE id = ?', [emailRecord.user_id]);
            }

            return new statusObject(200, 'Email verified successfully.');
        } catch (error) {
            Logger.error('Database error in verifyEmail:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Set an email as primary.
     */
    static async setPrimaryEmail(db: DatabaseWrapper, userId: number, emailId: number): Promise<statusObject> {
        try {
            const emailRecord = await db.get('SELECT * FROM user_emails WHERE id = ? AND user_id = ?', [emailId, userId]);
            if (!emailRecord) return new statusObject(404, 'Email not found.');
            if (!emailRecord.is_verified) return new statusObject(400, 'Only verified emails can be set as primary.');

            await db.transaction(async (tx) => {
                await tx.run('UPDATE user_emails SET is_primary = 0 WHERE user_id = ?', [userId]);
                await tx.run('UPDATE user_emails SET is_primary = 1 WHERE id = ?', [emailId]);
                await tx.run('UPDATE users SET email = ? WHERE id = ?', [emailRecord.email, userId]);
            });

            return new statusObject(200, 'Primary email updated.');
        } catch (error) {
            Logger.error('Database error in setPrimaryEmail:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete an email.
     */
    static async deleteEmail(db: DatabaseWrapper, userId: number, emailId: number): Promise<statusObject> {
        try {
            const emailRecord = await db.get('SELECT * FROM user_emails WHERE id = ? AND user_id = ?', [emailId, userId]);
            if (!emailRecord) return new statusObject(404, 'Email not found.');
            if (emailRecord.is_primary) return new statusObject(400, 'You cannot delete your primary email.');

            const emailCount = await db.get('SELECT COUNT(*) as count FROM user_emails WHERE user_id = ?', [userId]);
            if (emailCount.count <= 1) return new statusObject(400, 'You must have at least one email address.');

            await db.run('DELETE FROM user_emails WHERE id = ?', [emailId]);
            return new statusObject(200, 'Email deleted.');
        } catch (error) {
            Logger.error('Database error in deleteEmail:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Find user by any of their emails.
     */
    static async getUserByAnyEmail(db: DatabaseWrapper, email: string): Promise<any> {
        return await db.get(`
            SELECT u.* FROM users u
            JOIN user_emails ue ON u.id = ue.user_id
            WHERE ue.email = ? AND ue.is_verified = 1
        `, [email.toLowerCase()]);
    }
}
