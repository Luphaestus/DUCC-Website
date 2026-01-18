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

            // Need to import Permissions at the top of the file
            const { Permissions } = require('../../misc/permissions.js');
            const canManage = await Permissions.canManageEvent(this.db, req.user.id, eventId);
            res.json({ canManage });
        });
    }
}

module.exports = EventsAPI;