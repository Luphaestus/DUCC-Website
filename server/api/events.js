const EventsDB = require('../db/eventsDB.js');
const UserDB = require('../db/userDB.js');
const errorCodetoResponse = require('../misc/error.js');


const UnauthenticatedDefaultDifficulty = 2;
const ErrorDefaultDifficulty = 5;

/**
 * Routes:
 *  GET  /api/events               -> { events: Event[] }
 * GET  /api/events/rweek/:offset -> { events: Event[] }
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

    /**
     * @param {number} code - The error code to handle.
     * @returns {number|object} The default difficulty level or an error response object.
     */
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
            const max_difficulty = this.handleCodeError(await UserDB.getDifficultyLevel(req, this.db));

            if (typeof max_difficulty !== 'number') return res.status(max_difficulty.status).json({ error: max_difficulty.message });

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