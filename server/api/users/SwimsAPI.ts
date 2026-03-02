/**
 * SwimsAPI.ts
 * 
 * This file handles user "swims" records.
 */

import SwimsDB from '../../db/swimsDB.js';
import check from '../../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class SwimsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify application.
     * @param {object} db - Database connection.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all swim-related routes.
     */
    registerRoutes() {
        /**
         * Fetch swim leaderboard.
         */
        this.app.get('/api/user/swims/leaderboard', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const yearly = request.query.yearly === 'true';
            const status = await SwimsDB.getSwimsLeaderboard(this.db, yearly, request.user.id);
            return status.getResponse(reply);
        });

        this.app.get('/api/user/swims/users', { preHandler: [check('perm:swims.manage')] }, async (request: any, reply: FastifyReply) => {
            const search = String(request.query.search || '');
            const limit = parseInt(String(request.query.limit || '60'), 10);
            const status = await SwimsDB.searchSwimmers(this.db, search, limit);
            return status.getResponse(reply);
        });

        /**
         * Fetch swim history for a user.
         */
        this.app.get<{ Params: { id: string } }>('/api/user/:id/swims/history', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const userId = parseInt(request.params.id, 10);
            if (isNaN(userId)) return reply.status(400).send({ message: 'Invalid user ID' });
            const status = await SwimsDB.getSwimHistory(this.db, userId);
            return status.getResponse(reply);
        });

        this.app.get<{ Params: { id: string } }>('/api/user/:id/swims/stats', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const userId = parseInt(request.params.id, 10);
            if (isNaN(userId)) return reply.status(400).send({ message: 'Invalid user ID' });

            const [allTimeRes, yearlyRes] = await Promise.all([
                SwimsDB.getUserSwimmerRank(this.db, userId, false),
                SwimsDB.getUserSwimmerRank(this.db, userId, true)
            ]);

            if (allTimeRes.isError()) return allTimeRes.getResponse(reply);
            if (yearlyRes.isError()) return yearlyRes.getResponse(reply);

            return reply.send({
                data: {
                    yearly: yearlyRes.getData() || { rank: -1, swims: 0, booties: 0 },
                    allTime: allTimeRes.getData() || { rank: -1, swims: 0, booties: 0 }
                }
            });
        });

        this.app.get<{ Params: { id: string } }>('/api/user/:id/swims/pending-booties', { preHandler: [check('perm:swims.manage')] }, async (request: any, reply: FastifyReply) => {
            const userId = parseInt(request.params.id, 10);
            if (isNaN(userId)) return reply.status(400).send({ message: 'Invalid user ID' });
            const status = await SwimsDB.getPendingBootieSwims(this.db, userId);
            return status.getResponse(reply);
        });

        /**
         * Add swims to a user account.
         */
        this.app.post('/api/user/:id/swims', { preHandler: [check('perm:swims.manage')] }, async (request: any, reply: FastifyReply) => {
            const userId = parseInt(request.params.id, 10);
            const count = parseInt(request.body.count, 10);
            const message = request.body.message;

            if (isNaN(userId) || isNaN(count) || count < 1 || !message) {
                return reply.status(400).send({ message: 'Invalid data. Message is required.' });
            }

            const status = await SwimsDB.addSwims(this.db, userId, count, request.user.id, message);
            if (!status.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('swims_update', { userId });
            }
            return status.getResponse(reply);
        });

        /**
         * Add booties to a user account.
         */
        this.app.post('/api/user/:id/booties', { preHandler: [check('perm:swims.manage')] }, async (request: any, reply: FastifyReply) => {
            const userId = parseInt(request.params.id, 10);
            const swimIds = Array.isArray(request.body?.swimIds) ? request.body.swimIds : [];

            if (isNaN(userId) || swimIds.length === 0) {
                return reply.status(400).send({ message: 'Invalid data. Select at least one swim record.' });
            }

            const status = await SwimsDB.markSwimsAsBooties(this.db, userId, swimIds);
            if (!status.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('swims_update', { userId });
            }
            return status.getResponse(reply);
        });

        /**
         * Toggle bootie status for a specific swim.
         */
        this.app.post<{ Params: { swimId: string } }>('/api/user/swims/:swimId/bootie/toggle', { preHandler: [check('perm:swims.manage')] }, async (request: any, reply: FastifyReply) => {
            const swimId = parseInt(request.params.swimId, 10);
            if (isNaN(swimId)) return reply.status(400).send({ message: 'Invalid swim ID' });

            const mode = ['toggle', 'add', 'remove', 'set-all'].includes(String(request.body?.mode))
                ? request.body.mode
                : 'toggle';
            const amount = Math.max(1, parseInt(String(request.body?.amount || '1'), 10) || 1);

            const status = await SwimsDB.toggleBootie(this.db, swimId, { mode, amount });
            if (!status.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('swims_update', {}); // Broadcast to all since totals change
            }
            return status.getResponse(reply);
        });
    }
}