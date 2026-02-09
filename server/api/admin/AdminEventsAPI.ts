/**
 * AdminEventsAPI.ts
 * 
 * This file handles administrative actions for events.
 */

import EventsDB from '../../db/eventsDB.js';
import check from '../../misc/authentication.js';
import { Permissions } from '../../misc/permissions.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminEvents {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all admin-level event management routes.
     */
    registerRoutes() {
        /**
         * Fetch paginated events list for admin dashboard.
         */
        this.app.get('/api/admin/events', { preHandler: [check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped')] }, async (request: any, reply: FastifyReply) => {
            const page = parseInt(request.query.page as string) || 1;
            const limit = parseInt(request.query.limit as string) || 10;
            const search = (request.query.search as string) || '';
            const sort = (request.query.sort as string) || 'start';
            const order = (request.query.order as 'asc' | 'desc') || 'asc';
            const showPast = request.query.showPast === 'true';
            const minCost = request.query.minCost as string;
            const maxCost = request.query.maxCost as string;
            const difficulty = request.query.difficulty as string;
            const location = request.query.location as string;
            const status = request.query.status as string;

            let permissionsFilter: number[] | undefined = undefined;

            const hasAll = await Permissions.hasPermission(this.db, request.user.id, 'event.read.all') ||
                await Permissions.hasPermission(this.db, request.user.id, 'event.manage.all');

            if (!hasAll) {
                permissionsFilter = await Permissions.getManagedTags(this.db, request.user.id);
            }

            const result = await EventsDB.getEventsAdmin(this.db, {
                page, limit, search, sort, order, showPast, minCost, maxCost, difficulty, location, status,
                permissions: (permissionsFilter as any)
            });
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        /**
         * Fetch event details by ID for administrative editing.
         */
        this.app.get<{ Params: { id: string } }>('/api/admin/event/:id', { preHandler: [check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped')] }, async (request, reply) => {
            const result = await EventsDB.getEventByIdAdmin(this.db, parseInt(request.params.id));
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        /**
         * Fetch raw event details.
         */
        this.app.get<{ Params: { id: string } }>('/api/admin/event/:id/raw', { preHandler: [check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped')] }, async (request, reply) => {
            try {
                const event = await EventsDB.getEventById(this.db, parseInt(request.params.id));
                if (!event) return reply.status(404).send({ message: 'Event not found' });
                return reply.send(event);
            } catch (error) {
                return reply.status(500).send({ message: 'Database error' });
            }
        });

        /**
         * Export event attendees as CSV.
         */
        this.app.get<{ Params: { id: string } }>('/api/admin/event/:id/attendees/csv', { preHandler: [check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped')] }, async (request, reply) => {
            try {
                const eventId = parseInt(request.params.id);
                const eventRes = await EventsDB.getEventByIdAdmin(this.db, eventId);
                if (eventRes.isError()) return eventRes.getResponse(reply);
                // @ts-ignore
                const event = eventRes.getData();

                const attendees = await this.db.all(`
                    SELECT u.first_name, u.last_name, u.email, ea.is_attending, ea.joined_at
                    FROM users u
                    JOIN event_attendees ea ON u.id = ea.user_id
                    WHERE ea.event_id = ?
                    ORDER BY u.last_name, u.first_name
                `, [eventId]);

                let csv = 'First Name,Last Name,Email,Status,Joined At\n';
                for (const a of attendees) {
                    csv += `${a.first_name},${a.last_name},${a.email},${a.is_attending ? 'Attending' : 'Left'},${a.joined_at}\n`;
                }

                reply.header('Content-Type', 'text/csv');
                reply.header('Content-Disposition', `attachment; filename="attendees_event_${eventId}.csv"`);
                return reply.status(200).send(csv);
            } catch (e: any) {
                return reply.status(500).send({ message: 'Export failed' });
            }
        });

        /**
         * Duplicate an event.
         */
        this.app.post('/api/admin/event/:id/duplicate', { preHandler: [check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped')] }, async (request: any, reply: FastifyReply) => {
            const id = parseInt(request.params.id);
            if (!await Permissions.canManageEvent(this.db, request.user.id, id)) {
                return reply.status(403).send({ message: 'Not authorized for this event' });
            }

            try {
                const originalRes = await EventsDB.getEventByIdAdmin(this.db, id);
                if (originalRes.isError()) return originalRes.getResponse(reply);
                const original = originalRes.getData();
                const rawOriginal = await EventsDB.getEventById(this.db, id);

                const newData = {
                    ...original,
                    title: `Copy of ${original.title}`,
                    status: 'pending', // Reset to draft
                    visible_at: null,
                    start: rawOriginal.start, // Keep original times
                    end: rawOriginal.end,
                    image_id: rawOriginal.image_id,
                    tags: original.tags.map((t: any) => t.id)
                };
                delete newData.id;
                delete newData.image_url;
                delete newData.attendee_count;
                delete newData.is_attending;
                delete newData.can_attend;

                const createRes = await EventsDB.createEvent(this.db, newData);
                return createRes.getResponse(reply);
            } catch (e: any) {
                return reply.status(500).send({ message: e.message });
            }
        });

        /**
         * Duplicate an entire week of events to another week.
         */
        this.app.post<{ Body: { sourceDate: string, targetDate: string } }>('/api/admin/events/duplicate-week', { preHandler: [check('perm:event.write.all | perm:event.manage.all')] }, async (request: any, reply: FastifyReply) => {
            const { sourceDate, targetDate } = request.body;
            if (!sourceDate || !targetDate) return reply.status(400).send({ message: 'Missing dates' });

            try {
                const s = new Date(sourceDate);
                const t = new Date(targetDate);
                
                // Find start of both weeks (Monday)
                const sMon = new Date(s); sMon.setDate(s.getDate() - (s.getDay() === 0 ? 6 : s.getDay() - 1)); sMon.setHours(0,0,0,0);
                const tMon = new Date(t); tMon.setDate(t.getDate() - (t.getDay() === 0 ? 6 : t.getDay() - 1)); tMon.setHours(0,0,0,0);
                
                const sSun = new Date(sMon); sSun.setDate(sMon.getDate() + 6); sSun.setHours(23,59,59,999);
                
                const eventsToCopy = await this.db.all("SELECT * FROM events WHERE start BETWEEN ? AND ? AND is_canceled = 0", [sMon, sSun]);
                
                const weekDiff = tMon.getTime() - sMon.getTime();
                let count = 0;

                for (const ev of eventsToCopy) {
                    const newStart = new Date(new Date(ev.start).getTime() + weekDiff);
                    const newEnd = new Date(new Date(ev.end).getTime() + weekDiff);
                    const newRefund = ev.upfront_refund_cutoff ? new Date(new Date(ev.upfront_refund_cutoff).getTime() + weekDiff) : null;

                    const tags = await this.db.all("SELECT tag_id FROM event_tags WHERE event_id = ?", [ev.id]);

                    const newData = {
                        ...ev,
                        start: newStart,
                        end: newEnd,
                        upfront_refund_cutoff: newRefund,
                        status: 'pending', // Stage them!
                        visible_at: null,
                        costs_released: 0
                    };
                    delete newData.id;
                    delete newData.created_at;
                    delete newData.updated_at;

                    const result = await EventsDB.createEvent(this.db, { ...newData, tags: tags.map(t => t.tag_id) });
                    if (!result.isError()) count++;
                }

                return reply.send({ message: `Staged ${count} events for the week of ${tMon.toLocaleDateString()}.` });
            } catch (e: any) {
                return reply.status(500).send({ message: e.message });
            }
        });

        /**
         * Publish all staged (pending) events.
         */
        this.app.post('/api/admin/events/publish-staged', { preHandler: [check('perm:event.write.all | perm:event.manage.all')] }, async (request: any, reply: FastifyReply) => {
            try {
                const result = await this.db.run("UPDATE events SET status = 'confirmed' WHERE status = 'pending' AND start >= NOW()");
                
                if (result.changes > 0) {
                    const EventHub = (await import('../../misc/EventHub.js')).default;
                    EventHub.broadcast('event_update', { action: 'bulk_published' });
                    
                    // Optional: Send notification to all users?
                    // await NotificationsAPI.broadcastNotification(this.db, 'New Events Published!', 'Check out the new events scheduled for this week.', '/events');
                }
                
                return reply.send({ message: `${result.changes} events published.` });
            } catch (e: any) {
                return reply.status(500).send({ message: e.message });
            }
        });

        /**
         * Create a new event.
         */
        this.app.post('/api/admin/event', { preHandler: [check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped')] }, async (request: any, reply: FastifyReply) => {
            if (!await Permissions.canManageEvent(this.db, request.user.id, null, request.body.tags)) {
                return reply.status(403).send({ message: 'Not authorized for these tags' });
            }
            const result = await EventsDB.createEvent(this.db, request.body as any);
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('event_update', { action: 'created', eventId: result.getData()?.id });
            }
            return result.getResponse(reply);
        });

        /**
         * Update an existing event.
         */
        this.app.put('/api/admin/event/:id', { preHandler: [check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped')] }, async (request: any, reply: FastifyReply) => {
            if (!await Permissions.canManageEvent(this.db, request.user.id, parseInt(request.params.id))) {
                return reply.status(403).send({ message: 'Not authorized for this event' });
            }
            const result = await EventsDB.updateEvent(this.db, parseInt(request.params.id), request.body as any);
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('event_update', { action: 'updated', eventId: request.params.id });
            }
            return result.getResponse(reply);
        });

        /**
         * Reset event image to default.
         */
        this.app.post('/api/admin/event/:id/reset-image', { preHandler: [check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped')] }, async (request: any, reply: FastifyReply) => {
            if (!await Permissions.canManageEvent(this.db, request.user.id, parseInt(request.params.id))) {
                return reply.status(403).send({ message: 'Not authorized for this event' });
            }
            
            const result = await EventsDB.resetImage(this.db, parseInt(request.params.id));
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('event_update', { action: 'updated', eventId: request.params.id });
            }
            return result.getResponse(reply);
        });

        /**
         * Cancel an event.
         */
        this.app.post('/api/admin/event/:id/cancel', { preHandler: [check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped')] }, async (request: any, reply: FastifyReply) => {
            if (!await Permissions.canManageEvent(this.db, request.user.id, parseInt(request.params.id))) {
                return reply.status(403).send({ message: 'Not authorized for this event' });
            }
            const result = await EventsDB.cancelEvent(this.db, parseInt(request.params.id));
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('event_update', { action: 'cancelled', eventId: request.params.id });
            }
            return result.getResponse(reply);
        });

        /**
         * Delete an event from the database.
         */
        this.app.delete('/api/admin/event/:id', { preHandler: [check('perm:event.delete | perm:event.manage.all | perm:event.manage.scoped')] }, async (request: any, reply: FastifyReply) => {
            if (!await Permissions.canManageEvent(this.db, request.user.id, parseInt(request.params.id))) {
                return reply.status(403).send({ message: 'Not authorized for this event' });
            }
            const eventRes = await EventsDB.getEventByIdAdmin(this.db, parseInt(request.params.id));
            if (eventRes.isError()) return eventRes.getResponse(reply);

            if (new Date(eventRes.getData().start) < new Date()) {
                return reply.status(400).send({ message: 'Cannot delete past events' });
            }

            const result = await EventsDB.deleteEvent(this.db, parseInt(request.params.id));
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('event_update', { action: 'deleted', eventId: request.params.id });
            }
            return result.getResponse(reply);
        });
    }
}