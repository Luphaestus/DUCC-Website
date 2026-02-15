/**
 * KeysAPI.ts
 * 
 * This file handles administration of boatshed keys.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import check from '../../misc/authentication.js';
import KeysDB from '../../db/keysDB.js';
import Logger from '../../misc/Logger.js';

export default class KeysAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * Get all keys (Available to all authenticated users).
         */
        this.app.get('/api/keys', { preHandler: [check()] }, async (request, reply) => {
            const status = await KeysDB.getKeys(this.db);
            if (status.isError()) return status.getResponse(reply);
            return reply.send(status.getData());
        });

        /**
         * Get all keys (Admin alias).
         */
        this.app.get('/api/admin/keys', { preHandler: [check('keys.manage')] }, async (request, reply) => {
            const status = await KeysDB.getKeys(this.db);
            if (status.isError()) return status.getResponse(reply);
            return reply.send(status.getData());
        });

        /**
         * Get current user's keys.
         */
        this.app.get('/api/keys/me', { preHandler: [check()] }, async (request: any, reply) => {
            const userId = request.user.id;
            const keys = await this.db.all('SELECT id FROM `keys` WHERE holder_id = ? AND is_deleted = 0', [userId]);
            return reply.send({ keys });
        });

        /**
         * Create a new key (defaults to current user's position).
         */
        this.app.post('/api/admin/keys', { preHandler: [check('keys.manage')] }, async (request: any, reply: FastifyReply) => {
            const holderId = request.user.id;
            const status = await KeysDB.createKey(this.db, holderId);
            return status.getResponse(reply);
        });

        /**
         * Transfer a key to another user or to the club (holderId = null).
         * If the user doesn't have 'keys.manage', they must be the current holder.
         */
        this.app.post<{ Params: { id: string }, Body: { holderId: number | null } }>('/api/admin/keys/:id/transfer', { preHandler: [check()] }, async (request: any, reply) => {
            const keyId = parseInt(request.params.id);
            const { holderId } = request.body;

            if (isNaN(keyId)) return reply.status(400).send({ message: 'Invalid Key ID.' });

            try {
                const canManage = await (await import('../../misc/permissions.js')).Permissions.hasPermission(this.db, request.user.id, 'keys.manage');
                
                if (!canManage) {
                    // Check ownership
                    const key = await this.db.get('SELECT holder_id FROM `keys` WHERE id = ?', [keyId]);
                    if (!key || key.holder_id !== request.user.id) {
                        return reply.status(403).send({ message: 'You can only transfer keys that you currently hold.' });
                    }
                }

                const status = await KeysDB.transferKey(this.db, keyId, holderId, request.user.id);
                return status.getResponse(reply);
            } catch (e: any) {
                return reply.status(500).send({ message: e.message });
            }
        });

        /**
         * Get key transfer logs.
         */
        this.app.get('/api/admin/keys/logs', { preHandler: [check('keys.manage')] }, async (request, reply) => {
            const status = await KeysDB.getKeyLogs(this.db);
            if (status.isError()) return status.getResponse(reply);
            return reply.send(status.getData());
        });

        /**
         * Delete a key.
         */
        this.app.delete<{ Params: { id: string } }>('/api/admin/keys/:id', { preHandler: [check('keys.manage')] }, async (request: any, reply) => {
            const keyId = parseInt(request.params.id);
            if (isNaN(keyId)) return reply.status(400).send({ message: 'Invalid Key ID.' });

            const status = await KeysDB.deleteKey(this.db, keyId, request.user.id);
            return status.getResponse(reply);
        });
    }
}
