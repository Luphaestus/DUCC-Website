const { statusObject } = require('../misc/status.js');
const TransactionsDB = require('./transactionDB.js');
const UserDB = require('./userDB.js');
const EventsDB = require('./eventsDB.js');

class AttendanceDB {
    static async is_user_attending_event(db, userId, eventId) {
        const isAttending = await db.get(
            'SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1',
            [eventId, userId]
        );

        return new statusObject(200, null, !!isAttending);
    }

    static async attend_event(db, userId, eventId, transactionId = null) {
        const isAttending = await this.is_user_attending_event(db, userId, eventId);
        if (isAttending.isError()) return isAttending;
        if (isAttending.data) return new statusObject(409, 'User already attending');

        await db.run(
            'INSERT INTO event_attendees (event_id, user_id, joined_at, payment_transaction_id) VALUES (?, ?, ?, ?)',
            [eventId, userId, new Date().toISOString(), transactionId]
        );

        return new statusObject(200, 'Joined successfully');
    }

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

    static async get_all_event_attendees_history(db, eventId) {
        try {
            const rows = await db.all(
                `SELECT u.id, u.first_name, u.last_name, u.email, ea.is_attending, ea.left_at
                 FROM users u
                 JOIN event_attendees ea ON u.id = ea.user_id
                 WHERE ea.event_id = ?
                 ORDER BY ea.joined_at ASC`, [eventId]
            );

            const userMap = new Map();

            for (const row of rows) {
                if (!userMap.has(row.id)) {
                    userMap.set(row.id, {
                        id: row.id,
                        first_name: row.first_name,
                        last_name: row.last_name,
                        email: row.email,
                        is_attending: 0,
                        left_at: null
                    });
                }

                const user = userMap.get(row.id);

                if (row.is_attending === 1) {
                    user.is_attending = 1;
                    user.left_at = null;
                } else {
                    if (user.is_attending !== 1) {
                        const rowLeft = row.left_at ? new Date(row.left_at).getTime() : 0;
                        const currLeft = user.left_at ? new Date(user.left_at).getTime() : 0;
                        if (rowLeft > currLeft) {
                            user.left_at = row.left_at;
                        }
                    }
                }
            }

            const result = Array.from(userMap.values());

            result.sort((a, b) => {
                if (a.is_attending !== b.is_attending) {
                    return b.is_attending - a.is_attending;  
                }
                if (a.is_attending === 1) {
                    return a.last_name.localeCompare(b.last_name);
                }
                const tA = a.left_at ? new Date(a.left_at).getTime() : 0;
                const tB = b.left_at ? new Date(b.left_at).getTime() : 0;
                return tB - tA;
            });

            return new statusObject(200, null, result);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    static async get_users_attending_event(db, eventId) {
        const events = await db.all(
            `SELECT u.id, u.first_name, u.last_name, u.email
             FROM users u
             JOIN event_attendees ea ON u.id = ea.user_id
             WHERE ea.event_id = ? AND ea.is_attending = 1`, [eventId]
        );
        return new statusObject(200, null, events);
    }

    static async get_event_attendance_count(db, eventId) {
        const result = await db.get(`SELECT COUNT(*) AS count FROM event_attendees WHERE event_id = ? AND is_attending = 1`, [eventId]);
        return new statusObject(200, null, result.count);
    }

    static async get_event_refund_id(db, userId, eventId) {
        const userRefund = await db.get(
            `SELECT payment_transaction_id FROM event_attendees 
             WHERE event_id = ? AND user_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL 
             ORDER BY left_at ASC LIMIT 1`, [eventId, userId]
        );
        if (userRefund && userRefund.payment_transaction_id) return new statusObject(200, null, userRefund);

        const otherRefund = await db.get(
            `SELECT payment_transaction_id, user_id FROM event_attendees 
             WHERE event_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL 
             ORDER BY left_at ASC LIMIT 1`, [eventId]
        );
        if (otherRefund && otherRefund.payment_transaction_id) return new statusObject(200, null, otherRefund);

        return new statusObject(404, 'No refund found');
    }

    static async refundEvent(db, eventId, user_id) {
        const eventRes = await EventsDB.getEventByIdAdmin(db, eventId);
        if (eventRes.isError()) return eventRes;
        const event = eventRes.getData();

        TransactionsDB.add_transaction(db, user_id, event.upfront_cost, `Refund for ${event.title}`);

        await db.run(
            `UPDATE event_attendees SET payment_transaction_id = NULL 
             WHERE event_id = ? AND user_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL`,
            [eventId, user_id]
        );

        return new statusObject(200, 'Refund processed');
    }

    static async isUserPayingForEvent(db, userId, eventId) {
        const paying = await db.get(
            `SELECT payment_transaction_id FROM event_attendees 
             WHERE event_id = ? AND user_id = ? AND payment_transaction_id IS NOT NULL`,
            [eventId, userId]
        );
        return new statusObject(200, null, !!paying);
    }

    static async getCoachesAttendingCount(db, eventId) {
        const result = await db.get(
            `SELECT COUNT(*) as count FROM event_attendees ea JOIN users u ON ea.user_id = u.id
             WHERE ea.event_id = ? AND ea.is_attending = 1 AND u.is_instructor = 1`, [eventId]
        );
        return result ? result.count : 0;
    }

    static async removeAllAttendees(db, eventId) {
        await db.run(`UPDATE event_attendees SET is_attending = 0, left_at = ? WHERE event_id = ? AND is_attending = 1`, [new Date().toISOString(), eventId]);
    }
}

module.exports = AttendanceDB;