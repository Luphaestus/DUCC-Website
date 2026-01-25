/**
 * SwimsAPI.js
 * 
 * This file handles user "swims" records.
 */

const SwimsDB = require('../../db/swimsDB.js');
const check = require('../../misc/authentication');

class SwimsAPI {
    /**
     * @param {object} app - Express application.
     * @param {object} db - Database connection.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all swim-related routes.
     */
    registerRoutes() {
        /**
         * Fetch swim leaderboard.
         */
        this.app.get('/api/user/swims/leaderboard', check(), async (req, res) => {
            const yearly = req.query.yearly === 'true';
            const status = await SwimsDB.getSwimsLeaderboard(this.db, yearly, req.user.id);
            return status.getResponse(res);
        });

        /**
         * Add swims to a user account.
         */
        this.app.post('/api/user/:id/swims', check('perm:swims.manage'), async (req, res) => {
            const userId = parseInt(req.params.id, 10);
            const count = parseInt(req.body.count, 10);
            if (isNaN(userId) || isNaN(count)) return res.status(400).json({ message: 'Invalid data' });
            
            const status = await SwimsDB.addSwims(this.db, userId, count, req.user.id);
            return status.getResponse(res);
        });

        /**
         * Add booties to a user account.
         */
        this.app.post('/api/user/:id/booties', check('perm:swims.manage'), async (req, res) => {
            const userId = parseInt(req.params.id, 10);
            const count = parseInt(req.body.count, 10);
            if (isNaN(userId) || isNaN(count)) return res.status(400).json({ message: 'Invalid data' });

            const status = await SwimsDB.addBooties(this.db, userId, count);
            return status.getResponse(res);
        });
    }
}

module.exports = SwimsAPI;