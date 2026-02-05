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

        /**
         * Add swims to a user account.
         */
        this.app.post('/api/user/:id/swims', { preHandler: [check('perm:swims.manage')] }, async (request: any, reply: FastifyReply) => {
            const userId = parseInt(request.params.id, 10);
            const count = parseInt(request.body.count, 10);
            if (isNaN(userId) || isNaN(count)) return reply.status(400).send({ message: 'Invalid data' });
            
            const status = await SwimsDB.addSwims(this.db, userId, count, request.user.id);
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
            const count = parseInt(request.body.count, 10);
            if (isNaN(userId) || isNaN(count)) return reply.status(400).send({ message: 'Invalid data' });

            const status = await SwimsDB.addBooties(this.db, userId, count);
            if (!status.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('swims_update', { userId });
            }
            return status.getResponse(reply);
        });
    }
}