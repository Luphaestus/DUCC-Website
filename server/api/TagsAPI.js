const TagsDB = require('../db/tagsDB.js');
const { statusObject } = require('../misc/status.js');

class TagsAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        const checkAdmin = (req, res, next) => {
            if (!req.isAuthenticated() || !req.user.can_manage_events) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
            next();
        };

        this.app.get('/api/tags', async (req, res) => {
            const result = await TagsDB.getAllTags(this.db);
            result.getResponse(res);
        });

        this.app.post('/api/tags', checkAdmin, async (req, res) => {
            const result = await TagsDB.createTag(this.db, req.body);
            result.getResponse(res);
        });

        this.app.put('/api/tags/:id', checkAdmin, async (req, res) => {
            const result = await TagsDB.updateTag(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        this.app.delete('/api/tags/:id', checkAdmin, async (req, res) => {
            const result = await TagsDB.deleteTag(this.db, req.params.id);
            result.getResponse(res);
        });

        this.app.get('/api/tags/:id/whitelist', checkAdmin, async (req, res) => {
            const result = await TagsDB.getWhitelist(this.db, req.params.id);
            result.getResponse(res);
        });

        this.app.post('/api/tags/:id/whitelist', checkAdmin, async (req, res) => {
            const { userId } = req.body;
            const result = await TagsDB.addToWhitelist(this.db, req.params.id, userId);
            result.getResponse(res);
        });

        this.app.delete('/api/tags/:id/whitelist/:userId', checkAdmin, async (req, res) => {
            const result = await TagsDB.removeFromWhitelist(this.db, req.params.id, req.params.userId);
            result.getResponse(res);
        });
    }
}

module.exports = TagsAPI;
