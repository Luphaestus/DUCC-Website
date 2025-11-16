

User = require('../user.js');

/**
 * Events - Handles event-related operations and API routes
 *
 * Routes:
 *  GET  /api/events               -> { events: Event[] }
 * GET  /api/events/rweek/:offset -> { events: Event[] }
 *
 * @module Events
 */
class Event {
    constructor(id, name, date, location, description) {
        this.id = id;
        this.name = name;
        this.date = date;
        this.location = location;
        this.description = description;
    }
}

class Events {
    constructor(app, db, auth) {
        this.app = app;
        this.db = db;
        this.auth = auth;
    }

    get_all_events(max_difficulty) {
        return this.db.all(
            'SELECT * FROM events WHERE difficulty_level <= ? ORDER BY start ASC',
            [max_difficulty]
        );
    }

    get_events_for_week(max_difficulty, date = new Date()) {
        const startOfWeek = date;
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return this.db.all(
            'SELECT * FROM events WHERE start BETWEEN ? AND ? AND difficulty_level <= ? ORDER BY start ASC',
            [startOfWeek.toISOString(), endOfWeek.toISOString(), max_difficulty]
        );
    }

    get_events_relative_week(max_difficulty, offset = 0) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + offset * 7);
        return this.get_events_for_week(max_difficulty, targetDate);
    }

    registerRoutes() {
        this.app.get('/api/events/rweek/:offset', async (req, res) => {
            let max_difficulty = await User.getDifficultyLevel(req, res, this.app, this.auth);
            if (max_difficulty === false) {
                max_difficulty = 2;
                console.log('Unauthenticated user accessing /api/events/rweek/:offset, defaulting max_difficulty to 2');
            } else if (max_difficulty === null) {
                max_difficulty = 5;
                console.log('Error fetching difficulty level, defaulting max_difficulty to 5');
            }

            const offset = parseInt(req.params.offset, 10);
            if (Number.isNaN(offset)) {
                return res.status(400).json({ error: 'Offset must be an integer' });
            }
            try {
                const events = await this.get_events_relative_week(max_difficulty, offset);
                res.json({ events });
            } catch (error) {
                console.error('Failed to fetch events for relative week:', error);
                res.status(500).json({ error: 'Failed to fetch events for relative week' });
            }
        });

        this.app.get('/api/events', async (req, res) => {
            let max_difficulty = await User.getDifficultyLevel(req, res, this.app, this.auth);
            if (max_difficulty === false) {
                max_difficulty = 2;
                console.log('Unauthenticated user accessing /api/events, defaulting max_difficulty to 2');
            } else if (max_difficulty === null) {
                max_difficulty = 5;
                console.log('Error fetching difficulty level, defaulting max_difficulty to 5');
            }

            try {
                const events = await this.get_all_events(max_difficulty);
                res.json({ events });
            } catch (error) {
                console.error('Failed to fetch events:', error);
                res.status(500).json({ error: 'Failed to fetch events' });
            }
        });
    }
}

module.exports = Events;