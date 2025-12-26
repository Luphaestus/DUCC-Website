const Globals = require('../misc/globals.js');
const { statusObject } = require('../misc/status.js');
const bcrypt = require('bcrypt');
const UserDB = require('../db/userDB.js');

/**
 * Check if user is President.
 * @param {object} req
 * @returns {statusObject}
 */
function isPresident(req) {
    if (req.user && new Globals().getInt('President') === req.user.id) {
        return new statusObject(200);
    } else {
        return new statusObject(403, 'User not authorized');
    }
}

/**
 * API for system-wide configuration.
 * @module GlobalsAPI
 */
class GlobalsAPI {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers globals routes.
     */
    registerRoutes() {
        /**
         * Get President status.
         */
        this.app.get('/api/globals/status', (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) res.json({ isPresident: false });
            else res.json({ isPresident: true });
        });

        /**
         * Fetch users list for global settings (President only).
         */
        this.app.get('/api/globals/users', async (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            try {
                const users = await this.db.all('SELECT id, first_name, last_name FROM users ORDER BY first_name ASC, last_name ASC');
                res.json({ users });
            } catch (err) {
                res.status(500).json({ message: 'Database error' });
            }
        });

        /**
         * Fetch all global settings (President only).
         */
        this.app.get('/api/globals', (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);
            res.json({ res: new Globals().getAll() });
        });

        /**
         * Fetch specific global settings by key (President only).
         */
        this.app.get('/api/globals/:key', async (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            const keys = req.params.key.split(',');
            const result = {};
            for (const key of keys) result[key] = new Globals().get(key);
            res.json({ res: result });
        });

        /**
         * Fetch whitelisted global settings (Public).
         */
        this.app.get('/api/globals/public/:key', async (req, res) => {
            const allowedKeys = ['MembershipCost', 'MinMoney', 'Unauthorized_max_difficulty'];
            const keys = req.params.key.split(',');
            const result = {};
            const globals = new Globals();

            for (const key of keys) {
                if (allowedKeys.includes(key)) result[key] = globals.get(key);
            }
            res.json({ res: result });
        });

        /**
         * Update global settings (President only).
         */
        this.app.post('/api/globals/:key', async (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            const key = req.params.key;
            const globals = new Globals();

            if (req.body.value !== undefined) {
                if (key === 'Unauthorized_max_difficulty') {
                    const val = parseInt(req.body.value);
                    if (isNaN(val) || val < 1 || val > 5) {
                        return new statusObject(400, 'Must be an integer between 1 and 5').getResponse(res);
                    }
                }

                if (key === 'President') {
                    if (!req.body.password) return new statusObject(400, 'Password required').getResponse(res);
                    try {
                        const isMatch = await bcrypt.compare(req.body.password, req.user.hashed_password);
                        if (!isMatch) return new statusObject(403, 'Incorrect password').getResponse(res);
                        const resetStatus = await UserDB.resetPermissions(this.db, req.body.value);
                        if (resetStatus.isError()) return resetStatus.getResponse(res);
                    } catch (err) {
                        return new statusObject(500, 'Internal error').getResponse(res);
                    }
                }

                globals.set(key, req.body.value);
                res.json({ message: `Global '${key}' updated.` });
            } else if (typeof req.body === 'object' && req.body !== null) {
                for (const k in req.body) globals.set(k, req.body[k]);
                res.json({ message: 'Globals updated.' });
            } else {
                return new statusObject(400, 'Invalid body').getResponse(res);
            }
        });
    }
}

module.exports = GlobalsAPI;