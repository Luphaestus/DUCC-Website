const check = require('../../misc/authentication.js');
const CollegesDB = require('../../db/collegesDB.js');

/**
 * Admin API for managing colleges.
 * @module AdminColleges
 */
class AdminColleges {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers admin college routes.
     */
    registerRoutes() {
        /**
         * List all colleges.
         */
        this.app.get('/api/admin/colleges', check('perm:user.read | perm:user.manage'), async (req, res) => {
            const result = await CollegesDB.getAll(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });
    }
}

module.exports = AdminColleges;