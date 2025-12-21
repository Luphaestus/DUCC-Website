const { statusObject } = require('../misc/status.js');
const UserDB = require('./userDB.js');
const TransactionsDB = require('./transactionDB.js');

class eventsDB {
    /**
     * Retrieves all events from the database that have a difficulty level less than or equal to the specified maximum difficulty.
     * Events are ordered by their start time in ascending order.
     * @param {object} db - The database instance.
     * @param {number} max_difficulty - The maximum difficulty level of events to retrieve.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of event objects.
     */
    static async get_all_events(db, max_difficulty) {
        return db.all(
            'SELECT * FROM events WHERE difficulty_level <= ? ORDER BY start ASC',
            [max_difficulty]
        );
    }

    /**
     * Retrieves events for a specific week, based on a given date, that have a difficulty level less than or equal to the specified maximum difficulty.
     * The week starts on Monday and ends on Sunday. Events are ordered by their start time in ascending order.
     * @param {object} db - The database instance.
     * @param {number} max_difficulty - The maximum difficulty level of events to retrieve.
     * @param {Date} [date=new Date()] - The date within the target week. Defaults to the current date.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of event objects.
     */
    static async get_events_for_week(db, max_difficulty, date = new Date()) {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const events = await db.all(
            'SELECT * FROM events WHERE start BETWEEN ? AND ? AND difficulty_level <= ? ORDER BY start ASC',
            [startOfWeek.toISOString(), endOfWeek.toISOString(), max_difficulty]
        );

        console.log('Events for week:', events);
        console.log('max_difficulty:', max_difficulty);
        return new statusObject(200, null, events);
    }

