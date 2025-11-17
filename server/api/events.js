const EventsDB = require('../db/eventsDB.js');
const UserDB = require('../db/userDB.js');
const errorCodetoResponse = require('../misc/error.js');

/**
 * Events - Handles event-related operations and API routes
 *
 * Routes:
 *  GET  /api/events               -> { events: Event[] }
 * GET  /api/events/rweek/:offset -> { events: Event[] }
 *
 * @module Events
 */

const UnauthenticatedDefaultDifficulty = 2;
const ErrorDefaultDifficulty = 5;

class Events {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    handleCodeError(code) {
        if (typeof code < 100) return code;
        switch (code) {
            case 401:
            case 404:
            case 500:
                return UnauthenticatedDefaultDifficulty;
            case 204:
                return ErrorDefaultDifficulty;
            default:
                return errorCodetoResponse(code);
        }
    }

    registerRoutes() {
        this.app.get('/api/events/rweek/:offset', async (req, res) => {
            const max_difficulty = this.handleCodeError(await UserDB.getDifficultyLevel(req, this.db));
            if (typeof max_difficulty !== 'number') return max_difficulty;

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
            const max_difficulty = this.handleCodeError(await UserDB.getDifficultyLevel(req, this.db));
            if (typeof max_difficulty !== 'number') return max_difficulty;

            try {
                const events = await EventsDB.get_all_events(this.db, max_difficulty);
                res.json({ events });
            } catch (error) {
                console.error('Failed to fetch events:', error);
                res.status(500).json({ error: 'Failed to fetch events' });
            }
        });
    }
}

module.exports = Events;