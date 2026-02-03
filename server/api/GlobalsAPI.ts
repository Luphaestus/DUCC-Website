/**
 * GlobalsAPI.ts
 * 
 * This file handles system-wide configuration settings and broad user queries.
 */

import Globals from '../misc/globals.js';
import UserDB from '../db/userDB.js';
import check from '../misc/authentication.js';
import { Permissions } from '../misc/permissions.js';
import FileCleanup from '../misc/FileCleanup.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../db/db.js';

export default class GlobalsAPI {
    app: Express;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Express app.
     * @param {object} db - Database connection.
     */
    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all global configuration and global user lookup routes.
     */
    registerRoutes() {
        /**
         * Get President status.
         */
        this.app.get('/api/globals/status', check("perm:globals.manage"), (req: Request, res: Response) => {
            res.json({ isPresident: true });
        });

        /**
         * Fetch paginated users list for global settings / admin overview.
         */
        this.app.get('/api/globals/users', check('perm:globals.manage'), async (req: any, res: Response) => {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string || '';
            const sort = req.query.sort as string || 'last_name';
            const order = (req.query.order as 'asc' | 'desc') || 'asc';

            const inDebt = req.query.inDebt as string;
            const isMember = req.query.isMember as string;
            const difficulty = req.query.difficulty as string;

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
        this.app.get('/api/globals', check('perm:globals.manage'), async (req: Request, res: Response) => {
            const globals = new Globals().getAll();
            res.json({ res: globals });
        });

        /**
         * Fetch specific global settings by key.
         */
        this.app.get('/api/globals/:key', async (req: any, res: Response) => {
            let permission = 'Guest';

            if (req.user !== undefined) {
                if (await Permissions.hasPermission(this.db, req.user.id, 'globals.manage')) {
                    permission = 'President';
                } else {
                    permission = 'Authenticated';
                }
            }

            res.json({ res: new Globals().getKeys(req.params.key.split(','), permission) });
        });

        /**
         * Update a global setting.
         */
        this.app.post('/api/globals/:key', check('perm:globals.manage'), async (req: Request, res: Response) => {
            const key = req.params.key;
            const globals = new Globals();
            try {
                const config = globals.get(key);
                if (!config) throw new Error("Global key not found.");

                if (config.type === 'image' && (!req.body.value || req.body.value.trim() === '')) {
                    throw new Error("Image settings cannot be empty.");
                }

                if (key === 'DefaultEventImage') {
                    const oldVal = config.data;
                    globals.set(key, req.body.value);
                    if (oldVal !== req.body.value) {
                        await FileCleanup.checkAndDeleteIfUnused(this.db, oldVal);
                    }
                } else {
                    globals.set(key, req.body.value);
                }
            } catch (error: any) {
                return res.status(400).json({ message: error.message });
            }
            res.json({ success: true });
        });
    }
}
