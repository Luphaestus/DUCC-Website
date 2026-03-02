/**
 * emailsDB.ts
 * 
 * This module handles database operations for multiple user emails.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';

export default class EmailsDB {
    private static readonly SECONDARY_EMAIL_VERIFICATION_EXPIRY_MINUTES = 60;
    /**
     * Get all emails for a user.
     */
    static async getUserEmails(db: DatabaseWrapper, userId: number): Promise<statusObject> {
        try {
            const emails = await db.all('SELECT * FROM user_emails WHERE user_id = ? ORDER BY is_primary DESC, created_at ASC', [userId]);

            // Ensure the primary email from the `users` table is present in the list.
            // Some seed paths insert into `users` but don't always insert into `user_emails` (e.g. admin creation),
            // so include the main `users.email` as a fallback to keep the client UI consistent.
            const user = await db.get('SELECT email, is_verified, created_at FROM users WHERE id = ?', [userId]);
            if (user && user.email) {
                const mainEmail = (user.email as string).toLowerCase();
                const exists = emails.some(e => (e.email || '').toLowerCase() === mainEmail);
                if (!exists) {
                    // Add a synthetic entry for the primary email. It has no user_emails.id
                    emails.unshift({
                        id: null,
                        user_id: userId,
                        email: user.email,
                        is_verified: user.is_verified ? 1 : 0,
                        is_primary: 1,
                        verification_token: null,
                        created_at: user.created_at || null
                    });
                }
            }

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

            const createdAtMs = emailRecord.created_at ? new Date(emailRecord.created_at).getTime() : NaN;
            const expiryMs = EmailsDB.SECONDARY_EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000;
            if (!Number.isNaN(createdAtMs) && Date.now() > createdAtMs + expiryMs) {
                return new statusObject(410, 'This verification link has expired. Please request a new one.');
            }

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
     * Resend verification token for a user's email record.
     */
    static async resendVerification(db: DatabaseWrapper, userId: number, emailId: number, newToken: string): Promise<statusObject> {
        try {
            const emailRecord = await db.get('SELECT * FROM user_emails WHERE id = ? AND user_id = ?', [emailId, userId]);
            if (!emailRecord) return new statusObject(404, 'Email not found.');
            if (emailRecord.is_verified) return new statusObject(400, 'Email is already verified.');

            await db.run('UPDATE user_emails SET verification_token = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [newToken, emailId]);
            return new statusObject(200, 'Verification resent.', { email: emailRecord.email, token: newToken });
        } catch (error) {
            Logger.error('Database error in resendVerification:', error);
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

            // Ensure the user's current primary (in users.email) is recorded in user_emails
            // so it isn't lost when we update `users.email` below. This handles cases where
            // legacy code or seeding created the primary only in `users` and not in `user_emails`.
            try {
                const userRow = await db.get('SELECT email, is_verified FROM users WHERE id = ?', [userId]);
                if (userRow && userRow.email && userRow.email.toLowerCase() !== emailRecord.email.toLowerCase()) {
                    const existing = await db.get('SELECT id FROM user_emails WHERE user_id = ? AND LOWER(email) = LOWER(?)', [userId, userRow.email]);
                    if (!existing) {
                        await db.run('INSERT INTO user_emails (user_id, email, is_verified, is_primary) VALUES (?, ?, ?, ?)', [userId, userRow.email, userRow.is_verified ? 1 : 0, 0]);
                    }
                }
            } catch (e) {
                // Non-fatal - continue with primary update even if preservation step fails
            }

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
