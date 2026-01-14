const { statusObject } = require('../misc/status.js');
const TransactionsDB = require('./transactionDB.js');
const TagsDB = require('./tagsDB.js');
const UserDB = require('./userDB.js');
const Globals = require('../misc/globals.js');

/**
 * Database operations for events, attendee management, and scheduling.
 */
class eventsDB {
    /**
     * Fetch all events up to max difficulty, ordered by start time.
     * @param {object} db
     * @param {number} max_difficulty
     * @returns {Promise<Array<object>>}
     */
    static async get_all_events(db, max_difficulty) {
        return db.all(
            'SELECT * FROM events WHERE difficulty_level <= ? ORDER BY start ASC',
            [max_difficulty]
        );
    }

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

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const events = await db.all(
            `SELECT e.*, 
             EXISTS(SELECT 1 FROM event_attendees ea WHERE ea.event_id = e.id AND ea.user_id = ? AND ea.is_attending = 1) as is_attending
             FROM events e 
             WHERE e.start BETWEEN ? AND ? AND e.difficulty_level <= ? 
             ORDER BY e.start ASC`,
            [userId, startOfWeek.toISOString(), endOfWeek.toISOString(), max_difficulty]
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
                    if (!whitelist.getData().find(u => u.id === userId)) {
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
     * Fetch events for a relative week offset.
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
     * Fetch paginated events for admin with search/sort.
     * @param {object} db
     * @param {object} options
     * @returns {Promise<statusObject>}
     */
    static async getEventsAdmin(db, options) {
        const { page, limit, search, sort, order, showPast } = options;
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
     * @param {object} req
     * @param {object} db
     * @param {number} id
     * @returns {Promise<statusObject>}
     */
    static async get_event_by_id(req, db, id) {
        const event = await db.get('SELECT * FROM events WHERE id = ?', [id]);
        if (!event) return new statusObject(404, 'Event not found');

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
                    return new statusObject(401, `User not authorized (Tag: ${tag.name})`);
                }
            }

            const whitelist = await TagsDB.getWhitelist(db, tag.id);
            if (whitelist.getData() && whitelist.getData().length > 0) {
                if (!whitelist.getData().find(u => u.id === req.user.id)) {
                    return new statusObject(401, `User not authorized (Tag: ${tag.name})`);
                }
            }
        }

        event.tags = tags;
        event.min_needed_difficulty = minNeededDifficulty;
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
            const { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags } = data;
            const result = await db.run(
                `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost]
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
            const { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags } = data;
            await db.run(
                `UPDATE events SET title=?, description=?, location=?, start=?, end=?, difficulty_level=?, max_attendees=?, upfront_cost=? WHERE id=?`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, id]
            );

            if (tags && Array.isArray(tags)) {
                await TagsDB.clearEventTags(db, id);
                for (const tagId of tags) await TagsDB.associateTag(db, id, tagId);
            }

            return new statusObject(200, 'Event updated');
        } catch (error) {
            return new statusObject(500, 'Database error');
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

    /**
     * Verify if user is attending an event.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async is_user_attending_event(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) return event;

        const existingJoin = await db.get(
            'SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1',
            [eventId, req.user.id]
        );

        return new statusObject(200, null, !!existingJoin);
    }

    /**
     * Register user for an event.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @param {number|null} transactionId
     * @returns {Promise<statusObject>}
     */
    static async attend_event(req, db, eventId, transactionId = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) return event;

        const existingJoin = await this.is_user_attending_event(req, db, eventId);
        if (existingJoin.isError()) return existingJoin;
        if (existingJoin.getData()) return new statusObject(409, 'User already attending');

        await db.run(
            'INSERT INTO event_attendees (event_id, user_id, joined_at, payment_transaction_id) VALUES (?, ?, ?, ?)',
            [eventId, req.user.id, new Date().toISOString(), transactionId]
        );

        return new statusObject(200, 'Joined successfully');
    }

    /**
     * Remove user from an event (soft delete).
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async leave_event(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) return event;

        const existingJoin = await this.is_user_attending_event(req, db, eventId);
        if (existingJoin.isError()) return existingJoin;
        if (!existingJoin.getData()) return new statusObject(409, 'User not attending');

        await db.run(
            'UPDATE event_attendees SET is_attending = 0, left_at = ? WHERE event_id = ? AND user_id = ?',
            [new Date().toISOString(), eventId, req.user.id]
        );

        return new statusObject(200, 'Left successfully');
    }

    /**
     * Fetch all users who have interacted with an event (attended or left).
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
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
                    return b.is_attending - a.is_attending; // Active (1) first
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

    /**
     * Fetch active attendees for an event.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async get_users_attending_event(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) return event;

        const events = await db.all(
            `SELECT u.id, u.first_name, u.last_name, u.email
             FROM users u
             JOIN event_attendees ea ON u.id = ea.user_id
             WHERE ea.event_id = ? AND ea.is_attending = 1`, [eventId]
        );
        return new statusObject(200, null, events);
    }

    /**
     * Fetch attendee count for an event.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async get_event_attendance_count(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) return event;

        const result = await db.get(`SELECT COUNT(*) AS count FROM event_attendees WHERE event_id = ? AND is_attending = 1`, [eventId]);
        return new statusObject(200, null, result.count);
    }

    /**
     * Find a transaction ID for event refund.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async get_event_refund_id(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        const event = await this.get_event_by_id(req, db, eventId);
        if (event.isError()) return event;

        const userRefund = await db.get(
            `SELECT payment_transaction_id FROM event_attendees 
             WHERE event_id = ? AND user_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL 
             ORDER BY left_at ASC LIMIT 1`, [eventId, req.user.id]
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

    /**
     * Process manual refund for an event.
     * @param {object} db
     * @param {number} eventId
     * @param {number} user_id
     * @returns {Promise<statusObject>}
     */
    static async refundEvent(db, eventId, user_id) {
        const eventRes = await this.getEventByIdAdmin(db, eventId);
        if (eventRes.isError()) return eventRes;
        const event = eventRes.getData();

        TransactionsDB.add_transaction_admin(db, user_id, event.upfront_cost, `Refund for ${event.title}`);

        await db.run(
            `UPDATE event_attendees SET payment_transaction_id = NULL 
             WHERE event_id = ? AND user_id = ? AND is_attending = 0 AND payment_transaction_id IS NOT NULL`,
            [eventId, user_id]
        );

        return new statusObject(200, 'Refund processed');
    }

    /**
     * Verify if user paid for an event.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async isUserPayingForEvent(req, db, eventId) {
        const paying = await db.get(
            `SELECT payment_transaction_id FROM event_attendees 
             WHERE event_id = ? AND user_id = ? AND payment_transaction_id IS NOT NULL`,
            [eventId, req.user.id]
        );
        return new statusObject(200, null, !!paying);
    }

    /**
     * Fetch attending coach count.
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<number>}
     */
    static async getCoachesAttendingCount(db, eventId) {
        const result = await db.get(
            `SELECT COUNT(*) as count FROM event_attendees ea JOIN users u ON ea.user_id = u.id
             WHERE ea.event_id = ? AND ea.is_attending = 1 AND u.is_instructor = 1`, [eventId]
        );
        return result ? result.count : 0;
    }

    /**
     * Remove all attendees from an event.
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<void>}
     */
    static async removeAllAttendees(db, eventId) {
        await db.run(`UPDATE event_attendees SET is_attending = 0, left_at = ? WHERE event_id = ? AND is_attending = 1`, [new Date().toISOString(), eventId]);
    }

    /**
     * Check if user is on waiting list.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async is_user_on_waiting_list(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        const result = await db.get('SELECT 1 FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, req.user.id]);
        return new statusObject(200, null, !!result);
    }

    /**
     * Join waiting list.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async join_waiting_list(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        
        const onList = await this.is_user_on_waiting_list(req, db, eventId);
        if (onList.getData()) return new statusObject(409, 'Already on waiting list');

        await db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [eventId, req.user.id]);
        return new statusObject(200, 'Joined waiting list');
    }

    /**
     * Leave waiting list.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async leave_waiting_list(req, db, eventId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        await db.run('DELETE FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, req.user.id]);
        return new statusObject(200, 'Left waiting list');
    }

    /**
     * Get next user on waiting list.
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
     */
    static async get_next_on_waiting_list(db, eventId) {
        const user = await db.get('SELECT user_id FROM event_waiting_list WHERE event_id = ? ORDER BY joined_at ASC LIMIT 1', [eventId]);
        return new statusObject(200, null, user ? user.user_id : null);
    }

    /**
     * Remove user from waiting list (admin/system).
     * @param {object} db
     * @param {number} eventId
     * @param {number} userId
     */
    static async remove_user_from_waiting_list(db, eventId, userId) {
        await db.run('DELETE FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, userId]);
    }

    /**
     * Get all users in waiting list for an event.
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
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
     * Get waiting list count for an event.
     * @param {object} db
     * @param {number} eventId
     * @returns {Promise<statusObject>}
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
     * Get user position in waiting list.
     * @param {object} db
     * @param {number} eventId
     * @param {number} userId
     * @returns {Promise<statusObject>}
     */
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

module.exports = eventsDB;