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
            if (req.isAuthenticated()) {
                res.json({ loggedIn: true });
            } else {
                res.json({ loggedIn: false });
            }
        });

        this.app.get('/api/user/fname', async (req, res) => {
            const firstName = await UserDB.getFirstName(req, this.db);
            const errorResponse = errorCodetoResponse(firstName);
            if (errorResponse) {
                return res.status(errorResponse.status).json({ error: errorResponse.message });
            }
            res.json({ firstName });
        });
    }
}

module.exports = User;