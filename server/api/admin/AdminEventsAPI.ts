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

            let permissionsFilter: number[] | undefined = undefined;

            const hasAll = await Permissions.hasPermission(this.db, req.user.id, 'event.read.all') ||
                await Permissions.hasPermission(this.db, req.user.id, 'event.manage.all');

            if (!hasAll) {
                permissionsFilter = await Permissions.getManagedTags(this.db, req.user.id);
            }

            const result = await EventsDB.getEventsAdmin(this.db, {
                page, limit, search, sort, order, showPast, minCost, maxCost, difficulty, location,
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
