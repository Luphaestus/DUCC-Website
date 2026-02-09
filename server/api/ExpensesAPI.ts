/**
 * ExpensesAPI.ts
 * 
 * Public and member routes for event expenses and trip volunteering.
 */

import ExpensesDB from '../db/expensesDB.js';
import CarsDB from '../db/carsDB.js';
import EventsDB from '../db/eventsDB.js';
import AttendanceDB from '../db/attendanceDB.js';
import { Permissions } from '../misc/permissions.js';
import checkAuthentication from '../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';

export default class ExpensesAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch trips for an event. */
        this.app.get<{ Params: { eventId: string } }>('/api/events/:eventId/trips', { preHandler: [checkAuthentication()] }, async (request, reply) => {
            const status = await ExpensesDB.getTrips(this.db, request.params.eventId);
            return status.getResponse(reply);
        });

        /** Fetch expenses for an event. */
        this.app.get('/api/events/:eventId/expenses', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const userId = request.user.id;
            const eventId = request.params.eventId;

            const canManage = await Permissions.canManageEvent(this.db, userId, eventId);
            const status = await ExpensesDB.getExpenses(this.db, eventId);
            
            if (status.isError()) return status.getResponse(reply);

            let expenses = status.getData();
            if (!canManage) {
                // Users only see their own expenses
                expenses = expenses.filter((e: any) => e.user_id === userId);
            }

            return reply.status(200).send({ data: expenses });
        });

        /** Add an expense to an event. */
        this.app.post('/api/events/:eventId/expenses', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { amount, description, receiptFileId } = request.body;
            const eventId = request.params.eventId;
            const userId = request.user.id;

            if (!amount || !description) {
                return reply.status(400).send({ message: 'Amount and description are required.' });
            }

            // Check if attendee
            const isAttending = await AttendanceDB.is_user_attending_event(this.db, userId, parseInt(eventId));
            if (!isAttending.getData()) {
                return reply.status(403).send({ message: 'Only attendees can report expenses.' });
            }

            // Check if already payed out
            const event = await EventsDB.getEventById(this.db, parseInt(eventId));
            if (event.costs_released) {
                return reply.status(403).send({ message: 'Cannot add expenses to an event that has already been finalized.' });
            }

            const status = await ExpensesDB.createExpense(this.db, { 
                eventId, userId, amount: parseFloat(amount), description, receiptFileId 
            });
            return status.getResponse(reply);
        });

        /** Update an expense. */
        this.app.put('/api/expenses/:id', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { amount, description, receiptFileId } = request.body;
            const id = request.params.id;
            const userId = request.user.id;

            const expense = await this.db.get('SELECT * FROM event_expenses WHERE id = ?', [id]);
            if (!expense) return reply.status(404).send({ message: 'Expense not found.' });

            if (expense.user_id !== userId) {
                if (!(await Permissions.hasPermission(this.db, userId, 'event.manage.all'))) {
                    return reply.status(403).send({ message: 'Forbidden.' });
                }
            }

            const event = await EventsDB.getEventById(this.db, expense.event_id);
            if (event.costs_released) {
                return reply.status(403).send({ message: 'Cannot modify expenses after costs have been released.' });
            }

            const status = await ExpensesDB.updateExpense(this.db, id, { amount, description, receiptFileId }, (expense.user_id === userId ? userId : null));
            return status.getResponse(reply);
        });

        /** Delete an expense. */
        this.app.delete('/api/expenses/:id', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const id = request.params.id;
            const userId = request.user.id;

            const expense = await this.db.get('SELECT * FROM event_expenses WHERE id = ?', [id]);
            if (!expense) return reply.status(404).send({ message: 'Expense not found.' });

            if (expense.user_id !== userId) {
                if (!(await Permissions.hasPermission(this.db, userId, 'event.manage.all'))) {
                    return reply.status(403).send({ message: 'Forbidden.' });
                }
            }

            const event = await EventsDB.getEventById(this.db, expense.event_id);
            if (event.costs_released) {
                return reply.status(403).send({ message: 'Cannot delete expenses after costs have been released.' });
            }

            const status = await ExpensesDB.deleteExpense(this.db, id, (expense.user_id === userId ? userId : null));
            return status.getResponse(reply);
        });

        /** Remove oneself as a driver from a trip. */
        this.app.delete('/api/drivers/:id', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const status = await CarsDB.removeDriver(this.db, request.params.id, request.user.id);
            return status.getResponse(reply);
        });

        /** Fetch financial settlement for an event (only if released). */
        this.app.get<{ Params: { eventId: string } }>('/api/events/:eventId/settlement', { preHandler: [checkAuthentication()] }, async (request, reply) => {
            const event = await EventsDB.getEventById(this.db, parseInt(request.params.eventId));
            if (!event) return reply.status(404).send({ message: 'Event not found.' });
            
            if (!event.costs_released) {
                return reply.status(403).send({ message: 'Financial settlement has not been released yet.' });
            }

            const status = await ExpensesDB.getFinanceSummary(this.db, request.params.eventId);
            return status.getResponse(reply);
        });
    }
}