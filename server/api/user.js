UserDB = require('../db/userDB.js');
errorCodetoResponse = require('../misc/error.js');

class User {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
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