/**
 * AdminExpensesAPI.ts
 * 
 * Administrative routes for managing trips, expenses, exclusions, and cost releasing.
 */

import ExpensesDB from '../../db/expensesDB.js';
import CarsDB from '../../db/carsDB.js';
import checkAuthentication from '../../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminExpensesAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Create a new trip for an event. */
        this.app.post<{ Params: { eventId: string }, Body: { name: string } }>('/api/admin/events/:eventId/trips', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { name } = request.body;
            if (!name) return reply.status(400).send({ message: 'Trip name is required.' });

            const status = await ExpensesDB.createTrip(this.db, request.params.eventId, name);
            return status.getResponse(reply);
        });

        /** Set exclusions for a trip. */
        this.app.post<{ Params: { id: string }, Body: { userIds: number[] } }>('/api/admin/trips/:id/exclusions', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { userIds } = request.body;
            const status = await ExpensesDB.setExclusions(this.db, 'trip', request.params.id, userIds || []);
            return status.getResponse(reply);
        });

        /** Get exclusions for a trip. */
        this.app.get<{ Params: { id: string } }>('/api/admin/trips/:id/exclusions', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const status = await ExpensesDB.getExclusions(this.db, 'trip', request.params.id);
            return status.getResponse(reply);
        });

        /** Set exclusions for an expense. */
        this.app.post<{ Params: { id: string }, Body: { userIds: number[] } }>('/api/admin/expenses/:id/exclusions', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { userIds } = request.body;
            const status = await ExpensesDB.setExclusions(this.db, 'expense', request.params.id, userIds || []);
            return status.getResponse(reply);
        });

        /** Get exclusions for an expense. */
        this.app.get<{ Params: { id: string } }>('/api/admin/expenses/:id/exclusions', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const status = await ExpensesDB.getExclusions(this.db, 'expense', request.params.id);
            return status.getResponse(reply);
        });

        /** Get financial summary/preview for an event. */
        this.app.get<{ Params: { eventId: string } }>('/api/admin/events/:eventId/finance-summary', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const status = await ExpensesDB.getFinanceSummary(this.db, request.params.eventId);
            return status.getResponse(reply);
        });

        /** Release event costs. */
        this.app.post<{ Params: { eventId: string } }>('/api/admin/events/:eventId/release-costs', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const status = await ExpensesDB.releaseEventCosts(this.db, request.params.eventId);
            return status.getResponse(reply);
        });

        /** Refund upfront fee for an attendee. */
        this.app.post<{ Params: { eventId: string, userId: string } }>('/api/admin/events/:eventId/attendees/:userId/refund-upfront', { preHandler: [checkAuthentication('transaction.manage|event.manage.all')] }, async (request, reply) => {
            const status = await ExpensesDB.refundUpfrontFee(this.db, request.params.eventId, request.params.userId);
            return status.getResponse(reply);
        });

        /** Remove an attendee from an event. */
        this.app.delete<{ Params: { eventId: string, userId: string } }>('/api/admin/events/:eventId/attendees/:userId', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const status = await ExpensesDB.removeAttendee(this.db, request.params.eventId, request.params.userId);
            return status.getResponse(reply);
        });

        /** Manually add an attendee to an event. */
        this.app.post<{ Params: { eventId: string }, Body: { userId: string } }>('/api/admin/events/:eventId/attendees', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { userId } = request.body;
            if (!userId) return reply.status(400).send({ message: 'User ID is required.' });
            const status = await ExpensesDB.addAttendee(this.db, request.params.eventId, userId);
            return status.getResponse(reply);
        });

        /** Create a new expense for an event (Admin action). */
        this.app.post<{ Params: { eventId: string }, Body: any }>('/api/admin/events/:eventId/expenses', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { amount, description, userId, receiptFileId } = request.body as any;
            const eventId = request.params.eventId;

            if (!amount || !description || !userId) {
                return reply.status(400).send({ message: 'Amount, description, and userId are required.' });
            }

            const status = await ExpensesDB.createExpense(this.db, { 
                eventId, userId, amount: parseFloat(amount), description, receiptFileId 
            });
            return status.getResponse(reply);
        });

        /** Add a driver to a trip (Admin action). */
        this.app.post<{ Params: { tripId: string }, Body: any }>('/api/admin/trips/:tripId/drivers', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { userId, carId } = request.body as any;
            const { tripId } = request.params;

            if (!userId || !carId) {
                return reply.status(400).send({ message: 'User ID and Car ID are required.' });
            }

            const status = await CarsDB.assignDriver(this.db, tripId, userId, carId);
            return status.getResponse(reply);
        });

        /** Remove a driver from a trip (Admin action). */
        this.app.delete<{ Params: { id: string } }>('/api/admin/drivers/:id', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const status = await CarsDB.removeDriver(this.db, request.params.id);
            return status.getResponse(reply);
        });

        /** Manually update driver mileage (Admin action). */
        this.app.post<{ Params: { id: string }, Body: any }>('/api/admin/drivers/:id/mileage', { preHandler: [checkAuthentication('event.manage.all|event.manage.scoped')] }, async (request, reply) => {
            const { startMileage, endMileage } = request.body as any;
            const { id } = request.params;

            try {
                const event = await this.db.get('SELECT costs_released FROM events e JOIN trips t ON e.id = t.event_id JOIN event_drivers ed ON t.id = ed.trip_id WHERE ed.id = ?', [id]);
                if (event && event.costs_released) return reply.status(403).send({ message: 'Cannot update mileage for a finalized event.' });

                // We directly update the database as there's no complex logic needed here for manual admin entry.
                await this.db.run(
                    'UPDATE event_drivers SET start_mileage = ?, end_mileage = ? WHERE id = ?',
                    [startMileage || null, endMileage || null, id]
                );
                return reply.status(200).send({ message: 'Mileage updated.' });
            } catch (error) {
                return reply.status(500).send({ message: 'Database error' });
            }
        });
    }
}