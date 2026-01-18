const { statusObject } = require('../misc/status.js');

class WaitlistDB {
    static async is_user_on_waiting_list(db, userId, eventId) {
        const result = await db.get('SELECT 1 FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        return new statusObject(200, null, !!result);
    }

    static async join_waiting_list(db, userId, eventId) {
        const onList = await this.is_user_on_waiting_list(db, userId, eventId);
        if (onList.getData()) return new statusObject(409, 'Already on waiting list');

        await db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [eventId, userId]);
        return new statusObject(200, 'Joined waiting list');
    }

    static async leave_waiting_list(db, userId, eventId) {
        await db.run('DELETE FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        return new statusObject(200, 'Left waiting list');
    }

    static async get_next_on_waiting_list(db, eventId) {
        const user = await db.get('SELECT user_id FROM event_waiting_list WHERE event_id = ? ORDER BY joined_at ASC LIMIT 1', [eventId]);
        return new statusObject(200, null, user ? user.user_id : null);
    }

    static async remove_user_from_waiting_list(db, eventId, userId) {
        await db.run('DELETE FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, userId]);
    }

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

    static async get_waiting_list_position(db, eventId, userId) {
        try {
            const userEntry = await db.get(
                `SELECT joined_at FROM event_waiting_list WHERE event_id = ? AND user_id = ?`,
                [eventId, userId]
            );

            if (!userEntry) return new statusObject(404, 'User not on waiting list');

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