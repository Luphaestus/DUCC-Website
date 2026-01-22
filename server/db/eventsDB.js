const { statusObject } = require('../misc/status.js');
const TransactionsDB = require('./transactionDB.js');
const TagsDB = require('./tagsDB.js');
const UserDB = require('./userDB.js');
const Rules = require('../misc/rules.js');

/**
 * Database operations for events, attendee management, and scheduling.
 */
class eventsDB {
    /**
     * Fetch events for a specific week up to max difficulty, including attendance status.
     * @param {object} db
     * @param {number} max_difficulty
     * @param {Date} [date]
     * @param {number} userId
     * @returns {Promise<statusObject>}
     */
    static async get_events_for_week(db, max_difficulty, date = new Date(), userId = null) {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        if (isNaN(startOfWeek.getTime())) {
            return new statusObject(400, 'Invalid date range');
        }

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const events = await db.all(
            `SELECT e.*, 
             EXISTS(SELECT 1 FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = ? AND ea.is_attending = 1) as is_attending
             FROM events e 
             WHERE e.start BETWEEN ? AND ?
             ORDER BY e.start ASC`,
            [userId, startOfWeek.toISOString(), endOfWeek.toISOString()]
        );

        const visibleEvents = [];
        const user = userId ? (await UserDB.getElementsById(db, userId, ['difficulty_level', 'id'])).getData() : null;

        for (const event of events) {
            const tags = await TagsDB.getTagsForEvent(db, event.id);
            event.tags = tags;

            if (Rules.canViewEvent(event, user)) {
                visibleEvents.push(event);
            }
        }

        visibleEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
        return new statusObject(200, null, visibleEvents);
    }

