import { FastifyInstance, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import EventsDB from '../../db/eventsDB.js';
import crypto from 'crypto';
import Logger from '../../misc/Logger.js';
import check from '../../misc/authentication.js';

export default class CalendarAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * GET /api/calendar/all.ics
         * Public feed of all upcoming events that are visible to everyone.
         */
        this.app.get('/api/calendar/all.ics', async (request: any, reply: FastifyReply) => {
            const eventsRes = await EventsDB.get_events_in_range(
                this.db, 
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year ahead
            );

            if (eventsRes.isError()) return eventsRes.getResponse(reply);
            
            const icsContent = this.generateICS('DUCC All Events', eventsRes.getData());
            return reply
                .type('text/calendar')
                .header('Content-Disposition', 'attachment; filename="ducc_events.ics"')
                .send(icsContent);
        });

        /**
         * GET /api/calendar/personal/:token.ics
         * Personal feed of events the user is attending.
         */
        this.app.get('/api/calendar/personal/:token.ics', async (request: any, reply: FastifyReply) => {
            const { token } = request.params;
            if (!token || token.length < 32) {
                return reply.status(400).send({ message: 'Invalid calendar token' });
            }

            const user = await this.db.get('SELECT id FROM users WHERE ics_token = ?', [token]);
            if (!user) {
                return reply.status(401).send({ message: 'Unauthorized' });
            }

            const sql = `
                SELECT e.* 
                FROM events e
                JOIN event_attendees ea ON e.id = ea.event_id
                WHERE ea.user_id = ? AND ea.is_attending = 1
                AND e.start >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY e.start ASC
            `;
            
            try {
                const events = await this.db.all(sql, [user.id]);
                const icsContent = this.generateICS('DUCC My Events', events);
                return reply
                    .type('text/calendar')
                    .header('Content-Disposition', 'attachment; filename="my_ducc_events.ics"')
                    .send(icsContent);
            } catch (error: any) {
                Logger.error('Calendar generation error:', error);
                return reply.status(500).send({ message: 'Internal server error' });
            }
        });

        /**
         * GET /api/calendar/accessible/:token.ics
         * Personal feed of all events the user is allowed to see.
         */
        this.app.get('/api/calendar/accessible/:token.ics', async (request: any, reply: FastifyReply) => {
            const { token } = request.params;
            if (!token || token.length < 32) {
                return reply.status(400).send({ message: 'Invalid calendar token' });
            }

            const user = await this.db.get('SELECT id FROM users WHERE ics_token = ?', [token]);
            if (!user) {
                return reply.status(401).send({ message: 'Unauthorized' });
            }

            const eventsRes = await EventsDB.get_events_in_range(
                this.db, 
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ahead
                user.id
            );

            if (eventsRes.isError()) return eventsRes.getResponse(reply);
            
            const icsContent = this.generateICS('DUCC Accessible Events', eventsRes.getData());
            return reply
                .type('text/calendar')
                .header('Content-Disposition', 'attachment; filename="ducc_accessible_events.ics"')
                .send(icsContent);
        });

        /**
         * POST /api/calendar/token
         * Generate or get the user's personal calendar token.
         */
        this.app.post('/api/calendar/token', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            if (!request.user) return reply.status(401).send({ message: 'Unauthorized' });
            
            let tokenData = await this.db.get('SELECT ics_token FROM users WHERE id = ?', [request.user.id]);
            let token = tokenData ? tokenData.ics_token : null;
            
            if (!token) {
                token = crypto.randomBytes(32).toString('hex');
                await this.db.run('UPDATE users SET ics_token = ? WHERE id = ?', [token, request.user.id]);
            }

            return reply.send({ token });
        });
    }

    private generateICS(calendarName: string, events: any[]): string {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//DUCC//Website//EN',
            `X-WR-CALNAME:${calendarName}`,
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        for (const event of events) {
            const start = new Date(event.start);
            const end = new Date(event.end);
            
            lines.push('BEGIN:VEVENT');
            lines.push(`UID:event-${event.id}@durhamunicanoe.co.uk`);
            lines.push(`DTSTAMP:${this.formatDateICS(new Date())}`);
            lines.push(`DTSTART:${this.formatDateICS(start)}`);
            lines.push(`DTEND:${this.formatDateICS(end)}`);
            lines.push(`SUMMARY:${this.escapeICS(event.title)}`);
            if (event.description) {
                lines.push(`DESCRIPTION:${this.escapeICS(event.description)}`);
            }
            if (event.location) {
                lines.push(`LOCATION:${this.escapeICS(event.location)}`);
            }
            lines.push('END:VEVENT');
        }

        lines.push('END:VCALENDAR');
        return lines.join('\r\n');
    }

    private formatDateICS(date: Date): string {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    private escapeICS(str: string): string {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\n/g, '\\n');
    }
}
