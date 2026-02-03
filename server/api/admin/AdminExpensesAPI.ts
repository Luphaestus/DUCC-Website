/**
 * AdminExpensesAPI.ts
 * 
 * Administrative routes for managing trips, expenses, exclusions, and cost releasing.
 */

import ExpensesDB from '../../db/expensesDB.js';
import CarsDB from '../../db/carsDB.js';
import checkAuthentication from '../../misc/authentication.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminExpensesAPI {
    app: Express;
    db: DatabaseWrapper;

    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Create a new trip for an event. */
        this.app.post('/api/admin/events/:eventId/trips', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { name } = req.body;
            if (!name) return res.status(400).json({ message: 'Trip name is required.' });

            const status = await ExpensesDB.createTrip(this.db, req.params.eventId, name);
            status.getResponse(res);
        });

        /** Set exclusions for a trip. */
        this.app.post('/api/admin/trips/:id/exclusions', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { userIds } = req.body;
            const status = await ExpensesDB.setExclusions(this.db, 'trip', req.params.id, userIds || []);
            status.getResponse(res);
        });

        /** Get exclusions for a trip. */
        this.app.get('/api/admin/trips/:id/exclusions', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const status = await ExpensesDB.getExclusions(this.db, 'trip', req.params.id);
            status.getResponse(res);
        });

        /** Set exclusions for an expense. */
        this.app.post('/api/admin/expenses/:id/exclusions', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { userIds } = req.body;
            const status = await ExpensesDB.setExclusions(this.db, 'expense', req.params.id, userIds || []);
            status.getResponse(res);
        });

        /** Get exclusions for an expense. */
        this.app.get('/api/admin/expenses/:id/exclusions', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const status = await ExpensesDB.getExclusions(this.db, 'expense', req.params.id);
            status.getResponse(res);
        });

        /** Get financial summary/preview for an event. */
        this.app.get('/api/admin/events/:eventId/finance-summary', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const status = await ExpensesDB.getFinanceSummary(this.db, req.params.eventId);
            status.getResponse(res);
        });

        /** Release event costs. */
        this.app.post('/api/admin/events/:eventId/release-costs', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const status = await ExpensesDB.releaseEventCosts(this.db, req.params.eventId);
            status.getResponse(res);
        });

        /** Refund upfront fee for an attendee. */
        this.app.post('/api/admin/events/:eventId/attendees/:userId/refund-upfront', checkAuthentication('transaction.manage|event.manage.all'), async (req: Request, res: Response) => {
            const status = await ExpensesDB.refundUpfrontFee(this.db, req.params.eventId, req.params.userId);
            status.getResponse(res);
        });

        /** Remove an attendee from an event. */
        this.app.delete('/api/admin/events/:eventId/attendees/:userId', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const status = await ExpensesDB.removeAttendee(this.db, req.params.eventId, req.params.userId);
            status.getResponse(res);
        });

        /** Manually add an attendee to an event. */
        this.app.post('/api/admin/events/:eventId/attendees', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { userId } = req.body;
            if (!userId) return res.status(400).json({ message: 'User ID is required.' });
            const status = await ExpensesDB.addAttendee(this.db, req.params.eventId, userId);
            status.getResponse(res);
        });

        /** Create a new expense for an event (Admin action). */
        this.app.post('/api/admin/events/:eventId/expenses', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { amount, description, userId, receiptFileId } = req.body;
            const eventId = req.params.eventId;

            if (!amount || !description || !userId) {
                return res.status(400).json({ message: 'Amount, description, and userId are required.' });
            }

            const status = await ExpensesDB.createExpense(this.db, { 
                eventId, userId, amount: parseFloat(amount), description, receiptFileId 
            });
            status.getResponse(res);
        });

        /** Add a driver to a trip (Admin action). */
        this.app.post('/api/admin/trips/:tripId/drivers', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { userId, carId } = req.body;
            const { tripId } = req.params;

            if (!userId || !carId) {
                return res.status(400).json({ message: 'User ID and Car ID are required.' });
            }

            const status = await CarsDB.assignDriver(this.db, tripId, userId, carId);
            status.getResponse(res);
        });

        /** Remove a driver from a trip (Admin action). */
        this.app.delete('/api/admin/drivers/:id', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const status = await CarsDB.removeDriver(this.db, req.params.id);
            status.getResponse(res);
        });

        /** Manually update driver mileage (Admin action). */
        this.app.post('/api/admin/drivers/:id/mileage', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { startMileage, endMileage } = req.body;
            const { id } = req.params;

            try {
                const event = await this.db.get('SELECT costs_released FROM events e JOIN trips t ON e.id = t.event_id JOIN event_drivers ed ON t.id = ed.trip_id WHERE ed.id = ?', [id]);
                if (event && event.costs_released) return res.status(403).json({ message: 'Cannot update mileage for a finalized event.' });

                // We directly update the database as there's no complex logic needed here for manual admin entry.
                await this.db.run(
                    'UPDATE event_drivers SET start_mileage = ?, end_mileage = ? WHERE id = ?',
                    [startMileage || null, endMileage || null, id]
                );
                res.status(200).json({ message: 'Mileage updated.' });
            } catch (error) {
                res.status(500).json({ message: 'Database error' });
            }
        });
    }
}
