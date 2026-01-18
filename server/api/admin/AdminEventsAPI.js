const EventsDB = require('../../db/eventsDB.js');
const check = require('../../misc/authentication.js');
const { Permissions } = require('../../misc/permissions.js');

/**
 * Admin API for managing events.
 * @module AdminEvents
 */
class AdminEvents {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers admin event routes.
     */
    registerRoutes() {
        /**
         * Fetch paginated events list.
         */
        this.app.get('/api/admin/events', check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped'), async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const sort = req.query.sort || 'start';
            const order = req.query.order || 'asc';
            const showPast = req.query.showPast === 'true';
            const minCost = req.query.minCost;
            const maxCost = req.query.maxCost;
            const difficulty = req.query.difficulty;
            const location = req.query.location;

            let permissionsFilter = undefined;

            const hasAll = await Permissions.hasPermission(this.db, req.user.id, 'event.read.all') ||
                await Permissions.hasPermission(this.db, req.user.id, 'event.manage.all');

            if (!hasAll) {
                permissionsFilter = await Permissions.getManagedTags(this.db, req.user.id);
            }

            const result = await EventsDB.getEventsAdmin(this.db, {
                page, limit, search, sort, order, showPast, minCost, maxCost, difficulty, location,
                permissions: permissionsFilter
            });
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Fetch event details.
         */
        this.app.get('/api/admin/event/:id', check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped'), async (req, res) => {
            const result = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Create new event.
         */
        this.app.post('/api/admin/event', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req, res) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, null, req.body.tags)) {
                return res.status(403).json({ message: 'Not authorized for these tags' });
            }
            const result = await EventsDB.createEvent(this.db, req.body);
            result.getResponse(res);
        });

        /**
         * Update event.
         */
        this.app.put('/api/admin/event/:id', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req, res) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, req.params.id)) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            const result = await EventsDB.updateEvent(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        /**
         * Delete event.
         */
        this.app.delete('/api/admin/event/:id', check('perm:event.delete | perm:event.manage.all | perm:event.manage.scoped'), async (req, res) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, req.params.id)) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            const eventRes = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (eventRes.isError()) return eventRes.getResponse(res);

            if (new Date(eventRes.getData().start) < new Date()) {
                return res.status(400).json({ message: 'Cannot delete past events' });
            }

            const result = await EventsDB.deleteEvent(this.db, req.params.id);
            result.getResponse(res);
        });
    }
}

module.exports = AdminEvents;