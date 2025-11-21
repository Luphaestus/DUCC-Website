UserDB = require('../db/userDB.js');
errorCodetoResponse = require('../misc/error.js');


/**
 * Routes:
 *   GET  /api/user/loggedin -> { loggedIn: boolean }
 *   GET  /api/user/fname    -> { firstName: string }
 *
 * @module User
 */
class User {

    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        this.app.get('/api/user/loggedin', (req, res) => {
            res.json({ loggedIn: req.isAuthenticated() });
        });

        this.app.get('/api/user/name', async (req, res) => {
            const name = await UserDB.getName(req, this.db);
            const errorResponse = errorCodetoResponse(name);
            if (errorResponse) {
                return res.status(errorResponse.status).json({ error: errorResponse.message });
            }
            res.json({ name });
        });

        this.app.get('/api/user/profile', async (req, res) => {
            const profileData = await UserDB.getProfile(req, this.db);
            const errorResponse = errorCodetoResponse(profileData);
            if (errorResponse) {
                return res.status(errorResponse.status).json({ error: errorResponse.message });
            }
            res.json(profileData);
        });

        this.app.get('/api/users/', async (req, res) => {
            const users = await UserDB.getUsers(req, this.db);
            const errorResponse = errorCodetoResponse(users);
            if (errorResponse) {
                return res.status(errorResponse.status).json({ error: errorResponse.message });
            }
            res.json({ users });
        });

        this.app.get('/api/user/legalinfo', async (req, res) => {
            const legalInfo = await UserDB.getLegalInfo(req, this.db);
            const errorResponse = errorCodetoResponse(legalInfo);
            if (errorResponse) {
                return res.status(errorResponse.status).json({ error: errorResponse.message });
            }
            res.json({ legalInfo });
        });

        this.app.post('/api/user/legalinfo', async (req, res) => {
            const error = await UserDB.setLegalInfo(req, this.db);
            const errorResponse = errorCodetoResponse(error);
            if (errorResponse) {
                console.error('Error in /api/user/legalinfo:', errorResponse);
                return res.status(errorResponse.status).json({ error: errorResponse.message });
            }
            res.json({ success: true });
        });
    }
}

module.exports = User;