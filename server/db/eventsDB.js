const { statusObject } = require('../misc/status.js');
const UserDB = require('./userDB.js');
const TransactionsDB = require('./transactionDB.js');
const TagsDB = require('./tagsDB.js');
const Globals = require('../misc/globals.js');

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
     * @param {number} userId - The ID of the user requesting the events.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of event objects.
     */
    static async get_events_for_week(db, max_difficulty, date = new Date(), userId = null) {
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

        const visibleEvents = [];
        for (const event of events) {
            const tags = await TagsDB.getTagsForEvent(db, event.id);
            let authorized = true;

            for (const tag of tags) {
                if (tag.min_difficulty && tag.min_difficulty > max_difficulty) {
                    authorized = false;
                    break;
                }

                const whitelist = await TagsDB.getWhitelist(db, tag.id);
                if (whitelist.getData() && whitelist.getData().length > 0) {
                    const onList = whitelist.getData().find(u => u.id === userId);
                    if (!onList) {
                        authorized = false;
                        break;
                    }
                }
            }

            if (authorized) {
                event.tags = tags;
                visibleEvents.push(event);
            }
        }

        visibleEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

        return new statusObject(200, null, visibleEvents);
    }

    /**
     * Retrieves events for a week relative to the current week, based on an offset, that have a difficulty level less than or equal to the specified maximum difficulty.
     * An offset of 0 means the current week, 1 means next week, -1 means last week, and so on.
     * @param {object} db - The database instance.
     * @param {number} max_difficulty - The maximum difficulty level of events to retrieve.
     * @param {number} [offset=0] - The offset in weeks from the current week. Defaults to 0 (current week).
     * @param {number} userId - The ID of the user requesting the events.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of event objects.
     */
    static async get_events_relative_week(db, max_difficulty, offset = 0, userId = null) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + offset * 7);
        return this.get_events_for_week(db, max_difficulty, targetDate, userId);
    }

    /**
     * Retrieves events for admin management with filtering and sorting options.
     * @param {object} db - The database instance.
     * @param {object} options - Options for pagination, search, and sorting.
     * @param {number} options.page - The page number.
     * @param {number} options.limit - The number of items per page.
     * @param {string} options.search - The search query string.
     * @param {string} options.sort - The column to sort by.
     * @param {string} options.order - The sort order ('asc' or 'desc').
     * @returns {Promise<statusObject>} A statusObject containing the list of events and pagination info.
     */
    static async getEventsAdmin(db, options) {
        const { page, limit, search, sort, order } = options;
        const offset = (page - 1) * limit;

        const allowedSorts = ['title', 'start', 'location', 'difficulty_level', 'upfront_cost'];
        const sortCol = allowedSorts.includes(sort) ? sort : 'start';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        let whereClause = '';
        const params = [];

        if (search) {
            const terms = search.trim().split(/\s+/);
            const conditions = terms.map(term => {
                const termPattern = `%${term}%`;
                params.push(termPattern, termPattern, termPattern);
                return `(title LIKE ? OR location LIKE ? OR description LIKE ?)`;
            });
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        try {
            const query = `SELECT * FROM events ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
            const events = await db.all(query, [...params, limit, offset]);

            // Enhance events with tags for admin view
            for (const event of events) {
                event.tags = await TagsDB.getTagsForEvent(db, event.id);
            }

            const countQuery = `SELECT COUNT(*) as count FROM events ${whereClause}`;
            const countResult = await db.get(countQuery, params);
            const totalEvents = countResult ? countResult.count : 0;
            const totalPages = Math.ceil(totalEvents / limit);

            return new statusObject(200, null, { events, totalPages, currentPage: page });
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Retrieves an event by its ID, ensuring the user has the required difficulty level permission and meets tag restrictions.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} id - The event ID.
     * @returns {Promise<statusObject>} A statusObject containing the event data.
     */
    static async get_event_by_id(req, db, id) {
        const event = await db.get(
            'SELECT * FROM events WHERE id = ?',
            [id]
        );

        if (!event) {
            return new statusObject(404, 'Event not found');
        }

        const userDifficulty = req.user ? (await UserDB.getElements(req, db, "difficulty_level")).getData().difficulty_level : (new Globals()).getInt("Unauthorized_max_difficulty");


        if (event.difficulty_level > userDifficulty) {
            return new statusObject(401, 'User not authorized');
        }

        const tags = await TagsDB.getTagsForEvent(db, id);
        let minNeededDifficulty = event.difficulty_level;

        for (const tag of tags) {
            if (tag.min_difficulty) {
                minNeededDifficulty = Math.max(minNeededDifficulty, tag.min_difficulty);
                if (tag.min_difficulty > userDifficulty) {
                    return new statusObject(401, `User not authorized (Tag restriction: ${tag.name})`);
                }
            }

            const whitelist = await TagsDB.getWhitelist(db, tag.id);
            if (whitelist.getData() && whitelist.getData().length > 0) {
                const userId = req.user.id;
                const onList = whitelist.getData().find(u => u.id === userId);
                if (!onList) {
                    return new statusObject(401, `User not authorized (Tag restriction: ${tag.name})`);
                }
            }
        }

        event.tags = tags;
        event.min_needed_difficulty = minNeededDifficulty;
        return new statusObject(200, null, event);
    }

    /**
     * Retrieves an event by its ID for admin purposes (bypasses difficulty check).
     * @param {object} db - The database instance.
     * @param {number} id - The event ID.
     * @returns {Promise<statusObject>} A statusObject containing the event data.
     */
    static async getEventByIdAdmin(db, id) {
        try {
            const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
            if (!event) return new statusObject(404, 'Event not found');
            event.tags = await TagsDB.getTagsForEvent(db, id);
            return new statusObject(200, null, event);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Creates a new event.
     * @param {object} db - The database instance.
     * @param {object} data - The event data.
     * @returns {Promise<statusObject>} A statusObject containing the new event ID.
     */
    static async createEvent(db, data) {
        try {
            const { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags } = data;
            const result = await db.run(
                `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost]
            );
            const eventId = result.lastID;

            if (tags && Array.isArray(tags)) {
                for (const tagId of tags) {
                    await TagsDB.associateTag(db, eventId, tagId);
                }
            }

            return new statusObject(200, null, { id: eventId });
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Updates an existing event.
     * @param {object} db - The database instance.
     * @param {number} id - The event ID.
     * @param {object} data - The updated event data.
     * @returns {Promise<statusObject>} A statusObject indicating success or failure.
     */
    static async updateEvent(db, id, data) {
        try {
            const { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags } = data;
            await db.run(
                `UPDATE events SET title=?, description=?, location=?, start=?, end=?, difficulty_level=?, max_attendees=?, upfront_cost=? WHERE id=?`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, id]
            );

            if (tags && Array.isArray(tags)) {
                await TagsDB.clearEventTags(db, id);
                for (const tagId of tags) {
                    await TagsDB.associateTag(db, id, tagId);
                }
            }

            return new statusObject(200, 'Event updated');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Deletes an event.
     * @param {object} db - The database instance.
     * @param {number} id - The event ID.
     * @returns {Promise<statusObject>} A statusObject indicating success or failure.
     */
    static async deleteEvent(db, id) {
        try {
            await db.run('DELETE FROM events WHERE id = ?', [id]);
            return new statusObject(200, 'Event deleted');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Checks if a user is attending a specific event.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @returns {Promise<statusObject>} A statusObject containing a boolean indicating attendance.
     */
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

    /**
     * Registers a user as attending an event.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @param {number|null} transactionId - The transaction ID if payment was required.
     * @returns {Promise<statusObject>} A statusObject indicating success or failure.
     */
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

    /**
     * Unregisters a user from an event.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @returns {Promise<statusObject>} A statusObject indicating success or failure.
     */
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

    /**
     * Retrieves the list of users attending an event.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @returns {Promise<statusObject>} A statusObject containing the list of attendees.
     */
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

    /**
     * Retrieves the count of attendees for an event.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @returns {Promise<statusObject>} A statusObject containing the attendance count.
     */
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

    /**
     * Finds a suitable transaction ID to use for a refund.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @returns {Promise<statusObject>} A statusObject containing the transaction ID for refund.
     */
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

    /**
     * Processes refunds for an event by transferring a transaction to the user being refunded.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @param {number} user_id - The ID of the user receiving the refund.
     * @returns {Promise<statusObject>} A statusObject indicating success or failure.
     */
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

    /**
     * Checks if a user has a paid transaction for a specific event.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @returns {Promise<statusObject>} A statusObject containing a boolean indicating payment status.
     */
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
