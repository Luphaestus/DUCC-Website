/**
 * AdminEventsAPI.ts
 * 
 * This file handles administrative actions for events.
 */

import EventsDB from '../../db/eventsDB.js';
import check from '../../misc/authentication.js';
import { Permissions } from '../../misc/permissions.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminEvents {
    app: Express;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app: Express, db: DatabaseWrapper) {
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
        this.app.get('/api/admin/events', check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped'), async (req: any, res: Response) => {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = (req.query.search as string) || '';
            const sort = (req.query.sort as string) || 'start';
            const order = (req.query.order as 'asc' | 'desc') || 'asc';
            const showPast = req.query.showPast === 'true';
            const minCost = req.query.minCost as string;
            const maxCost = req.query.maxCost as string;
            const difficulty = req.query.difficulty as string;
            const location = req.query.location as string;
            const status = req.query.status as string;

            let permissionsFilter: number[] | undefined = undefined;

            const hasAll = await Permissions.hasPermission(this.db, req.user.id, 'event.read.all') ||
                await Permissions.hasPermission(this.db, req.user.id, 'event.manage.all');

            if (!hasAll) {
                permissionsFilter = await Permissions.getManagedTags(this.db, req.user.id);
            }

            const result = await EventsDB.getEventsAdmin(this.db, {
                page, limit, search, sort, order, showPast, minCost, maxCost, difficulty, location, status,
                permissions: (permissionsFilter as any)
            });
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Fetch event details by ID for administrative editing.
         */
        this.app.get('/api/admin/event/:id', check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped'), async (req: Request, res: Response) => {
            const result = await EventsDB.getEventByIdAdmin(this.db, parseInt(req.params.id));
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Fetch raw event details.
         */
        this.app.get('/api/admin/event/:id/raw', check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped'), async (req: Request, res: Response) => {
            try {
                const event = await EventsDB.getEventById(this.db, parseInt(req.params.id));
                if (!event) return res.status(404).json({ message: 'Event not found' });
                res.json(event);
            } catch (error) {
                res.status(500).json({ message: 'Database error' });
            }
        });

        /**
         * Export event attendees as CSV.
         */
        this.app.get('/api/admin/event/:id/attendees/csv', check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped'), async (req: Request, res: Response) => {
            try {
                const eventId = parseInt(req.params.id);
                const eventRes = await EventsDB.getEventByIdAdmin(this.db, eventId);
                if (eventRes.isError()) return eventRes.getResponse(res);
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

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="attendees_event_${eventId}.csv"`);
                res.status(200).send(csv);
            } catch (e: any) {
                res.status(500).json({ message: 'Export failed' });
            }
        });

        /**
         * Duplicate an event.
         */
        this.app.post('/api/admin/event/:id/duplicate', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req: any, res: Response) => {
            const id = parseInt(req.params.id);
            if (!await Permissions.canManageEvent(this.db, req.user.id, id)) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }

            try {
                const originalRes = await EventsDB.getEventByIdAdmin(this.db, id);
                if (originalRes.isError()) return originalRes.getResponse(res);
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
                return createRes.getResponse(res);
            } catch (e: any) {
                res.status(500).json({ message: e.message });
            }
        });

        /**
         * Create a new event.
         */
        this.app.post('/api/admin/event', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req: any, res: Response) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, null, req.body.tags)) {
                return res.status(403).json({ message: 'Not authorized for these tags' });
            }
            const result = await EventsDB.createEvent(this.db, req.body);
            result.getResponse(res);
        });

        /**
         * Update an existing event.
         */
        this.app.put('/api/admin/event/:id', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req: any, res: Response) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, parseInt(req.params.id))) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            const result = await EventsDB.updateEvent(this.db, parseInt(req.params.id), req.body);
            result.getResponse(res);
        });

        /**
         * Reset event image to default.
         */
        this.app.post('/api/admin/event/:id/reset-image', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req: any, res: Response) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, parseInt(req.params.id))) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            
            const result = await EventsDB.resetImage(this.db, parseInt(req.params.id));
            result.getResponse(res);
        });

        /**
         * Cancel an event.
         */
        this.app.post('/api/admin/event/:id/cancel', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req: any, res: Response) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, parseInt(req.params.id))) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            const result = await EventsDB.cancelEvent(this.db, parseInt(req.params.id));
            return result.getResponse(res);
        });

        /**
         * Delete an event from the database.
         */
        this.app.delete('/api/admin/event/:id', check('perm:event.delete | perm:event.manage.all | perm:event.manage.scoped'), async (req: any, res: Response) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, parseInt(req.params.id))) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            const eventRes = await EventsDB.getEventByIdAdmin(this.db, parseInt(req.params.id));
            if (eventRes.isError()) return eventRes.getResponse(res);

            if (new Date(eventRes.getData().start) < new Date()) {
                return res.status(400).json({ message: 'Cannot delete past events' });
            }

            const result = await EventsDB.deleteEvent(this.db, parseInt(req.params.id));
            result.getResponse(res);
        });
    }
}
