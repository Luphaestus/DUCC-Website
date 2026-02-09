/**
 * CarsAPI.ts
 * 
 * Public and member routes for car management and driver volunteering.
 */

import CarsDB from '../db/carsDB.js';
import { Permissions } from '../misc/permissions.js';
import checkAuthentication from '../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';

export default class CarsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch cars available to the current user (personal + global). */
        this.app.get('/api/cars', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const status = await CarsDB.getCars(this.db, request.user.id);
            return status.getResponse(reply);
        });

        /** Fetch drivers for an event (Member view). */
        this.app.get<{ Params: { eventId: string } }>('/api/events/:eventId/drivers', { preHandler: [checkAuthentication()] }, async (request, reply) => {
            const status = await CarsDB.getEventDrivers(this.db, request.params.eventId);
            return status.getResponse(reply);
        });

        /** Fetch a single driver record. */
        this.app.get('/api/drivers/:id', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { id } = request.params;
            const status = await CarsDB.getDriverById(this.db, id);
            if (status.isError()) return status.getResponse(reply);

            const driver = status.getData();
            if (driver.user_id !== request.user.id) {
                if (!(await Permissions.canManageEvent(this.db, request.user.id, driver.event_id))) {
                    return reply.status(403).send({ message: 'Forbidden.' });
                }
            }
            return status.getResponse(reply);
        });

        /** Add a new car. */
        this.app.post('/api/cars', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { name, seats, boats, isGlobal } = request.body as any;
            const userId = request.user.id;

            if (!name || !seats) {
                return reply.status(400).send({ message: 'Name and seats are required.' });
            }

            let globalFlag = false;
            if (isGlobal) {
                if (await Permissions.hasPermission(this.db, userId, 'car.manage_global')) {
                    globalFlag = true;
                } else {
                    return reply.status(403).send({ message: 'Insufficient permissions to create global cars.' });
                }
            }

            const status = await CarsDB.createCar(this.db, { 
                name, 
                seats: parseInt(seats), 
                boats: parseInt(boats || 0), 
                isGlobal: globalFlag, 
                userId: globalFlag ? null : userId 
            });
            return status.getResponse(reply);
        });

        /** Update a car. */
        this.app.put('/api/cars/:id', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { id } = request.params;
            const { name, seats, boats, isGlobal } = request.body as any;
            const userId = request.user.id;

            if (!name || !seats) {
                return reply.status(400).send({ message: 'Name and seats are required.' });
            }

            const carsRes = await CarsDB.getCars(this.db, userId);
            const car = (carsRes.getData() || []).find((c: any) => c.id == id);

            if (!car) return reply.status(404).send({ message: 'Car not found.' });

            let globalFlag = false;
            const hasGlobalPerm = await Permissions.hasPermission(this.db, userId, 'car.manage_global');

            if (car.user_id !== userId && !hasGlobalPerm) {
                return reply.status(403).send({ message: 'Forbidden.' });
            }

            if (isGlobal) {
                if (hasGlobalPerm) globalFlag = true;
                else return reply.status(403).send({ message: 'Insufficient permissions to set global cars.' });
            }

            const status = await CarsDB.updateCar(this.db, id, {
                name,
                seats: parseInt(seats),
                boats: parseInt(boats || 0),
                isGlobal: globalFlag
            }, hasGlobalPerm ? null : userId);
            
            return status.getResponse(reply);
        });

        /** Remove a car. */
        this.app.delete('/api/cars/:id', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { id } = request.params;
            const userId = request.user.id;

            // Check if it's their car or they have global manage permission
            const carsRes = await CarsDB.getCars(this.db, userId);
            const car = (carsRes.getData() || []).find((c: any) => c.id == id);

            if (!car) return reply.status(404).send({ message: 'Car not found.' });

            if (car.user_id !== userId) {
                if (!(await Permissions.hasPermission(this.db, userId, 'car.manage_global'))) {
                    return reply.status(403).send({ message: 'Forbidden.' });
                }
            }

            const status = await CarsDB.deleteCar(this.db, id);
            return status.getResponse(reply);
        });

        /** Submit mileage and proof. */
        this.app.post('/api/drivers/:id/mileage', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { id } = request.params;
            const { type, mileage, proofId } = request.body as any;

            if (!['start', 'end'].includes(type)) return reply.status(400).send({ message: 'Invalid mileage type.' });
            if (!mileage || !proofId) return reply.status(400).send({ message: 'Mileage and proof image are required.' });

            // Ensure the user is the driver
            const drivers = await this.db.all('SELECT user_id FROM event_drivers WHERE id = ?', [id]);
            if (drivers.length === 0) return reply.status(404).send({ message: 'Driver record not found.' });
            if (drivers[0].user_id !== request.user.id) return reply.status(403).send({ message: 'Forbidden.' });

            const status = await CarsDB.submitMileage(this.db, id, type, parseFloat(mileage), proofId);
            return status.getResponse(reply);
        });
    }
}
