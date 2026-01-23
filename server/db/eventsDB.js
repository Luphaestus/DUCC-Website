/**
 * eventsDB.js
 * 
 * This module handles all core database operations for events.
 * It manages event listings, administrative overrides, creation, updates, and cancellations.
 */

const { statusObject } = require('../misc/status.js');
const TransactionsDB = require('./transactionDB.js');
const TagsDB = require('./tagsDB.js');
const UserDB = require('./userDB.js');
const EventRules = require('../rules/EventRules.js');
const Globals = require('../misc/globals.js');
const FileCleanup = require('../misc/FileCleanup.js');

/**
 * Database operations for events, attendee management, and scheduling.
 */
class eventsDB {
    /**
     * Fetch events for a specific week, filtered by the maximum difficulty the user is allowed to see.
     * @param {object} db - Database connection.
     * @param {number} max_difficulty - Maximum difficulty level allowed.
     * @param {Date} [date=new Date()] - Target date to identify the week.
     * @param {number|null} [userId=null] - ID of the user requesting (for attendance check).
     * @returns {Promise<statusObject>} - Data contains a sorted array of visible event objects.
     */
    static async get_events_for_week(db, max_difficulty, date = new Date(), userId = null) {
        // Calculate the Monday of the week containing the target date
        const startOfWeek = new Date(date);
        startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        if (isNaN(startOfWeek.getTime())) {
            return new statusObject(400, 'Invalid date range');
        }

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Fetch events and mark if the user is already attending
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
            // Attach tags and effective image to the event object
            await this._enrichEvent(db, event);

            // Enforce visibility rules (difficulty and tag-based)
            if (EventRules.canViewEvent(event, user)) {
                visibleEvents.push(event);
            }
        }

        visibleEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
        return new statusObject(200, null, visibleEvents);
    }

    /**
     * Fetch events for a week relative to the current week.
     * @param {object} db - Database connection.
     * @param {number} max_difficulty - Maximum difficulty level.
     * @param {number} [offset=0] - Week offset (0 = current, 1 = next).
     * @param {number|null} [userId=null] - Requesting user's ID.
     * @returns {Promise<statusObject>}
     */
    static async get_events_relative_week(db, max_difficulty, offset = 0, userId = null) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + offset * 7);
        return this.get_events_for_week(db, max_difficulty, targetDate, userId);
    }

    /**
     * Fetch events within an arbitrary date range.
     * @param {object} db - Database connection.
     * @param {number} max_difficulty - Maximum difficulty level.
     * @param {Date} startDate - Range start.
     * @param {Date} endDate - Range end.
     * @param {number|null} [userId=null] - Requesting user's ID.
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
            await this._enrichEvent(db, event);

            if (EventRules.canViewEvent(event, user)) {
                visibleEvents.push(event);
            }
        }

        visibleEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
        return new statusObject(200, null, visibleEvents);
    }

    /**
     * Administrative fetch of events with full filtering and no visibility restrictions.
     * @param {object} db - Database connection.
     * @param {object} options - Filter and pagination options.
     * @returns {Promise<statusObject>} - Data contains { events, totalPages, currentPage }.
     */
    static async getEventsAdmin(db, options) {
        const { page, limit, search, sort, order, showPast, minCost, maxCost, difficulty, location, permissions } = options;
        const offset = (page - 1) * limit;

        const allowedSorts = ['title', 'start', 'location', 'difficulty_level', 'upfront_cost'];
        const sortCol = allowedSorts.includes(sort) ? sort : 'start';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';


        let conditions = [];
        const params = [];

        // Dynamic search across multiple fields
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

        // Filter events by manageable tags (for scoped admins)
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
                await this._enrichEvent(db, event);
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
     * Fetch event by ID, enforcing user-specific visibility rules.
     * @param {object} db - Database connection.
     * @param {number|null} userId - ID of the user requesting.
     * @param {number} eventId - ID of the target event.
     * @returns {Promise<statusObject>}
     */
    static async get_event_by_id(db, userId, eventId) {
        const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
        if (!event) return new statusObject(404, 'Event not found');

        await this._enrichEvent(db, event);

        const user = userId ? (await UserDB.getElementsById(db, userId, ['difficulty_level', 'id'])).getData() : null;
        if (!EventRules.canViewEvent(event, user)) {
            return new statusObject(401, 'User not authorized');
        }

        return new statusObject(200, null, event);
    }

    /**
     * Fetch event by ID for administrative use, bypassing visibility rules.
     * @param {object} db - Database connection.
     * @param {number} id - ID of the target event.
     * @returns {Promise<statusObject>}
     */
    static async getEventByIdAdmin(db, id) {
        try {
            const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
            if (!event) return new statusObject(404, 'Event not found');
            await this._enrichEvent(db, event);
            return new statusObject(200, null, event);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new event record and link its tags.
     * @param {object} db - Database connection.
     * @param {object} data - Event data object.
     * @returns {Promise<statusObject>} - Data contains { id }.
     */
    static async createEvent(db, data) {
        try {
            let { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags, signup_required, image_url, upfront_refund_cutoff } = data;
            
            // Logic validation: max_attendees requires signup
            if (!signup_required && max_attendees > 0) {
                return new statusObject(400, 'Max attendees cannot be set if signup is not required');
            }

            // Final fallback logic
            if (!image_url) {
                // Fetch tag objects to calculate fallback if needed
                const tagObjects = (tags && Array.isArray(tags)) ? 
                    await db.all(`SELECT * FROM tags WHERE id IN (${tags.map(() => '?').join(',')})`, tags) : [];
                image_url = await this._getFallbackImage(db, tagObjects);
            }

            const result = await db.run(
                `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required, image_url, upfront_refund_cutoff)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required ? 1 : 0, image_url, upfront_refund_cutoff]
            );
            const eventId = result.lastID;

            // Create tag associations
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
     * Update an existing event record and its tag associations.
     * @param {object} db - Database connection.
     * @param {number} id - ID of the event to update.
     * @param {object} data - New event data.
     * @returns {Promise<statusObject>}
     */
    static async updateEvent(db, id, data) {
        try {
            let { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags, signup_required, image_url, upfront_refund_cutoff } = data;

            if (!signup_required && max_attendees > 0) {
                return new statusObject(400, 'Max attendees cannot be set if signup is not required');
            }

            const oldEvent = await db.get('SELECT image_url FROM events WHERE id = ?', [id]);

            await db.run(
                `UPDATE events SET title=?, description=?, location=?, start=?, end=?, difficulty_level=?, max_attendees=?, upfront_cost=?, signup_required=?, image_url=?, upfront_refund_cutoff=? WHERE id=?`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required ? 1 : 0, image_url, upfront_refund_cutoff, id]
            );

            if (oldEvent && oldEvent.image_url !== image_url) {
                FileCleanup.checkAndDeleteIfUnused(db, oldEvent.image_url);
            }

            // Sync tags: clear existing and re-insert new list
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
     * Toggle the cancellation status of an event.
     * @param {object} db - Database connection.
     * @param {number} id - Event ID.
     * @param {boolean} isCanceled - Target status.
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
     * Cancel an event and process automatic refunds for all attendees.
     * This operation is wrapped in a transaction to ensure atomic execution.
     * @param {object} db - Database connection.
     * @param {number} id - ID of the event to cancel.
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

            // Refund all active attendees
            const attendees = await db.all('SELECT * FROM event_attendees WHERE event_id = ? AND is_attending = 1', [id]);

            for (const attendee of attendees) {
                // If they made a monetary payment, create a refund transaction
                if (attendee.payment_transaction_id) {
                    const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [attendee.payment_transaction_id]);
                    if (transaction) {
                        const refundAmount = Math.abs(transaction.amount);
                        await TransactionsDB._add_transaction_internal(db, attendee.user_id, refundAmount, `Refund for canceled event: ${event.title}`, id);
                    }
                } 
                
                // If they are a non-member, refund their consumed free session
                const user = await db.get('SELECT is_member FROM users WHERE id = ?', [attendee.user_id]);
                if (user && !user.is_member) {
                    await db.run('UPDATE users SET free_sessions = free_sessions + 1 WHERE id = ?', [attendee.user_id]);
                }
            }

            // Wipe the waitlist
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
     * Delete an event record.
     * @param {object} db - Database connection.
     * @param {number} id - ID of the event.
     * @returns {Promise<statusObject>}
     */
    static async deleteEvent(db, id) {
        try {
            const event = await db.get('SELECT image_url FROM events WHERE id = ?', [id]);
            await db.run('DELETE FROM events WHERE id = ?', [id]);
            
            if (event) {
                FileCleanup.checkAndDeleteIfUnused(db, event.image_url);
            }

            return new statusObject(200, 'Event deleted');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Internal helper to enrich event object with tags and effective image URL.
     * @private
     */
    static async _enrichEvent(db, event) {
        event.tags = await TagsDB.getTagsForEvent(db, event.id);
        if (!event.image_url) {
            event.image_url = await this._getFallbackImage(db, event.tags);
        }
    }

    /**
     * Internal helper to calculate fallback image based on tags or global default.
     * @private
     */
    static async _getFallbackImage(db, tags) {
        if (tags && tags.length > 0) {
            // Find tag with image_id, sorted by priority
            const bestTag = tags
                .filter(t => t.image_id !== null)
                .sort((a, b) => b.priority - a.priority)[0];
            
            if (bestTag) {
                return `/api/files/${bestTag.image_id}/download?view=true`;
            }
        }
        
        // Final fallback to global default
        const Globals = require('../misc/globals.js');
        return new Globals().get('DefaultEventImage').data;
    }
}

module.exports = eventsDB;