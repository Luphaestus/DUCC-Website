const TagsDB = require('../db/tagsDB.js');
const { statusObject } = require('../misc/status.js');
const check = require('../misc/authentication.js');

/**
 * API for managing event tags and user whitelists.
 * @module TagsAPI
 */
class TagsAPI {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers tag-related routes.
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
         * Create a new tag (Admin).
         */
        this.app.post('/api/tags', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.createTag(this.db, req.body);
            result.getResponse(res);
        });

        /**
         * Update a tag (Admin).
         */
        this.app.put('/api/tags/:id', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.updateTag(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        /**
         * Delete a tag (Admin).
         */
        this.app.delete('/api/tags/:id', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.deleteTag(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * Fetch whitelisted users for a tag (Admin).
         */
        this.app.get('/api/tags/:id/whitelist', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.getWhitelist(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * Add user to a tag whitelist (Admin).
         */
        this.app.post('/api/tags/:id/whitelist', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.addToWhitelist(this.db, req.params.id, req.body.userId);
            result.getResponse(res);
        });

        /**
         * Remove user from a tag whitelist (Admin).
         */
        this.app.delete('/api/tags/:id/whitelist/:userId', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.removeFromWhitelist(this.db, req.params.id, req.params.userId);
            result.getResponse(res);
        });

        /**
         * Fetch tags for a specific user.
         */
        this.app.get('/api/user/:userId/tags', check(), async (req, res) => {
            if (req.user.id != req.params.userId && !req.user.can_manage_users) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            try {
                const tags = await TagsDB.getTagsForUser(this.db, req.params.userId);
                res.json(tags);
            } catch (error) {
                res.status(500).json({ message: 'Internal error' });
            }
        });

        /**
         * Fetch tags for current user.
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