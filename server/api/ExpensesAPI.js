/**
 * ExpensesAPI.js
 * 
 * Public and member routes for event expenses and trip volunteering.
 */

import ExpensesDB from '../db/expensesDB.js';
import CarsDB from '../db/carsDB.js';
import EventsDB from '../db/eventsDB.js';
import AttendanceDB from '../db/attendanceDB.js';
import { Permissions } from '../misc/permissions.js';
import checkAuthentication from '../misc/authentication.js';

export default class ExpensesAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch trips for an event. */
        this.app.get('/api/events/:eventId/trips', checkAuthentication(), async (req, res) => {
            const status = await ExpensesDB.getTrips(this.db, req.params.eventId);
            status.getResponse(res);
        });

        /** Fetch expenses for an event. */
        this.app.get('/api/events/:eventId/expenses', checkAuthentication(), async (req, res) => {
            const userId = req.user.id;
            const eventId = req.params.eventId;

            const canManage = await Permissions.canManageEvent(this.db, userId, eventId);
            const status = await ExpensesDB.getExpenses(this.db, eventId);
            
            if (status.isError()) return status.getResponse(res);

            let expenses = status.getData();
            if (!canManage) {
                // Users only see their own expenses
                expenses = expenses.filter(e => e.user_id === userId);
            }

            res.status(200).json({ data: expenses });
        });

        /** Add an expense to an event. */
        this.app.post('/api/events/:eventId/expenses', checkAuthentication(), async (req, res) => {
            const { amount, description, receiptFileId } = req.body;
            const eventId = req.params.eventId;
            const userId = req.user.id;

            if (!amount || !description) {
                return res.status(400).json({ message: 'Amount and description are required.' });
            }

            // Check if attendee
            const isAttending = await AttendanceDB.is_user_attending_event(this.db, userId, eventId);
            if (!isAttending.getData()) {
                return res.status(403).json({ message: 'Only attendees can report expenses.' });
            }

            // Check if already payed out
            const event = await EventsDB.getEventById(this.db, eventId);
            if (event.costs_released) {
                return res.status(403).json({ message: 'Cannot add expenses to an event that has already been finalized.' });
            }

            const status = await ExpensesDB.createExpense(this.db, { 
                eventId, userId, amount: parseFloat(amount), description, receiptFileId 
            });
            status.getResponse(res);
        });

        /** Update an expense. */
        this.app.put('/api/expenses/:id', checkAuthentication(), async (req, res) => {
            const { amount, description, receiptFileId } = req.body;
            const id = req.params.id;
            const userId = req.user.id;

            const expense = await this.db.get('SELECT * FROM event_expenses WHERE id = ?', [id]);
            if (!expense) return res.status(404).json({ message: 'Expense not found.' });

            if (expense.user_id !== userId) {
                if (!(await Permissions.hasPermission(this.db, userId, 'event.manage.all'))) {
                    return res.status(403).json({ message: 'Forbidden.' });
                }
            }

            const event = await EventsDB.getEventById(this.db, expense.event_id);
            if (event.costs_released) {
                return res.status(403).json({ message: 'Cannot modify expenses after costs have been released.' });
            }

            const status = await ExpensesDB.updateExpense(this.db, id, { amount, description, receiptFileId }, (expense.user_id === userId ? userId : null));
            status.getResponse(res);
        });

        /** Delete an expense. */
        this.app.delete('/api/expenses/:id', checkAuthentication(), async (req, res) => {
            const id = req.params.id;
            const userId = req.user.id;

            const expense = await this.db.get('SELECT * FROM event_expenses WHERE id = ?', [id]);
            if (!expense) return res.status(404).json({ message: 'Expense not found.' });

            if (expense.user_id !== userId) {
                if (!(await Permissions.hasPermission(this.db, userId, 'event.manage.all'))) {
                    return res.status(403).json({ message: 'Forbidden.' });
                }
            }

            const event = await EventsDB.getEventById(this.db, expense.event_id);
            if (event.costs_released) {
                return res.status(403).json({ message: 'Cannot delete expenses after costs have been released.' });
            }

            const status = await ExpensesDB.deleteExpense(this.db, id, (expense.user_id === userId ? userId : null));
            status.getResponse(res);
        });

        /** Remove oneself as a driver from a trip. */
        this.app.delete('/api/drivers/:id', checkAuthentication(), async (req, res) => {
            const status = await CarsDB.removeDriver(this.db, req.params.id, req.user.id);
            status.getResponse(res);
        });

        /** Fetch financial settlement for an event (only if released). */
        this.app.get('/api/events/:eventId/settlement', checkAuthentication(), async (req, res) => {
            const event = await EventsDB.getEventById(this.db, req.params.eventId);
            if (!event) return res.status(404).json({ message: 'Event not found.' });
            
            if (!event.costs_released) {
                return res.status(403).json({ message: 'Financial settlement has not been released yet.' });
            }

            const status = await ExpensesDB.getFinanceSummary(this.db, req.params.eventId);
            status.getResponse(res);
        });
    }
}
