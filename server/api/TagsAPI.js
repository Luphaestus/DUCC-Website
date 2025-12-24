const TagsDB = require('../db/tagsDB.js');
const { statusObject } = require('../misc/status.js');
const check = require('../misc/authentication.js');

/**
 * Tags API module.
 * Manages event tags and user whitelists for restricted events.
 * Tags can be used to categorize events or restrict them to specific groups of users.
 * 
 * Routes:
 *   GET    /api/tags                  -> Returns all available tags.
 *   POST   /api/tags                  -> Creates a new tag (Admin only).
 *   PUT    /api/tags/:id              -> Updates a tag (Admin only).
 *   DELETE /api/api/tags/:id          -> Deletes a tag (Admin only).
 *   GET    /api/tags/:id/whitelist    -> Returns the list of users whitelisted for a tag (Admin only).
 *   POST   /api/tags/:id/whitelist    -> Adds a user to a tag whitelist (Admin only).
 *   DELETE /api/tags/:id/whitelist/:userId -> Removes a user from a tag whitelist (Admin only).
 *   GET    /api/user/:userId/tags     -> Returns tags associated with a specific user.
 *   GET    /api/user/tags             -> Returns tags associated with the current user.
 *
 * @module TagsAPI
 */
class TagsAPI {
    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all tag-related routes.
     */
    registerRoutes() {
        /**
         * GET /api/tags
         * Retrieves all tags from the database.
         */
        this.app.get('/api/tags', async (req, res) => {
            const result = await TagsDB.getAllTags(this.db);
            result.getResponse(res);
        });

        /**
         * POST /api/tags
         * Creates a new tag.
         * Requires admin permissions.
         */
        this.app.post('/api/tags', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.createTag(this.db, req.body);
            result.getResponse(res);
        });

        /**
         * PUT /api/tags/:id
         * Updates an existing tag by ID.
         * Requires admin permissions.
         */
        this.app.put('/api/tags/:id', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.updateTag(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        /**
         * DELETE /api/tags/:id
         * Deletes a tag by ID.
         * Requires admin permissions.
         */
        this.app.delete('/api/tags/:id', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.deleteTag(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * GET /api/tags/:id/whitelist
         * Retrieves the list of users who are whitelisted for a specific tag.
         * Requires admin permissions.
         */
        this.app.get('/api/tags/:id/whitelist', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.getWhitelist(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * POST /api/tags/:id/whitelist
         * Adds a user to the whitelist for a specific tag.
         * Requires admin permissions.
         */
        this.app.post('/api/tags/:id/whitelist', check('can_manage_events | can_manage_users'), async (req, res) => {
            const { userId } = req.body;
            const result = await TagsDB.addToWhitelist(this.db, req.params.id, userId);
            result.getResponse(res);
        });

        /**
         * DELETE /api/tags/:id/whitelist/:userId
         * Removes a user from the whitelist for a specific tag.
         * Requires admin permissions.
         */
        this.app.delete('/api/tags/:id/whitelist/:userId', check('can_manage_events | can_manage_users'), async (req, res) => {
            const result = await TagsDB.removeFromWhitelist(this.db, req.params.id, req.params.userId);
            result.getResponse(res);
        });

        /**
         * GET /api/user/:userId/tags
         * Retrieves tags for a specific user.
         * Allowed for the user themselves or an admin.
         */
        this.app.get('/api/user/:userId/tags', check(), async (req, res) => {
            // Authorization check: User must be requesting their own tags or be a user manager
            if (req.user.id != req.params.userId && !req.user.can_manage_users) {
                return res.status(403).json({ message: 'Forbidden' });
            }

            try {
                const tags = await TagsDB.getTagsForUser(this.db, req.params.userId);
                res.json(tags);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        /**
         * GET /api/user/tags
         * Retrieves tags for the currently authenticated user.
         */
        this.app.get('/api/user/tags', check(), async (req, res) => {
            try {
                const tags = await TagsDB.getTagsForUser(this.db, req.user.id);
                res.json(tags);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
    }
}

module.exports = TagsAPI;

