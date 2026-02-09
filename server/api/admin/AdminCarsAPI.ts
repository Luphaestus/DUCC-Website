/**
 * AdminCarsAPI.ts
 * 
 * Administrative routes for driver moderation and car management.
 */

import CarsDB from '../../db/carsDB.js';
import checkAuthentication from '../../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminCarsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch all drivers for an event. */
        this.app.get<{ Params: { eventId: string } }>('/api/admin/events/:eventId/drivers', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { eventId } = request.params;
            const status = await CarsDB.getEventDrivers(this.db, eventId);
            return status.getResponse(reply);
        });

        /** Moderate a driver volunteer. */
        this.app.post<{ Params: { id: string }, Body: { status: string } }>('/api/admin/drivers/:id/status', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { id } = request.params;
            const { status } = request.body;

            if (!['accepted', 'declined', 'pending'].includes(status)) {
                return reply.status(400).send({ message: 'Invalid status.' });
            }

            const response = await CarsDB.updateDriverStatus(this.db, id, status);
            return response.getResponse(reply);
        });
    }
}