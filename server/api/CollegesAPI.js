/**
 * CollegesAPI.js
 * 
 * This file handles routes for college-related data.
 */

const CollegesDB = require('../db/collegesDB.js');

class CollegesAPI {
    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database connection instance.
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