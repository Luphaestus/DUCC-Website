

//todo: implement difficulty_level filtering properly throughout the codebase
max_dificulty = 5;

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
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    get_all_events(max_dificulty) {
        return this.db.all(
            'SELECT * FROM events WHERE difficulty_level <= ? ORDER BY start ASC',
            [max_dificulty]
        );
    }
    
    get_events_for_week(max_dificulty, date = new Date()) {
        const startOfWeek = date;
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); 
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6); 
        endOfWeek.setHours(23, 59, 59, 999);

        return this.db.all(
            'SELECT * FROM events WHERE start BETWEEN ? AND ? AND difficulty_level <= ? ORDER BY start ASC',
            [startOfWeek.toISOString(), endOfWeek.toISOString(), max_dificulty]
        );
    }

    get_events_relative_week(max_dificulty, offset = 0) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + offset * 7);
        return this.get_events_for_week(max_dificulty, targetDate);
    }

    registerRoutes() {
        this.app.get('/api/events/rweek/:offset', async (req, res) => {
            const offset = parseInt(req.params.offset, 10);
            if (Number.isNaN(offset)) {
                return res.status(400).json({ error: 'Offset must be an integer' });
            }
            try {
                const events = await this.get_events_relative_week(max_dificulty, offset);
                res.json({ events });
            } catch (error) {
                console.error('Failed to fetch events for relative week:', error);
                res.status(500).json({ error: 'Failed to fetch events for relative week' });
            }
        });

        this.app.get('/api/events', async (req, res) => {
            try {
                const events = await this.get_all_events(max_dificulty);
                res.json({ events });
            } catch (error) {
                console.error('Failed to fetch events:', error);
                res.status(500).json({ error: 'Failed to fetch events' });
            }
        });
    }
}

module.exports = Events;