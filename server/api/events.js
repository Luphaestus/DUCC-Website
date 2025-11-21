const EventsDB = require('../db/eventsDB.js');
const UserDB = require('../db/userDB.js');
const errorCodetoResponse = require('../misc/error.js');


/**
 * Routes:
 * GET  /api/events               -> { events: Event[] }
 * GET  /api/events/rweek/:offset -> { events: Event[] }
 * GET  /api/events/:id          -> { event: Event }
 *
 * @module Events
 */
class Events {

    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        this.app.get('/api/events/rweek/:offset', async (req, res) => {
            const max_difficulty = await UserDB.getDifficultyLevel(req, this.db);
            if (typeof max_difficulty !== 'number') return res.status(max_difficulty.status).json({ error: max_difficulty.message });

            const offset = parseInt(req.params.offset, 10);
            if (Number.isNaN(offset)) {
                return res.status(400).json({ error: 'Offset must be an integer' });
            }

            try {
                const events = await EventsDB.get_events_relative_week(this.db, max_difficulty, offset);
                res.json({ events });
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch events for relative week' });
            }
        });

        this.app.get('/api/events', async (req, res) => {
            const max_difficulty = await UserDB.getDifficultyLevel(req, this.db);

            if (typeof max_difficulty !== 'number') return res.status(max_difficulty.status).json({ error: max_difficulty.message });

            try {
                const events = await EventsDB.get_all_events(this.db, max_difficulty);
                res.json({ events });
            } catch (error) {
                console.error('Failed to fetch events:', error);
                res.status(500).json({ error: 'Failed to fetch events' });
            }
        });

        this.app.get('/api/event/:id', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ error: 'Event ID must be an integer' });
            }

            try {
                const event = await EventsDB.get_event_by_id(req, this.db, eventId);
                if (typeof event === 'number') {
                    return res.status(event).json({ error: errorCodetoResponse(event).message });
                }
                if (!event) {
                    return res.status(404).json({ error: 'Event not found' });
                }

                res.json({ event });
            } catch (error) {
                res.status(500).json({ error: 'Failed to fetch event' });
            }
        });

        this.app.get('/api/event/:id/isAttending', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ error: 'Event ID must be an integer' });
            }

            try {
                const isAttending = await EventsDB.is_user_attending_event(req, this.db, eventId);
                if (typeof isAttending === 'number') {
                    return res.status(isAttending).json({ error: errorCodetoResponse(isAttending).message });
                }
                res.json({ isAttending });
            } catch (error) {
                res.status(500).json({ error: 'Failed to check attendance status' });
            }
        });

        this.app.post('/api/event/:id/attend', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ error: 'Event ID must be an integer' });
            }

            try {
                const statusCode = await EventsDB.attend_event(req, this.db, eventId);
                if (statusCode !== 200) {
                    return res.status(statusCode).json({ error: errorCodetoResponse(statusCode).message });
                }
                res.status(200).json({ message: 'Successfully attended event' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to attend event' });
            }
        });

        this.app.post('/api/event/:id/leave', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ error: 'Event ID must be an integer' });
            }

            try {
                const statusCode = await EventsDB.leave_event(req, this.db, eventId);
                if (statusCode !== 200) {
                    return res.status(statusCode).json({ error: errorCodetoResponse(statusCode).message });
                }
                res.status(200).json({ message: 'Successfully left event' });
            } catch (error) {
                res.status(500).json({ error: 'Failed to leave event' });
            }
        });

        this.app.get('/api/event/:id/attendees', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ error: 'Event ID must be an integer' });
            }

            try {
                const attendees = await EventsDB.get_users_attending_event(req, this.db, eventId);
                if (typeof attendees === 'number') {
                    return res.status(attendees).json({ error: errorCodetoResponse(attendees).message });
                }
                res.json({ attendees });
            } catch (error) {
                console.error('Failed to fetch event attendees:', error);
                res.status(500).json({ error: 'Failed to fetch event attendees' });
            }
        });

    }
}

module.exports = Events;