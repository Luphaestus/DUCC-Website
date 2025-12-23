const Globals = require('../misc/globals.js');
const { statusObject } = require('../misc/status.js');
const bcrypt = require('bcrypt');
const UserDB = require('../db/userDB.js');

function isPresident(req) {
    if (req.user && new Globals().getInt('President') === req.user.id) {
        return new statusObject(200);
    } else {
        return new statusObject(403, 'User does not have authorization to access this resource');
    }
}


class GlobalsAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all event-related routes.
     */
    registerRoutes() {
        this.app.get('/api/globals/status', (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError())
                res.json({ isPresident: false });
            else {
                res.json({ isPresident: true });
            }
        });

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

        this.app.get('/api/globals', (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            res.json({ res: new Globals().getAll() });
        });

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

        this.app.post('/api/globals/:key', async (req, res) => {
            const isPres = isPresident(req);
            if (isPres.isError()) return isPres.getResponse(res);

            const key = req.params.key;
            const globals = new Globals();

            if (req.body.value !== undefined) {
                if (key === 'Unauthorized_max_difficulty') {
                    const val = parseInt(req.body.value);
                    if (isNaN(val) || val < 1 || val > 5) {
                        return new statusObject(400, 'Unauthorized_max_difficulty must be an integer between 1 and 5').getResponse(res);
                    }
                }

                if (key === 'President') {
                    if (!req.body.password) {
                        return new statusObject(400, 'Password is required to change President').getResponse(res);
                    }
                    try {
                        const isMatch = await bcrypt.compare(req.body.password, req.user.hashed_password);
                        if (!isMatch) {
                            return new statusObject(403, 'Incorrect password').getResponse(res);
                        }

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