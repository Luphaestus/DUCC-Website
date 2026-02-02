/**
 * attendanceDB.js
 * 
 * This module handles database operations related to event attendance.
 */

import { statusObject } from '../misc/status.js';
import TransactionsDB from './transactionDB.js';
import UserDB from './userDB.js';
import EventsDB from './eventsDB.js';

export default class AttendanceDB {
    /**
     * Check if a specific user is currently marked as attending an event.
     */
    static async is_user_attending_event(db, userId, eventId) {
        const isAttending = await db.get(
            'SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1',
            [eventId, userId]
        );

        return new statusObject(200, null, !!isAttending);
    }

    /**
     * Register a user for an event.
     */
    static async attend_event(db, userId, eventId, transactionId = null) {
        const isAttending = await this.is_user_attending_event(db, userId, eventId);
        if (isAttending.isError()) return isAttending;
        if (isAttending.data) return new statusObject(409, 'User already attending');

        await db.run(
            'INSERT INTO event_attendees (event_id, user_id, joined_at, payment_transaction_id) VALUES (?, ?, ?, ?)',
            [eventId, userId, new Date().toISOString(), transactionId]
        );

        return new statusObject(201, 'Joined successfully');
    }

    /**
     * Mark a user as no longer attending an event.
     */
    static async leave_event(db, userId, eventId) {
        const isAttending = await this.is_user_attending_event(db, userId, eventId);
        if (isAttending.isError()) return isAttending;
        if (!isAttending.data) return new statusObject(409, 'User not attending');

        await db.run(
            'UPDATE event_attendees SET is_attending = 0, left_at = ? WHERE event_id = ? AND user_id = ?',
            [new Date().toISOString(), eventId, userId]
        );

        return new statusObject(200, 'Left successfully');
    }

    /**
     * Fetch the full attendance history for an event, including users who have left.
     * Uses a Window Function to identify the most recent record for each user.
     */
    static async get_all_event_attendees_history(db, eventId) {
        try {
            // We use a Common Table Expression (CTE) and ROW_NUMBER() to get the current/latest status for each user
            const sql = `
                WITH LatestAttendance AS (
                    SELECT 
                        u.id, u.first_name, u.last_name, u.email, 
                        ea.is_attending, ea.joined_at, ea.left_at, 
                        ea.payment_transaction_id, ea.upfront_refunded,
                        ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY ea.joined_at DESC, ea.id DESC) as rn
                    FROM users u
                    JOIN event_attendees ea ON u.id = ea.user_id
                    WHERE ea.event_id = ?
                )
                SELECT * FROM LatestAttendance 
                WHERE rn = 1
                ORDER BY is_attending DESC, last_name ASC, first_name ASC
            `;
            
            const rows = await db.all(sql, [eventId]);
            return new statusObject(200, null, rows);
        } catch (error) {
            Logger.error('Database error in get_all_event_attendees_history:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch a list of all users currently attending an event.
     */
    static async get_users_attending_event(db, eventId) {
        const sql = `
            SELECT u.id, u.first_name, u.last_name, u.email
            FROM users u
            JOIN event_attendees ea ON u.id = ea.user_id
            WHERE ea.event_id = ? AND ea.is_attending = 1
            ORDER BY u.last_name ASC, u.first_name ASC
        `;
        const attendees = await db.all(sql, [eventId]);
        return new statusObject(200, null, attendees);
    }

    /**
     * Get the total count of active attendees for an event.
     */
    static async get_event_attendance_count(db, eventId) {
        const sql = 'SELECT COUNT(*) AS count FROM event_attendees WHERE event_id = ? AND is_attending = 1';
        const result = await db.get(sql, [eventId]);
        return new statusObject(200, null, result?.count || 0);
    }

    /**
     * Find a refundable transaction for an event spot.
     */
    static async get_event_refund_id(db, userId, eventId) {
        // Prioritize the user's own record, then fallback to any other record available for refund
        const sql = `
            SELECT payment_transaction_id, user_id 
            FROM event_attendees 
            WHERE event_id = ? 
              AND is_attending = 0 
              AND payment_transaction_id IS NOT NULL 
            ORDER BY (user_id = ?) DESC, left_at ASC 
            LIMIT 1
        `;
        const refundRecord = await db.get(sql, [eventId, userId]);
        if (refundRecord) return new statusObject(200, null, refundRecord);

        return new statusObject(404, 'No refundable transaction found');
    }

    /**
     * Process a refund for a user who left an event.
     */
    static async refundEvent(db, eventId, user_id) {
        const eventRes = await EventsDB.getEventByIdAdmin(db, eventId);
        if (eventRes.isError()) return eventRes;
        const event = eventRes.getData();

        await TransactionsDB.add_transaction(db, user_id, event.upfront_cost, `Refund for ${event.title}`);

        await db.run(
            `UPDATE event_attendees SET payment_transaction_id = NULL 
             WHERE event_id = ? AND user_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL`,
            [eventId, user_id]
        );

        return new statusObject(200, 'Refund processed');
    }

    /**
     * Check if a user has a linked payment transaction for a specific event.
     */
    static async isUserPayingForEvent(db, userId, eventId) {
        const paying = await db.get(
            `SELECT payment_transaction_id FROM event_attendees 
             WHERE event_id = ? AND user_id = ? AND payment_transaction_id IS NOT NULL`,
            [eventId, userId]
        );
        return new statusObject(200, null, !!paying);
    }

    /**
     * Count how many instructors are currently attending an event.
     */
    static async getCoachesAttendingCount(db, eventId) {
        const result = await db.get(
            `SELECT COUNT(*) as count FROM event_attendees ea JOIN users u ON ea.user_id = u.id
             WHERE ea.event_id = ? AND ea.is_attending = 1 AND u.is_instructor = 1`, [eventId]
        );
        return result ? result.count : 0;
    }

    /**
     * Mark all attendees as having left an event.
     */
    static async removeAllAttendees(db, eventId) {
        await db.run(`UPDATE event_attendees SET is_attending = 0, left_at = ? WHERE event_id = ? AND is_attending = 1`, [new Date().toISOString(), eventId]);
    }
}