    /**
     * Fetch events for a specific relative week offset.
     * @param {object} db
     * @param {number} max_difficulty
     * @param {number} offset
     * @param {number} userId
     * @returns {Promise<statusObject>}
     */
    static async get_events_relative_week(db, max_difficulty, offset = 0, userId = null) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + offset * 7);
        return this.get_events_for_week(db, max_difficulty, targetDate, userId);
    }

    /**
     * Fetch events within a specific date range.
     * @param {object} db
     * @param {number} max_difficulty
     * @param {Date} startDate
     * @param {Date} endDate
     * @param {number} userId
     * @returns {Promise<statusObject>}
     */
    static async get_events_in_range(db, max_difficulty, startDate, endDate, userId = null) {
        const events = await db.all(
            `SELECT e.*,
             (SELECT COUNT(*) FROM event_attendees ea WHERE ea.event_id = e.id AND ea.is_attending = 1) as attendee_count,
             EXISTS(SELECT 1 FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = ? AND ea.is_attending = 1) as is_attending
             FROM events e 
             WHERE e.start >= ? AND e.start <= ?
             ORDER BY e.start ASC`,
            [userId, startDate.toISOString(), endDate.toISOString()]
        );

        const visibleEvents = [];
        const user = userId ? (await UserDB.getElementsById(db, userId, ['difficulty_level', 'id'])).getData() : null;

        for (const event of events) {
            const tags = await TagsDB.getTagsForEvent(db, event.id);
            event.tags = tags;

            if (Rules.canViewEvent(event, user)) {
                visibleEvents.push(event);
            }
        }

        visibleEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
        return new statusObject(200, null, visibleEvents);
    }

    /**
     * Fetch paginated events for admin with search/sort.
     * @param {object} db
     * @param {object} options
     * @returns {Promise<statusObject>}
     */
    static async getEventsAdmin(db, options) {
        const { page, limit, search, sort, order, showPast, minCost, maxCost, difficulty, location, permissions } = options;
        const offset = (page - 1) * limit;

        const allowedSorts = ['title', 'start', 'location', 'difficulty_level', 'upfront_cost'];
        const sortCol = allowedSorts.includes(sort) ? sort : 'start';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';


        let conditions = [];
        const params = [];

        if (search) {
            const terms = search.trim().split(/\s+/);
            terms.forEach(term => {
                const termPattern = `%${term}%`;
                params.push(termPattern, termPattern, termPattern);
                conditions.push(`(title LIKE ? OR location LIKE ? OR description LIKE ?)`);
            });
        }

        if (!showPast) {
            conditions.push(`start >= ?`);
            params.push(new Date().toISOString());
        }

        if (minCost !== undefined && minCost !== '') {
            conditions.push(`upfront_cost >= ?`);
            params.push(parseFloat(minCost));
        }
        if (maxCost !== undefined && maxCost !== '') {
            conditions.push(`upfront_cost <= ?`);
            params.push(parseFloat(maxCost));
        }
        if (difficulty !== undefined && difficulty !== '') {
            conditions.push(`difficulty_level = ?`);
            params.push(parseInt(difficulty));
        }
        if (location && location.trim() !== '') {
            conditions.push(`location LIKE ?`);
            params.push(`%${location.trim()}%`);
        }

        if (permissions !== undefined) {
            if (Array.isArray(permissions) && permissions.length > 0) {
                const tagPlaceholders = permissions.map(() => '?').join(',');
                conditions.push(`id IN (SELECT event_id FROM event_tags WHERE tag_id IN (${tagPlaceholders}))`);
                params.push(...permissions);
            }
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        try {
            const query = `SELECT * FROM events ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
            const events = await db.all(query, [...params, limit, offset]);

            for (const event of events) {
                event.tags = await TagsDB.getTagsForEvent(db, event.id);
            }

            const countResult = await db.get(`SELECT COUNT(*) as count FROM events ${whereClause}`, params);
            const totalPages = Math.ceil((countResult ? countResult.count : 0) / limit);

            return new statusObject(200, null, { events, totalPages, currentPage: page });
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch event by ID with permission and tag checks.
     * @param {object} db
     * @param {number|null} userId
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async get_event_by_id(db, userId, eventId) {
        const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
        if (!event) return new statusObject(404, 'Event not found');

        const tags = await TagsDB.getTagsForEvent(db, eventId);
        event.tags = tags;

        const user = userId ? (await UserDB.getElementsById(db, userId, ['difficulty_level', 'id'])).getData() : null;
        if (!Rules.canViewEvent(event, user)) {
            return new statusObject(401, 'User not authorized');
        }

        return new statusObject(200, null, event);
    }

    /**
     * Fetch event by ID for admin (no permission checks).
     * @param {object} db
     * @param {number} id
     * @returns {Promise<statusObject>}
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
     * Create new event and associate tags.
     * @param {object} db
     * @param {object} data
     * @returns {Promise<statusObject>}
     */
    static async createEvent(db, data) {
        try {
            let { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags, signup_required, image_url, upfront_refund_cutoff } = data;
            
            if (!signup_required && max_attendees > 0) {
                return new statusObject(400, 'Max attendees cannot be set if signup is not required');
            }

            const result = await db.run(
                `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required, image_url, upfront_refund_cutoff)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required ? 1 : 0, image_url, upfront_refund_cutoff]
            );
            const eventId = result.lastID;

            if (tags && Array.isArray(tags)) {
                for (const tagId of tags) await TagsDB.associateTag(db, eventId, tagId);
            }

            return new statusObject(200, null, { id: eventId });
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update event and sync tags.
     * @param {object} db
     * @param {number} id
     * @param {object} data
     * @returns {Promise<statusObject>}
     */
    static async updateEvent(db, id, data) {
        try {
            let { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags, signup_required, image_url, upfront_refund_cutoff } = data;

            if (!signup_required && max_attendees > 0) {
                return new statusObject(400, 'Max attendees cannot be set if signup is not required');
            }

            await db.run(
                `UPDATE events SET title=?, description=?, location=?, start=?, end=?, difficulty_level=?, max_attendees=?, upfront_cost=?, signup_required=?, image_url=?, upfront_refund_cutoff=? WHERE id=?`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required ? 1 : 0, image_url, upfront_refund_cutoff, id]
            );

            if (tags && Array.isArray(tags)) {
                await TagsDB.clearEventTags(db, id);
                for (const tagId of tags) await TagsDB.associateTag(db, id, tagId);
            }

            return new statusObject(200, 'Event updated');
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error: ' + error.message);
        }
    }

    /**
     * Set event cancellation status.
     * @param {object} db
     * @param {number} id
     * @param {boolean} isCanceled
     * @returns {Promise<statusObject>}
     */
    static async setEventCancellation(db, id, isCanceled) {
        try {
            await db.run("UPDATE events SET is_canceled = ? WHERE id = ?", [isCanceled ? 1 : 0, id]);
            return new statusObject(200, 'Event cancellation status updated');
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Cancel event, processing refunds and restoring free sessions.
     * @param {object} db
     * @param {number} id
     * @returns {Promise<statusObject>}
     */
    static async cancelEvent(db, id) {
        try {
            await db.run('BEGIN TRANSACTION');

            const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
            if (!event) {
                await db.run('ROLLBACK');
                return new statusObject(404, 'Event not found');
            }

            if (event.is_canceled) {
                await db.run('ROLLBACK');
                return new statusObject(400, 'Event already canceled');
            }

            await db.run("UPDATE events SET is_canceled = 1 WHERE id = ?", [id]);

            const attendees = await db.all('SELECT * FROM event_attendees WHERE event_id = ? AND is_attending = 1', [id]);

            for (const attendee of attendees) {
                // Check for monetary refund
                if (attendee.payment_transaction_id) {
                    const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [attendee.payment_transaction_id]);
                    if (transaction) {
                        const refundAmount = Math.abs(transaction.amount);
                        await TransactionsDB._add_transaction_internal(db, attendee.user_id, refundAmount, `Refund for canceled event: ${event.title}`, id);
                    }
                } 
                
                const user = await db.get('SELECT is_member FROM users WHERE id = ?', [attendee.user_id]);
                if (user && !user.is_member) {
                    await db.run('UPDATE users SET free_sessions = free_sessions + 1 WHERE id = ?', [attendee.user_id]);
                }
            }

            await db.run('DELETE FROM event_waiting_list WHERE event_id = ?', [id]);

            await db.run('COMMIT');
            return new statusObject(200, 'Event canceled and refunds processed');
        } catch (error) {
            await db.run('ROLLBACK');
            console.error(error);
            return new statusObject(500, 'Database error during cancellation');
        }
    }

    /**
     * Delete event.
     * @param {object} db
     * @param {number} id
     * @returns {Promise<statusObject>}
     */
    static async deleteEvent(db, id) {
        try {
            await db.run('DELETE FROM events WHERE id = ?', [id]);
            return new statusObject(200, 'Event deleted');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }
}

module.exports = eventsDB;