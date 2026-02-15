/**
 * invitationsDB.ts
 * 
 * This module handles database operations for user invitations.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';

export default class InvitationsDB {
    /**
     * Create a new invitation.
     */
    static async createInvitation(db: DatabaseWrapper, email: string, inviterId: number, token: string, settings: any = null): Promise<statusObject> {
        try {
            await db.run(
                'INSERT INTO user_invitations (email, inviter_id, token, predefined_settings) VALUES (?, ?, ?, ?)',
                [email.toLowerCase(), inviterId, token, settings ? JSON.stringify(settings) : null]
            );
            return new statusObject(201, 'Invitation created.');
        } catch (error: any) {
            Logger.error('Database error in createInvitation:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return new statusObject(400, 'An invitation for this email already exists.');
            }
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Get an invitation by token.
     */
    static async getInvitationByToken(db: DatabaseWrapper, token: string): Promise<any> {
        return await db.get(
            `SELECT i.*, u.first_name as inviter_first_name, u.last_name as inviter_last_name 
             FROM user_invitations i 
             JOIN users u ON i.inviter_id = u.id 
             WHERE i.token = ? AND i.used_at IS NULL`,
            [token]
        );
    }

    /**
     * Get an invitation by email.
     */
    static async getInvitationByEmail(db: DatabaseWrapper, email: string): Promise<any> {
        return await db.get('SELECT * FROM user_invitations WHERE email = ? AND used_at IS NULL', [email.toLowerCase()]);
    }

    /**
     * Mark an invitation as used.
     */
    static async markInvitationAsUsed(db: DatabaseWrapper, token: string): Promise<void> {
        await db.run('UPDATE user_invitations SET used_at = CURRENT_TIMESTAMP WHERE token = ?', [token]);
    }

    /**
     * Get all invitations (for admin).
     */
    static async getAllInvitations(db: DatabaseWrapper): Promise<statusObject> {
        try {
            const invitations = await db.all(`
                SELECT i.*, u.first_name as inviter_first_name, u.last_name as inviter_last_name 
                FROM user_invitations i 
                JOIN users u ON i.inviter_id = u.id 
                ORDER BY i.created_at DESC
            `);
            return new statusObject(200, null, invitations);
        } catch (error) {
            Logger.error('Database error in getAllInvitations:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete an invitation.
     */
    static async deleteInvitation(db: DatabaseWrapper, id: number): Promise<statusObject> {
        try {
            await db.run('DELETE FROM user_invitations WHERE id = ?', [id]);
            return new statusObject(200, 'Invitation deleted.');
        } catch (error) {
            Logger.error('Database error in deleteInvitation:', error);
            return new statusObject(500, 'Database error');
        }
    }
}
