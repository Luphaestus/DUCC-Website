/**
 * EventsAPI.js
 * 
 * This file handles public and member event listing routes.
 * It features dynamic date range calculations for the events page.
 * 
 * Routes:
 * - GET /api/events/rweek/:offset: Fetch events for a week relative to today.
 * - GET /api/events/paged/:page: Fetch events using custom paging logic (today-sun, past, full weeks).
 * - GET /api/event/:id: Fetch specific event details.
 * - GET /api/event/:id/canManage: Check if the user has permission to manage a specific event.
 */

const EventsDB = require('../../db/eventsDB.js');
const UserDB = require('../../db/userDB.js');
const TagsDB = require('../../db/tagsDB.js');
const Globals = require('../../misc/globals.js');
const check = require('../../misc/authentication.js');

/**
 * Manages event listings.
 * @module EventsAPI
 */
class EventsAPI {
    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers public and member-facing event listing routes.
     */
    registerRoutes() {
        /**
         * Fetch events for a specific week, filtered by user difficulty.
         * Offset 0 is current week, 1 is next week, etc.
         */
        this.app.get('/api/events/rweek/:offset', async (req, res) => {
            const userId = req.user ? req.user.id : null;
            let max_difficulty_val;
            
            // Fetch the maximum difficulty the user is allowed to view
            if (userId) {
                const max_difficulty = await UserDB.getElementsById(this.db, userId, "difficulty_level");
                if (max_difficulty.isError()) return max_difficulty.getResponse(res);
                max_difficulty_val = max_difficulty.getData().difficulty_level;
            } else {
                max_difficulty_val = new Globals().getInt("Unauthorized_max_difficulty");
            }

            const offset = parseInt(req.params.offset, 10);
            if (Number.isNaN(offset)) {
                return res.status(400).json({ message: 'Offset must be an integer' });
            }
            if (Math.abs(offset) > 10000) {
                return res.status(400).json({ message: 'Offset out of range' });
            }

            const events = await EventsDB.get_events_relative_week(this.db, max_difficulty_val, offset, userId);
            if (events.isError()) { return events.getResponse(res); }

            res.json({ events: events.getData() });
        });

        /**
         * Fetch events paged by logical chunks.
         * Page 0: Today until this Sunday.
         * Page -1: This past Monday until yesterday.
         * Other pages: Full weeks (Mon-Sun) relative to current Monday.
         */
        this.app.get('/api/events/paged/:page', async (req, res) => {
            const userId = req.user ? req.user.id : null;
            let max_difficulty_val;
            
            if (userId) {
                const max_difficulty = await UserDB.getElementsById(this.db, userId, "difficulty_level");
                if (max_difficulty.isError()) return max_difficulty.getResponse(res);
                max_difficulty_val = max_difficulty.getData().difficulty_level;
            } else {
                max_difficulty_val = new Globals().getInt("Unauthorized_max_difficulty");
            }

            const page = parseInt(req.params.page, 10);
            if (Number.isNaN(page)) return res.status(400).json({ message: 'Page must be an integer' });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon
            const isMonday = dayOfWeek === 1;
            const isSunday = dayOfWeek === 0;

            let startDate = new Date(today);
            let endDate = new Date(today);

            // Calculate "This Monday"
            const currentMonday = new Date(today);
            currentMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            if (page === 0) {
                // Today -> Sunday (or Next Sunday if today is Sunday)
                startDate = new Date(today);
                if (isSunday) {
                    // Show Today (Sunday) -> Next Sunday
                    endDate.setDate(today.getDate() + 7);
                } else {
                    // Show Today -> This Sunday
                    endDate.setDate(currentMonday.getDate() + 6);
                }
            } else if (page === -1) {
                if (isMonday) {
                    // Today is Monday, so "Mon-Yest" is empty. 
                    // Fallback: Show last week.
                    startDate = new Date(currentMonday);
                    startDate.setDate(currentMonday.getDate() - 7);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                } else {
                    // Monday of this week -> Yesterday
                    startDate = new Date(currentMonday);
                    endDate = new Date(today);
                    endDate.setDate(today.getDate() - 1);
                }
            } else {
                // Other pages represent full weeks
                let weekOffset = page;
                if (!isMonday && page < 0) {
                    weekOffset = page + 1; // Correct for the partial -1 page
                }

                startDate = new Date(currentMonday);
                startDate.setDate(currentMonday.getDate() + (weekOffset * 7));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
            }

            // Set final time boundaries
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            const events = await EventsDB.get_events_in_range(this.db, max_difficulty_val, startDate, endDate, userId);
            if (events.isError()) return events.getResponse(res);

            res.json({ events: events.getData(), startDate, endDate });
        });

        /**
         * Fetch specific event details by ID.
         * Enforces view authorization (difficulty/tags).
         */
        this.app.get('/api/event/:id', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const event = await EventsDB.get_event_by_id(this.db, req.user ? req.user.id : null, eventId);
            if (event.isError()) { return event.getResponse(res); }

            res.json({ event: event.getData() });
        });

        /**
         * Check if the current user is authorized to manage a specific event.
         * Used to show/hide "Edit" buttons in the UI.
         */
        this.app.get('/api/event/:id/canManage', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const { Permissions } = require('../../misc/permissions.js');
            const canManage = await Permissions.canManageEvent(this.db, req.user.id, eventId);
            res.json({ canManage });
        });

        /**
         * Calculate fallback image for an event based on tag IDs.
         */
        this.app.post('/api/admin/events/calculate-fallback-image', check('perm:event.manage.all | perm:event.manage.scoped'), async (req, res) => {
            const tagIds = req.body.tagIds;
            if (!Array.isArray(tagIds)) {
                return res.status(400).json({ message: 'tagIds must be an array' });
            }

            try {
                let tags = [];
                if (tagIds.length > 0) {
                    tags = await TagsDB.getTagListByIds(this.db, tagIds);
                }
                const url = await EventsDB._getFallbackImage(this.db, tags);
                res.json({ url });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal error' });
            }
        });
    }
}

module.exports = EventsAPI;