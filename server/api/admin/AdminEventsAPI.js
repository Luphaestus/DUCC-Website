/**
 * AdminEventsAPI.js
 * 
 * This file handles administrative actions for events, allowing Execs to create, update, and delete events.
 * It enforces scoped access, meaning some Execs can only manage events with certain tags.
 * 
 * Routes:
 * - GET /api/admin/events: List all events with pagination and detailed admin filters.
 * - GET /api/admin/event/:id: Fetch full event details including non-public info.
 * - POST /api/admin/event: Create a new event.
 * - PUT /api/admin/event/:id: Update existing event details.
 * - POST /api/admin/event/:id/reset-image: Reset event image to default.
 * - POST /api/admin/event/:id/cancel: Cancel an event and process attendee refunds.
 * - DELETE /api/admin/event/:id: Permanently delete an event (only if it hasn't started yet).
 */

const EventsDB = require('../../db/eventsDB.js');
const check = require('../../misc/authentication.js');
const { Permissions } = require('../../misc/permissions.js');
const FileCleanup = require('../../misc/FileCleanup.js');

/**
 * Admin API for managing events.
 * @module AdminEvents
 */
class AdminEvents {
    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all admin-level event management routes.
     */
    registerRoutes() {
        /**
         * Fetch paginated events list for admin dashboard.
         * Enforces scoping: users with scoped permissions only see events they are allowed to manage.
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

            // Check if user has global or scoped permission
            const hasAll = await Permissions.hasPermission(this.db, req.user.id, 'event.read.all') ||
                await Permissions.hasPermission(this.db, req.user.id, 'event.manage.all');

            if (!hasAll) {
                // Fetch list of tags this user is allowed to manage to filter the event list
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
         * Fetch event details by ID for administrative editing.
         */
        this.app.get('/api/admin/event/:id', check('perm:event.read.all | perm:event.manage.all | perm:event.read.scoped | perm:event.manage.scoped'), async (req, res) => {
            const result = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Create a new event.
         * Verifies that the admin has permission to use the tags they are assigning to the event.
         */
        this.app.post('/api/admin/event', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req, res) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, null, req.body.tags)) {
                return res.status(403).json({ message: 'Not authorized for these tags' });
            }
            const result = await EventsDB.createEvent(this.db, req.body);
            result.getResponse(res);
        });

        /**
         * Update an existing event.
         * Enforces scoping: the admin must have permission to manage this specific event.
         */
        this.app.put('/api/admin/event/:id', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req, res) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, req.params.id)) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            const result = await EventsDB.updateEvent(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        /**
         * Reset event image to default.
         */
        this.app.post('/api/admin/event/:id/reset-image', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req, res) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, req.params.id)) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            
            try {
                const event = await this.db.get('SELECT image_url FROM events WHERE id = ?', [req.params.id]);
                await this.db.run('UPDATE events SET image_url = NULL WHERE id = ?', [req.params.id]);
                
                if (event) await FileCleanup.checkAndDeleteIfUnused(this.db, event.image_url);
                
                res.json({ success: true, message: 'Image reset to default' });
            } catch (error) {
                res.status(500).json({ message: 'Database error' });
            }
        });

        /**
         * Cancel an event.
         * Triggers automatic refunds for all attendees who have paid.
         */
        this.app.post('/api/admin/event/:id/cancel', check('perm:event.write.all | perm:event.manage.all | perm:event.write.scoped | perm:event.manage.scoped'), async (req, res) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, req.params.id)) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            const result = await EventsDB.cancelEvent(this.db, req.params.id);
            return result.getResponse(res);
        });

        /**
         * Delete an event from the database.
         * Only permitted for future events. Past events should be archived or canceled instead.
         */
        this.app.delete('/api/admin/event/:id', check('perm:event.delete | perm:event.manage.all | perm:event.manage.scoped'), async (req, res) => {
            if (!await Permissions.canManageEvent(this.db, req.user.id, req.params.id)) {
                return res.status(403).json({ message: 'Not authorized for this event' });
            }
            const eventRes = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (eventRes.isError()) return eventRes.getResponse(res);

            // Safety check: Prevent deletion of events that have already started/happened
            if (new Date(eventRes.getData().start) < new Date()) {
                return res.status(400).json({ message: 'Cannot delete past events' });
            }

            const result = await EventsDB.deleteEvent(this.db, req.params.id);
            result.getResponse(res);
        });
    }
}

module.exports = AdminEvents;