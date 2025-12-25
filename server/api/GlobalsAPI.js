const Globals = require('../misc/globals.js');
const { statusObject } = require('../misc/status.js');
const bcrypt = require('bcrypt');
const UserDB = require('../db/userDB.js');

/**
 * Helper function to check if the current user is the President.
 * The President is a special administrative role with access to global configuration.
 * @param {object} req - The Express request object.
 * @returns {statusObject} 200 if President, 403 otherwise.
 */
function isPresident(req) {
    if (req.user && new Globals().getInt('President') === req.user.id) {
        return new statusObject(200);
    } else {
        return new statusObject(403, 'User does not have authorization to access this resource');
    }
}

/**
 * Globals API module.
 * Manages system-wide configuration settings (globals).
 * Most endpoints are restricted to the President.
 *
 * Routes:
 * GET  /api/globals/status -> Checks if current user is the President.
 * GET  /api/globals/users  -> Returns a list of all users (for President to reassign roles).
 * GET  /api/globals       -> Returns all global settings.
 * GET  /api/globals/:key  -> Returns specific global setting(s).
 * POST /api/globals/:key -> Updates global setting(s).
 *
 * @module GlobalsAPI
 */
class GlobalsAPI {
    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all global-related routes.
     */
    registerRoutes() {
        /**
         * GET /api/globals/status
         * Returns whether the current user is the President.
         */
        this.app.get('/api/globals/status', (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError())
                res.json({ isPresident: false });
            else {
                res.json({ isPresident: true });
            }
        });

        /**
         * GET /api/globals/users
         * Fetches a simplified list of all users for selection in global settings (e.g., choosing a new President).
         * Restricted to President.
         */
        this.app.get('/api/globals/users', async (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            try {
                const users = await this.db.all('SELECT id, first_name, last_name FROM users ORDER BY first_name ASC, last_name ASC');
                res.json({ users });
            } catch (err) {
                console.error('Error fetching users for globals:', err);
                res.status(500).json({ message: 'Database error' });
            }
        });

        /**
         * GET /api/globals
         * Returns all global configuration variables.
         * Restricted to President.
         */
        this.app.get('/api/globals', (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            res.json({ res: new Globals().getAll() });
        });

        /**
         * GET /api/globals/:key
         * Returns one or more global variables specified by key (comma-separated).
         * Restricted to President.
         */
        this.app.get('/api/globals/:key', async (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            const keys = req.params.key.split(',');
            const result = {};

            for (const key of keys) {
                result[key] = new Globals().get(key);
            }

            res.json({ res: result });
        });

        /**
         * GET /api/globals/public/:key
         * Returns specific global setting(s) that are safe for the public/regular users to see.
         * Allowed keys: MembershipCost, MinMoney, Unauthorized_max_difficulty.
         */
        this.app.get('/api/globals/public/:key', async (req, res) => {
            const allowedKeys = ['MembershipCost', 'MinMoney', 'Unauthorized_max_difficulty'];
            const keys = req.params.key.split(',');
            const result = {};
            const globals = new Globals();

            for (const key of keys) {
                if (allowedKeys.includes(key)) {
                    result[key] = globals.get(key);
                }
            }

            res.json({ res: result });
        });

        /**
         * POST /api/globals/:key
         * Updates global variable(s).
         * Special handling for:
         * - 'Unauthorized_max_difficulty': Must be 1-5.
         * - 'President': Requires current user's password for verification and triggers a permission reset.
         * Restricted to President.
         */
        this.app.post('/api/globals/:key', async (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            const key = req.params.key;
            const globals = new Globals();

            if (req.body.value !== undefined) {
                // Validation for max difficulty setting
                if (key === 'Unauthorized_max_difficulty') {
                    const val = parseInt(req.body.value);
                    if (isNaN(val) || val < 1 || val > 5) {
                        return new statusObject(400, 'Unauthorized_max_difficulty must be an integer between 1 and 5').getResponse(res);
                    }
                }

                // Security check and logic for changing the President
                if (key === 'President') {
                    if (!req.body.password) {
                        return new statusObject(400, 'Password is required to change President').getResponse(res);
                    }
                    try {
                        const isMatch = await bcrypt.compare(req.body.password, req.user.hashed_password);
                        if (!isMatch) {
                            return new statusObject(403, 'Incorrect password').getResponse(res);
                        }

                        // Reset permissions for all users when President changes to ensure integrity
                        const resetStatus = await UserDB.resetPermissions(this.db, req.body.value);
                        if (resetStatus.isError()) {
                            return resetStatus.getResponse(res);
                        }
                    } catch (err) {
                        console.error('Error verifying password:', err);
                        return new statusObject(500, 'Internal server error').getResponse(res);
                    }
                }

                globals.set(key, req.body.value);
                res.json({ message: `Global variable '${key}' updated successfully.` });
            } else if (typeof req.body === 'object' && req.body !== null) {
                // Bulk update if value is not explicitly provided but body is an object
                for (const k in req.body) {
                    globals.set(k, req.body[k]);
                }
                res.json({ message: `Global variables updated successfully.` });
            } else {
                return new statusObject(400, 'Invalid request body').getResponse(res);
            }
        });

    }
}

module.exports = GlobalsAPI;