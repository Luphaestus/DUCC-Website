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
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';
import FilesDB from '../db/filesDB.js';

export default class GlobalsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify app.
     * @param {object} db - Database connection.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
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
        this.app.get('/api/globals/status', { preHandler: [check("perm:globals.manage")] }, async (request: FastifyRequest, reply: FastifyReply) => {
            return reply.send({ isPresident: true });
        });

        /**
         * Fetch paginated users list for global settings / admin overview.
         */
        this.app.get('/api/globals/users', { preHandler: [check('perm:globals.manage')] }, async (request: any, reply: FastifyReply) => {
            const page = parseInt(request.query.page as string) || 1;
            const limit = parseInt(request.query.limit as string) || 10;
            const search = request.query.search as string || '';
            const sort = request.query.sort as string || 'last_name';
            const order = (request.query.order as 'asc' | 'desc') || 'asc';

            const inDebt = request.query.inDebt as string;
            const isMember = request.query.isMember as string;
            const difficulty = request.query.difficulty as string;

            const userPerms = {
                canManageUsers: await Permissions.hasPermission(this.db, request.user.id, 'user.manage'),
                canManageTrans: await Permissions.hasPermission(this.db, request.user.id, 'transaction.manage'),
                canManageEvents: await Permissions.hasPermission(this.db, request.user.id, 'event.manage.all'),
                isScopedExec: await Permissions.hasPermission(this.db, request.user.id, 'event.manage.scoped')
            };

            const result = await UserDB.getUsers(this.db, userPerms, { page, limit, search, sort, order, inDebt, isMember, difficulty });
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        /**
         * Fetch all global settings.
         */
        this.app.get('/api/globals', { preHandler: [check('perm:globals.manage')] }, async (request: FastifyRequest, reply: FastifyReply) => {
            const globals = new Globals().getAll();
            return reply.send({ res: globals });
        });

        /**
         * Fetch specific global settings by key.
         */
        this.app.get('/api/globals/:key', async (request: any, reply: FastifyReply) => {
            let permission = 'Guest';

            if (request.user) {
                if (await Permissions.hasPermission(this.db, request.user.id, 'globals.manage')) {
                    permission = 'President';
                } else {
                    permission = 'Authenticated';
                }
            }

            return reply.send({ res: new Globals().getKeys(request.params.key.split(','), permission) });
        });

        /**
         * Update a global setting.
         */
        this.app.post<{ Params: { key: string }, Body: { value: string | number } }>('/api/globals/:key', { preHandler: [check('perm:globals.manage')] }, async (request, reply) => {
            const key = request.params.key;
            const globals = new Globals();
            try {
                const config = globals.get(key);
                if (!config) throw new Error("Global key not found.");

                let newValue = request.body.value;

                if (config.type === 'image') {
                    if (!newValue) throw new Error("Image settings cannot be empty.");
                    
                    // If we got an ID, resolve it to a URL
                    if (typeof newValue === 'number') {
                        const fileStatus = await FilesDB.getFileById(this.db, newValue);
                        if (fileStatus.isError()) throw new Error("Image file not found.");
                        newValue = `/api/files/${newValue}/download?view=true`;
                    }
                }

                if (key === 'DefaultEventImage') {
                    const oldVal = config.data;
                    globals.set(key, newValue);
                    if (oldVal !== newValue) {
                        await FileCleanup.checkAndDeleteIfUnused(this.db, oldVal);
                    }
                } else {
                    globals.set(key, newValue);
                }
            } catch (error: any) {
                return reply.status(400).send({ message: error.message });
            }
            return reply.send({ success: true });
        });
    }
}