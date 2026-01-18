const SwimsDB = require('../../db/swimsDB.js');
const check = require('../../misc/authentication');

class SwimsAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * Fetch swim leaderboard (all-time or yearly).
         */
        this.app.get('/api/user/swims/leaderboard', check(), async (req, res) => {
            const yearly = req.query.yearly === 'true';
            const status = await SwimsDB.getSwimsLeaderboard(this.db, yearly);
            return status.getResponse(res);
        });

        /**
         * Add swims to a user.
         */
        this.app.post('/api/user/:id/swims', check('perm:swims.manage'), async (req, res) => {
            const userId = parseInt(req.params.id, 10);
            const count = parseInt(req.body.count, 10);
            if (isNaN(userId) || isNaN(count)) return res.status(400).json({ message: 'Invalid data' });
            const status = await SwimsDB.addSwims(this.db, userId, count, req.user.id);
            return status.getResponse(res);
        });
    }
}

module.exports = SwimsAPI;