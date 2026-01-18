const Globals = require('../misc/globals.js');
const UserDB = require('../db/userDB.js');
const RolesDB = require('../db/rolesDB.js');
const check = require('../misc/authentication.js');
const { Permissions } = require('../misc/permissions.js');

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
        this.app.get('/api/globals/status', check("role:President"))

        /**
         * Fetch paginated users list for global settings.
         */
        this.app.get('/api/globals/users', check('role:President'), async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const sort = req.query.sort || 'last_name';
            const order = req.query.order || 'asc';

            const inDebt = req.query.inDebt;
            const isMember = req.query.isMember;
            const difficulty = req.query.difficulty;

            const userPerms = {
                canManageUsers: await Permissions.hasPermission(this.db, req.user.id, 'user.manage'),
                canManageTrans: await Permissions.hasPermission(this.db, req.user.id, 'transaction.manage'),
                canManageEvents: await Permissions.hasPermission(this.db, req.user.id, 'event.manage.all'),
                isScopedExec: await Permissions.hasPermission(this.db, req.user.id, 'event.manage.scoped')
            };

            const result = await UserDB.getUsers(this.db, userPerms, { page, limit, search, sort, order, inDebt, isMember, difficulty });
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Fetch all global settings.
         */
        this.app.get('/api/globals', check('role:President'), async (req, res) => {
            const globals = new Globals().getAll();

            // Inject current President ID
            const presidentRes = await RolesDB.getFirstUserIdByRoleName(this.db, 'President');
            if (!presidentRes.isError()) {
                globals['President'] = presidentRes.getData();
            }

            res.json({ res: globals });
        });

        /**
         * Fetch specific global settings by key.
         */

        this.app.get('/api/globals/:key', async (req, res) => {
            let permission = 'Guest';

            if (req.user !== undefined) {
                if (await Permissions.hasRole(this.db, req.user.id, 'President')) {
                    permission = 'President';
                } else {
                    permission = 'Authenticated';
                }
            }

            res.json({ res: new Globals().getKeys(req.params.key.split(','), permission) });
        });

        /**
         * Update global settings.
         */
        this.app.post('/api/globals/:key', check('role:President'), async (req, res) => {
            const key = req.params.key;
            const globals = new Globals();
            try {
                globals.set(key, req.body.value);
            } catch (error) {
                return res.status(400).json({ message: error.message });
            }
            res.json({ success: true });
        });
    }
}

module.exports = GlobalsAPI;