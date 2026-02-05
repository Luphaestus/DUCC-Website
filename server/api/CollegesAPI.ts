/**
 * CollegesAPI.ts
 * 
 * This file handles routes for college-related data.
 */

import CollegesDB from '../db/collegesDB.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';

export default class CollegesAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers college-related routes.
     */
    registerRoutes() {
        /**
         * List all colleges.
         */
        this.app.get('/api/colleges', async (request: FastifyRequest, reply: FastifyReply) => {
            const result = await CollegesDB.getAll(this.db);
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });
    }
}