    /**
     * Retrieves events for a week relative to the current week, based on an offset, that have a difficulty level less than or equal to the specified maximum difficulty.
     * An offset of 0 means the current week, 1 means next week, -1 means last week, and so on.
     * @param {object} db - The database instance.
     * @param {number} max_difficulty - The maximum difficulty level of events to retrieve.
     * @param {number} [offset=0] - The offset in weeks from the current week. Defaults to 0 (current week).
     * @returns {Promise<Array<object>>} A promise that resolves to an array of event objects.
     */
    static async get_events_relative_week(db, max_difficulty, offset = 0) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + offset * 7);
        return this.get_events_for_week(db, max_difficulty, targetDate);
    }

    static async getEventsAdmin(db, options) {
        const { page, limit, search, sort, order } = options;
        const offset = (page - 1) * limit;
        const searchTerm = `%${search}%`;
        const allowedSorts = ['title', 'start', 'location', 'difficulty_level', 'upfront_cost'];
        const sortCol = allowedSorts.includes(sort) ? sort : 'start';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        try {
            const query = `SELECT * FROM events WHERE title LIKE ? ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
            const events = await db.all(query, [searchTerm, limit, offset]);

            const countResult = await db.get('SELECT COUNT(*) as count FROM events WHERE title LIKE ?', [searchTerm]);
            const totalEvents = countResult ? countResult.count : 0;
            const totalPages = Math.ceil(totalEvents / limit);

            return new statusObject(200, null, { events, totalPages, currentPage: page });
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    static async get_event_by_id(req, db, id) {
        const event = await db.get(
            'SELECT * FROM events WHERE id = ?',
            [id]
        );

        if (!event) {
            return new statusObject(404, 'Event not found');
        }

        const maxDifficultyRes = await UserDB.getElements(req, db, "difficulty_level");
        if (maxDifficultyRes.isError()) return maxDifficultyRes;
        if (event.difficulty_level > maxDifficultyRes.getData().difficulty_level) {
            return new statusObject(401, 'User not authorized');
        }

        return new statusObject(200, null, event);
    }

    static async getEventByIdAdmin(db, id) {
        try {
            const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
            if (!event) return new statusObject(404, 'Event not found');
            return new statusObject(200, null, event);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    static async createEvent(db, data) {
        try {
            const { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost } = data;
            const result = await db.run(
                `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost]
            );
            return new statusObject(200, null, { id: result.lastID });
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    static async updateEvent(db, id, data) {
        try {
            const { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost } = data;
            await db.run(
                `UPDATE events SET title=?, description=?, location=?, start=?, end=?, difficulty_level=?, max_attendees=?, upfront_cost=? WHERE id=?`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, id]
            );
            return new statusObject(200, 'Event updated');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    static async deleteEvent(db, id) {
        try {
            await db.run('DELETE FROM events WHERE id = ?', [id]);
            return new statusObject(200, 'Event deleted');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    static async is_user_attending_event(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) {
            return event;
        }

        const userId = req.user.id;

        const existingJoin = await db.get(
            'SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1',
            [eventId, userId]
        );

        return new statusObject(200, null, !!existingJoin);
    }

    static async attend_event(req, db, eventId, transactionId = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) {
            return event;
        }

        const userId = req.user.id;
        const joinDate = new Date();

        const existingJoin = await this.is_user_attending_event(req, db, eventId);
        if (existingJoin.isError()) {
            return existingJoin;
        }

        if (existingJoin.getData()) {
            return new statusObject(409, 'User already attending event');
        }

        await db.run(
            'INSERT INTO event_attendees (event_id, user_id, joined_at, payment_transaction_id) VALUES (?, ?, ?, ?)',
            [eventId, userId, joinDate.toISOString(), transactionId]
        );

        return new statusObject(200, 'User successfully joined event');
    }

    static async leave_event(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) {
            return event;
        }

        const userId = req.user.id;

        const existingJoin = await this.is_user_attending_event(req, db, eventId);
        if (existingJoin.isError()) {
            return existingJoin;
        }

        if (!existingJoin.getData()) {
            return new statusObject(409, 'User is not attending event');
        }

        await db.run(
            'UPDATE event_attendees SET is_attending = 0, left_at = ? WHERE event_id = ? AND user_id = ?',
            [new Date().toISOString(), eventId, userId]
        );

        return new statusObject(200, 'User successfully left event');
    }

    static async get_users_attending_event(req, db, eventId) {

        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) {
            return event;
        }

        const events = await db.all(
            `SELECT u.id, u.first_name, u.last_name, u.email
             FROM users u
             JOIN event_attendees ea ON u.id = ea.user_id
             WHERE ea.event_id = ? AND ea.is_attending = 1`, [eventId]
        );
        return new statusObject(200, null, events);
    }

    static async get_event_attendance_count(req, db, eventId) {

        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) {
            return event;
        }

        const result = await db.get(
            `SELECT COUNT(*) AS attendance_count
             FROM event_attendees
             WHERE event_id = ? AND is_attending = 1`, [eventId]
        );
        return new statusObject(200, null, result.attendance_count);
    }

    static async get_event_refund_id(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) {
            return event;
        }

        const userRefund = await db.get(
            `SELECT payment_transaction_id
             FROM event_attendees
             WHERE event_id = ? AND user_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL
             ORDER BY left_at ASC LIMIT 1`, [eventId, req.user.id]
        );

        if (userRefund && userRefund.payment_transaction_id) {
            return new statusObject(200, null, userRefund);
        }

        const otherRefund = await db.get(
            `SELECT payment_transaction_id, user_id
             FROM event_attendees
             WHERE event_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL
             ORDER BY left_at ASC LIMIT 1`, [eventId]
        );

        if (otherRefund && otherRefund.payment_transaction_id) {
            return new statusObject(200, null, otherRefund);
        }


        return new statusObject(404, 'No refund transaction found');
    }

    static async refundEvent(db, eventId, user_id) {
        const eventRes = await this.getEventByIdAdmin(db, eventId);
        if (eventRes.isError()) {
            return eventRes;
        }
        const event = eventRes.getData();

        TransactionsDB.add_transaction_admin(db, user_id, event.upfront_cost, `Refund for ${event.title} upfront cost`);

        await db.run(
            `UPDATE event_attendees SET payment_transaction_id = NULL 
             WHERE event_id = ? AND user_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL`,
            [eventId, user_id]
        );

        return new statusObject(200, 'Event refunds processed');
    }

    static async isUserPayingForEvent(req, db, eventId) {
        const paying = await db.get(
            `SELECT payment_transaction_id 
             FROM event_attendees 
             WHERE event_id = ? AND user_id = ? AND payment_transaction_id IS NOT NULL`,
            [eventId, req.user.id]
        );

        return new statusObject(200, null, !!paying);
    }

}

module.exports = eventsDB;