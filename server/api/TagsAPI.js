/**
 * TagsAPI.js
 * 
 * This file handles all event tag management routes, including metadata and user whitelists.
 * 
 * Routes:
 * - GET /api/tags: Fetch all available tags.
 * - POST /api/tags: Create a new tag (Exec only).
 * - PUT /api/tags/:id: Update tag metadata.
 * - DELETE /api/tags/:id: Remove a tag.
 * 
 * Whitelist/Manager Routes:
 * - GET /api/tags/:id/whitelist: Fetch whitelisted users for a tag.
 * - POST /api/tags/:id/whitelist: Add user to tag whitelist.
 * - DELETE /api/tags/:id/whitelist/:userId: Remove user from whitelist.
 * - GET /api/tags/:id/managers: Fetch tag managers.
 * - POST /api/tags/:id/managers: Add tag manager.
 * - DELETE /api/tags/:id/managers/:userId: Remove tag manager.
 * 
 * User Tag Lookups:
 * - GET /api/user/:userId/tags: Fetch tags associated with a specific user.
 * - GET /api/user/tags: Fetch tags for the currently logged-in user.
 */

const TagsDB = require('../db/tagsDB.js');
const check = require('../misc/authentication.js');

/**
 * API for managing event tags and user whitelists.
 * @module TagsAPI
 */
class TagsAPI {
    /**
     * @param {object} app - Express app instance.
     * @param {object} db - Database connection.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all tag-related management and lookup routes.
     */
    registerRoutes() {
        /**
         * Fetch all tags.
         */
        this.app.get('/api/tags', async (req, res) => {
            const result = await TagsDB.getAllTags(this.db);
            result.getResponse(res);
        });

        /**
         * Create a new tag.
         * Requires broad event or user management permissions.
         */
        this.app.post('/api/tags', check('perm:event.write.all | perm:manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.createTag(this.db, req.body);
            result.getResponse(res);
        });

        /**
         * Update an existing tag.
         */
        this.app.put('/api/tags/:id', check('perm:event.manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.updateTag(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        /**
         * Delete a tag.
         */
        this.app.delete('/api/tags/:id', check('perm:event.manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.deleteTag(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * Fetch whitelisted users for a tag.
         */
        this.app.get('/api/tags/:id/whitelist', check('perm:event.manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.getWhitelist(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * Add a user to a tag's whitelist.
         */
        this.app.post('/api/tags/:id/whitelist', check('perm:event.manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.addToWhitelist(this.db, req.params.id, req.body.userId);
            result.getResponse(res);
        });

        /**
         * Remove a user from a tag's whitelist.
         */
        this.app.delete('/api/tags/:id/whitelist/:userId', check('perm:event.manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.removeFromWhitelist(this.db, req.params.id, req.params.userId);
            result.getResponse(res);
        });

        /**
         * Fetch managers for a tag.
         * Managers can potentially manage events associated with this specific tag.
         */
        this.app.get('/api/tags/:id/managers', check('perm:event.manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.getManagers(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * Assign a manager to a tag.
         */
        this.app.post('/api/tags/:id/managers', check('perm:event.manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.addManager(this.db, req.params.id, req.body.userId);
            result.getResponse(res);
        });

        /**
         * Remove a manager from a tag.
         */
        this.app.delete('/api/tags/:id/managers/:userId', check('perm:event.manage.all | perm:user.manage'), async (req, res) => {
            const result = await TagsDB.removeManager(this.db, req.params.id, req.params.userId);
            result.getResponse(res);
        });

        /**
         * Fetch tags for a specific user.
         * Allows personal lookup or admin lookup.
         */
        this.app.get('/api/user/:userId/tags', check(), async (req, res) => {
            // Only allow self-lookup unless user has 'user.manage' permission
            if (req.user.id != req.params.userId) {
                const { Permissions } = require('../misc/permissions.js');
                if (!await Permissions.hasPermission(this.db, req.user.id, 'user.manage')) {
                    return res.status(403).json({ message: 'Forbidden' });
                }
            }

            try {
                const tags = await TagsDB.getTagsForUser(this.db, req.params.userId);
                res.json(tags);
            } catch (error) {
                res.status(500).json({ message: 'Internal error' });
            }
        });

        /**
         * Fetch tags for current authenticated user.
         */
        this.app.get('/api/user/tags', check(), async (req, res) => {
            try {
                const tags = await TagsDB.getTagsForUser(this.db, req.user.id);
                res.json(tags);
            } catch (error) {
                res.status(500).json({ message: 'Internal error' });
            }
        });
    }
}

module.exports = TagsAPI;