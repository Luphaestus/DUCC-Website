/**
 * waitlistDB.js
 * 
 * This module manages the event waiting list system.
 * It tracks users waiting for full events and handles their position/ordering.
 */

const { statusObject } = require('../misc/status.js');

class WaitlistDB {
    /**
     * Check if a user is currently on the waitlist for a specific event.
     */
    static async is_user_on_waiting_list(db, userId, eventId) {
        const result = await db.get('SELECT 1 FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        return new statusObject(200, null, !!result);
    }

    /**
     * Add a user to an event's waitlist.
     */
    static async join_waiting_list(db, userId, eventId) {
        const onList = await this.is_user_on_waiting_list(db, userId, eventId);
        if (onList.getData()) return new statusObject(409, 'Already on waiting list');

        await db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [eventId, userId]);
        return new statusObject(200, 'Joined waiting list');
    }

    /**
     * Remove a user from a waitlist.
     */
    static async leave_waiting_list(db, userId, eventId) {
        await db.run('DELETE FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        return new statusObject(200, 'Left waiting list');
    }

    /**
     * Identify the next user in line for an event (First-In-First-Out).
     * @returns {Promise<statusObject>} - Data is the user ID or null.
     */
    static async get_next_on_waiting_list(db, eventId) {
        const user = await db.get('SELECT user_id FROM event_waiting_list WHERE event_id = ? ORDER BY joined_at ASC LIMIT 1', [eventId]);
        return new statusObject(200, null, user ? user.user_id : null);
    }

    /**
     * Remove a specific user from a waitlist (internal use).
     */
    static async remove_user_from_waiting_list(db, eventId, userId) {
        await db.run('DELETE FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, userId]);
    }

    /**
     * Fetch the full waiting list for an event, including join timestamps.
     */
    static async get_waiting_list(db, eventId) {
        try {
            const users = await db.all(
                `SELECT u.id, u.first_name, u.last_name, u.email, wl.joined_at
                 FROM event_waiting_list wl
                 JOIN users u ON wl.user_id = u.id
                 WHERE wl.event_id = ?
                 ORDER BY wl.joined_at ASC`,
                [eventId]
            );
            return new statusObject(200, null, users);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Count how many users are waiting for an event.
     */
    static async get_waiting_list_count(db, eventId) {
        try {
            const result = await db.get(
                `SELECT COUNT(*) as count FROM event_waiting_list WHERE event_id = ?`,
                [eventId]
            );
            return new statusObject(200, null, result ? result.count : 0);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Calculate a specific user's numerical position in the waitlist.
     * @returns {Promise<statusObject>} - Data is the 1-based rank.
     */
    static async get_waiting_list_position(db, eventId, userId) {
        try {
            const userEntry = await db.get(
                `SELECT joined_at FROM event_waiting_list WHERE event_id = ? AND user_id = ?`,
                [eventId, userId]
            );

            if (!userEntry) return new statusObject(404, 'User not on waiting list');

            // Count entries joined BEFORE this user
            const posResult = await db.get(
                `SELECT COUNT(*) as count FROM event_waiting_list WHERE event_id = ? AND joined_at < ?`,
                [eventId, userEntry.joined_at]
            );

            return new statusObject(200, null, posResult ? posResult.count + 1 : 1);

        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }
}

module.exports = WaitlistDB;