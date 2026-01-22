const EventsDB = require('../../db/eventsDB.js');
const UserDB = require('../../db/userDB.js');
const Globals = require('../../misc/globals.js');
const check = require('../../misc/authentication.js');

/**
 * Manages event listings.
 * @module EventsAPI
 */
class EventsAPI {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers event-related routes.
     */
    registerRoutes() {
        /**
         * Fetch events for a specific week, filtered by difficulty.
         */
        this.app.get('/api/events/rweek/:offset', async (req, res) => {
            const userId = req.user ? req.user.id : null;
            let max_difficulty_val;
            
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
         * Fetch events paged by logic: 0=Today-Sun, -1=Mon-Yest, others=Full Weeks.
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
                    // Today is Monday, so "Mon-Yest" is empty/invalid. 
                    // Logic: -1 becomes Last Week.
                    startDate = new Date(currentMonday);
                    startDate.setDate(currentMonday.getDate() - 7);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                } else {
                    // Monday -> Yesterday
                    startDate = new Date(currentMonday);
                    endDate = new Date(today);
                    endDate.setDate(today.getDate() - 1);
                }
            } else {
                // Other pages are full weeks
                // Logic shift based on whether we had a partial -1 page
                // If isMonday: Page -1 was Week -1. Page -2 is Week -2.
                // If !isMonday: Page -1 was Partial. Page -2 is Week -1.
                
                let weekOffset = page;
                if (!isMonday && page < 0) {
                    weekOffset = page + 1; // Shift back: -2 becomes -1 (Last Week)
                }

                startDate = new Date(currentMonday);
                startDate.setDate(currentMonday.getDate() + (weekOffset * 7));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
            }

            // Set times
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            const events = await EventsDB.get_events_in_range(this.db, max_difficulty_val, startDate, endDate, userId);
            if (events.isError()) return events.getResponse(res);

            res.json({ events: events.getData(), startDate, endDate });
        });

        /**
         * Fetch event details by ID.
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

        this.app.get('/api/event/:id/canManage', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const { Permissions } = require('../../misc/permissions.js');
            const canManage = await Permissions.canManageEvent(this.db, req.user.id, eventId);
            res.json({ canManage });
        });
    }
}

module.exports = EventsAPI;