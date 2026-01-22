const CollegesDB = require('../db/collegesDB.js');

/**
 * API for fetching college names.
 * @module CollegesAPI
 */
class CollegesAPI {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers college-related routes.
     */
    registerRoutes() {
        /**
         * List all colleges.
         */
        this.app.get('/api/colleges', async (req, res) => {
            const result = await CollegesDB.getAll(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });
    }
}

module.exports = CollegesAPI;
