/**
 * expensesDB.js
 * 
 * This module handles database operations for event expenses, trips, and exclusions.
 */

import { statusObject } from '../misc/status.js';
import TransactionsDB from './transactionDB.js';
import Logger from '../misc/Logger.js';
import Globals from '../misc/globals.js';

export default class ExpensesDB {
    /**
     * Create a new trip for an event.
     */
    static async createTrip(db, eventId, name) {
        try {
            const event = await db.get('SELECT costs_released FROM events WHERE id = ?', [eventId]);
            if (event && event.costs_released) return new statusObject(403, 'Cannot create trips for a finalized event.');

            const result = await db.run(
                'INSERT INTO trips (event_id, name) VALUES (?, ?)',
                [eventId, name]
            );
            return new statusObject(201, 'Trip created.', { id: result.lastID });
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch trips for an event.
     */
    static async getTrips(db, eventId) {
        try {
            const rows = await db.all('SELECT * FROM trips WHERE event_id = ?', [eventId]);
            return new statusObject(200, null, rows);
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new expense.
     */
    static async createExpense(db, { eventId, userId, amount, description, receiptFileId }) {
        try {
            const event = await db.get('SELECT start, costs_released FROM events WHERE id = ?', [eventId]);
            if (!event) return new statusObject(404, 'Event not found.');
            if (event.costs_released) return new statusObject(403, 'Cannot add expenses to a finalized event.');

            const now = new Date();
            const startLimitHours = new Globals().getInt('ExpenseReportStartLimit');
            const startLimit = new Date(new Date(event.start).getTime() - (startLimitHours * 60 * 60 * 1000));
            if (now < startLimit) {
                return new statusObject(403, `Expenses can only be reported starting ${startLimitHours} hour${startLimitHours !== 1 ? 's' : ''} before the event begins.`);
            }

            const result = await db.run(
                'INSERT INTO event_expenses (event_id, user_id, amount, description, receipt_file_id) VALUES (?, ?, ?, ?, ?)',
                [eventId, userId, amount, description, receiptFileId]
            );
            return new statusObject(201, 'Expense added.', { id: result.lastID });
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch expenses for an event.
     */
    static async getExpenses(db, eventId) {
        try {
            const rows = await db.all(`
                SELECT ee.*, u.first_name, u.last_name
                FROM event_expenses ee
                JOIN users u ON ee.user_id = u.id
                WHERE ee.event_id = ?
            `, [eventId]);
            return new statusObject(200, null, rows);
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update an expense.
     */
    static async updateExpense(db, id, { amount, description, receiptFileId }, userId = null) {
        try {
            const event = await db.get(`
                SELECT e.start, e.costs_released 
                FROM events e
                JOIN event_expenses ee ON e.id = ee.event_id
                WHERE ee.id = ?
            `, [id]);

            if (!event) return new statusObject(404, 'Expense/Event not found.');
            if (event.costs_released) return new statusObject(403, 'Cannot update expenses for a finalized event.');

            const now = new Date();
            const startLimitHours = new Globals().getInt('ExpenseReportStartLimit');
            const startLimit = new Date(new Date(event.start).getTime() - (startLimitHours * 60 * 60 * 1000));
            if (now < startLimit) {
                return new statusObject(403, `Expenses can only be modified starting ${startLimitHours} hour${startLimitHours !== 1 ? 's' : ''} before the event begins.`);
            }

            let query = 'UPDATE event_expenses SET amount = ?, description = ?, receipt_file_id = ? WHERE id = ?';
            const params = [amount, description, receiptFileId, id];
            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }
            const result = await db.run(query, params);
            if (result.changes === 0) return new statusObject(404, 'Expense not found or unauthorized.');
            return new statusObject(200, 'Expense updated.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete an expense.
     */
    static async deleteExpense(db, id, userId = null) {
        try {
            const event = await db.get(`
                SELECT e.costs_released 
                FROM events e
                JOIN event_expenses ee ON e.id = ee.event_id
                WHERE ee.id = ?
            `, [id]);

            if (event && event.costs_released) return new statusObject(403, 'Cannot delete expenses from a finalized event.');

            let query = 'DELETE FROM event_expenses WHERE id = ?';
            const params = [id];
            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }
            const result = await db.run(query, params);
            if (result.changes === 0) return new statusObject(404, 'Expense not found or unauthorized.');
            return new statusObject(200, 'Expense deleted.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Set exclusions for a trip or expense.
     */
    static async setExclusions(db, type, id, userIds) {
        const table = type === 'trip' ? 'trip_exclusions' : 'expense_exclusions';
        const idCol = type === 'trip' ? 'trip_id' : 'expense_id';

        try {
            const event = type === 'trip' 
                ? await db.get('SELECT costs_released FROM events e JOIN trips t ON e.id = t.event_id WHERE t.id = ?', [id])
                : await db.get('SELECT costs_released FROM events e JOIN event_expenses ee ON e.id = ee.event_id WHERE ee.id = ?', [id]);
            
            if (event && event.costs_released) return new statusObject(403, 'Cannot update exclusions for a finalized event.');

            await db.run('BEGIN TRANSACTION');
            await db.run(`DELETE FROM ${table} WHERE ${idCol} = ?`, [id]);
            for (const userId of userIds) {
                await db.run(`INSERT INTO ${table} (${idCol}, user_id) VALUES (?, ?)`, [id, userId]);
            }
            await db.run('COMMIT');
            return new statusObject(200, 'Exclusions updated.');
        } catch (error) {
            await db.run('ROLLBACK');
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Get exclusions for a trip or expense.
     */
    static async getExclusions(db, type, id) {
        const table = type === 'trip' ? 'trip_exclusions' : 'expense_exclusions';
        const idCol = type === 'trip' ? 'trip_id' : 'expense_id';

        try {
            const rows = await db.all(`SELECT user_id FROM ${table} WHERE ${idCol} = ?`, [id]);
            return new statusObject(200, null, rows.map(r => r.user_id));
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Calculate and release costs for an event.
     */
    static async releaseEventCosts(db, eventId) {
        try {
            const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
            if (!event) return new statusObject(404, 'Event not found.');
            if (event.costs_released) return new statusObject(400, 'Costs already released.');

            const attendees = await db.all('SELECT user_id FROM event_attendees WHERE event_id = ? AND is_attending = 1', [eventId]);
            const attendeeIds = attendees.map(a => a.user_id);

            const expenses = await db.all('SELECT * FROM event_expenses WHERE event_id = ?', [eventId]);
            const trips = await db.all('SELECT * FROM trips WHERE event_id = ?', [eventId]);
            
            const mileageCost = new Globals().getFloat('MileageCost') || 0.45;

            const userCostSheet = {};
            attendeeIds.forEach(id => userCostSheet[id] = 0);

            // Process Expenses
            for (const expense of expenses) {
                const exclusions = (await this.getExclusions(db, 'expense', expense.id)).getData();
                const eligibleAttendees = attendeeIds.filter(id => !exclusions.includes(id));
                
                if (eligibleAttendees.length > 0) {
                    const share = expense.amount / eligibleAttendees.length;
                    eligibleAttendees.forEach(id => userCostSheet[id] += share);
                }

                // Payer gets reimbursed
                if (userCostSheet[expense.user_id] !== undefined) {
                    userCostSheet[expense.user_id] -= expense.amount;
                } else {
                    // If payer is not an attendee (rare but possible), still reimburse
                    userCostSheet[expense.user_id] = -expense.amount;
                }
            }

            // Process Trips (Mileage)
            for (const trip of trips) {
                const drivers = await db.all('SELECT * FROM event_drivers WHERE trip_id = ? AND status = "accepted"', [trip.id]);
                const exclusions = (await this.getExclusions(db, 'trip', trip.id)).getData();
                const eligibleAttendees = attendeeIds.filter(id => !exclusions.includes(id));

                let tripTotalCost = 0;
                for (const driver of drivers) {
                    if (driver.start_mileage !== null && driver.end_mileage !== null) {
                        const miles = driver.end_mileage - driver.start_mileage;
                        const reimbursement = miles * mileageCost;
                        tripTotalCost += reimbursement;

                        // Reimbursing the driver
                        if (userCostSheet[driver.user_id] !== undefined) {
                            userCostSheet[driver.user_id] -= reimbursement;
                        } else {
                            userCostSheet[driver.user_id] = -reimbursement;
                        }
                    }
                }

                if (eligibleAttendees.length > 0 && tripTotalCost > 0) {
                    const share = tripTotalCost / eligibleAttendees.length;
                    eligibleAttendees.forEach(id => userCostSheet[id] += share);
                }
            }

            await db.run('BEGIN TRANSACTION');

            for (const [userId, amount] of Object.entries(userCostSheet)) {
                if (Math.abs(amount) > 0.001) {
                    await TransactionsDB._add_transaction_internal(db, parseInt(userId), -amount, `Event Costs: ${event.title}`, eventId);
                }
            }

            await db.run('UPDATE events SET costs_released = 1, costs_released_at = ? WHERE id = ?', [new Date().toISOString(), eventId]);
            await db.run('COMMIT');

            return new statusObject(200, 'Costs calculated and released.');
        } catch (error) {
            await db.run('ROLLBACK');
            Logger.error(error);
            return new statusObject(500, 'Database error during cost release');
        }
    }

    /**
     * Refund upfront fee for a specific user.
     */
    static async refundUpfrontFee(db, eventId, userId) {
        try {
            const record = await db.get('SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ?', [eventId, userId]);
            if (!record) return new statusObject(404, 'Attendance record not found.');
            if (record.upfront_refunded) return new statusObject(400, 'Fee already refunded.');
            if (!record.payment_transaction_id) return new statusObject(400, 'No payment found.');

            const transaction = await db.get('SELECT amount FROM transactions WHERE id = ?', [record.payment_transaction_id]);
            if (!transaction) return new statusObject(404, 'Payment transaction not found.');

            const event = await db.get('SELECT title FROM events WHERE id = ?', [eventId]);
            const refundAmount = Math.abs(transaction.amount);

            await db.run('BEGIN TRANSACTION');
            await TransactionsDB._add_transaction_internal(db, userId, refundAmount, `Upfront Fee Refund: ${event.title}`, eventId);
            await db.run('UPDATE event_attendees SET upfront_refunded = 1 WHERE event_id = ? AND user_id = ?', [eventId, userId]);
            await db.run('COMMIT');

            return new statusObject(200, 'Upfront fee refunded.');
        } catch (error) {
            await db.run('ROLLBACK');
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Calculate projected financial summary for an event.
     */
    static async getFinanceSummary(db, eventId) {
        try {
            const event = await db.get('SELECT * FROM events WHERE id = ?', [eventId]);
            if (!event) return new statusObject(404, 'Event not found.');

            const attendees = await db.all(`
                SELECT u.id, u.first_name, u.last_name 
                FROM users u 
                JOIN event_attendees ea ON u.id = ea.user_id 
                WHERE ea.event_id = ? AND ea.is_attending = 1
            `, [eventId]);
            
            const attendeeIds = attendees.map(a => a.id);
            const expenses = await db.all(`
                SELECT ee.*, u.first_name, u.last_name 
                FROM event_expenses ee 
                JOIN users u ON ee.user_id = u.id 
                WHERE ee.event_id = ?
            `, [eventId]);
            
            const trips = await db.all('SELECT * FROM trips WHERE event_id = ?', [eventId]);
            const mileageCost = new Globals().getFloat('MileageCost') || 0.45;

            const breakdown = {};
            attendees.forEach(a => {
                breakdown[a.id] = {
                    id: a.id,
                    name: `${a.first_name} ${a.last_name}`,
                    spent: 0,
                    mileage: 0,
                    shared_cost_share: 0,
                    net: 0
                };
            });

            const expenseDetails = [];
            const tripDetails = [];

            // Process Expenses
            for (const expense of expenses) {
                const exclusions = (await this.getExclusions(db, 'expense', expense.id)).getData();
                const eligibleAttendees = attendeeIds.filter(id => !exclusions.includes(id));
                const share = eligibleAttendees.length > 0 ? expense.amount / eligibleAttendees.length : 0;
                
                expenseDetails.push({
                    id: expense.id,
                    description: expense.description,
                    amount: expense.amount,
                    payer_name: `${expense.first_name} ${expense.last_name}`,
                    payer_id: expense.user_id,
                    eligible_count: eligibleAttendees.length,
                    share: share,
                    excluded_ids: exclusions
                });

                if (eligibleAttendees.length > 0) {
                    eligibleAttendees.forEach(id => {
                        if (breakdown[id]) breakdown[id].shared_cost_share += share;
                    });
                }

                if (breakdown[expense.user_id]) {
                    breakdown[expense.user_id].spent += expense.amount;
                }
            }

            // Process Trips
            for (const trip of trips) {
                const drivers = await db.all(`
                    SELECT ed.*, u.first_name, u.last_name 
                    FROM event_drivers ed
                    JOIN users u ON ed.user_id = u.id
                    WHERE ed.trip_id = ? AND ed.status = "accepted"
                `, [trip.id]);
                const exclusions = (await this.getExclusions(db, 'trip', trip.id)).getData();
                const eligibleAttendees = attendeeIds.filter(id => !exclusions.includes(id));

                let tripTotalReimbursement = 0;
                const driverDetails = [];
                for (const driver of drivers) {
                    if (driver.start_mileage !== null && driver.end_mileage !== null) {
                        const miles = driver.end_mileage - driver.start_mileage;
                        const reimbursement = miles * mileageCost;
                        tripTotalReimbursement += reimbursement;

                        driverDetails.push({
                            name: `${driver.first_name} ${driver.last_name}`,
                            user_id: driver.user_id,
                            miles,
                            reimbursement
                        });

                        if (breakdown[driver.user_id]) {
                            breakdown[driver.user_id].mileage += reimbursement;
                        }
                    }
                }

                const share = eligibleAttendees.length > 0 ? tripTotalReimbursement / eligibleAttendees.length : 0;
                
                tripDetails.push({
                    id: trip.id,
                    name: trip.name,
                    total_reimbursement: tripTotalReimbursement,
                    eligible_count: eligibleAttendees.length,
                    share: share,
                    drivers: driverDetails,
                    excluded_ids: exclusions
                });

                if (eligibleAttendees.length > 0 && tripTotalReimbursement > 0) {
                    eligibleAttendees.forEach(id => {
                        if (breakdown[id]) breakdown[id].shared_cost_share += share;
                    });
                }
            }

            // Final Net Calculation
            // Net = (Spent + Mileage) - SharedCostShare
            // Positive = Receiving money (overpaid/drove)
            // Negative = Owed (paid less than share)
            Object.values(breakdown).forEach(row => {
                row.net = (row.spent + row.mileage) - row.shared_cost_share;
            });

            return new statusObject(200, null, {
                breakdown: Object.values(breakdown),
                expenses: expenseDetails,
                trips: tripDetails,
                is_released: !!event.costs_released,
                released_at: event.costs_released_at,
                mileage_rate: mileageCost
            });
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Remove an attendee from an event (Admin action).
     */
    static async removeAttendee(db, eventId, userId) {
        try {
            const event = await db.get('SELECT costs_released FROM events WHERE id = ?', [eventId]);
            if (!event) return new statusObject(404, 'Event not found.');
            if (event.costs_released) return new statusObject(400, 'Cannot remove attendees after costs are released.');

            const record = await db.get('SELECT * FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1', [eventId, userId]);
            if (!record) return new statusObject(404, 'User is not an active attendee.');

            await db.run(
                'UPDATE event_attendees SET is_attending = 0, left_at = ? WHERE event_id = ? AND user_id = ?',
                [new Date().toISOString(), eventId, userId]
            );

            return new statusObject(200, 'Attendee removed from event.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Manually add an attendee to an event (Admin action).
     */
    static async addAttendee(db, eventId, userId) {
        try {
            const event = await db.get('SELECT costs_released FROM events WHERE id = ?', [eventId]);
            if (!event) return new statusObject(404, 'Event not found.');
            if (event.costs_released) return new statusObject(400, 'Cannot add attendees after costs are released.');

            const existing = await db.get('SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1', [eventId, userId]);
            if (existing) return new statusObject(400, 'User is already attending this event.');

            // We use simple INSERT/UPDATE logic - if they were once there, reactive them.
            const record = await db.get('SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ?', [eventId, userId]);
            if (record) {
                await db.run(
                    'UPDATE event_attendees SET is_attending = 1, joined_at = ?, left_at = NULL WHERE event_id = ? AND user_id = ?',
                    [new Date().toISOString(), eventId, userId]
                );
            } else {
                await db.run(
                    'INSERT INTO event_attendees (event_id, user_id, joined_at, is_attending) VALUES (?, ?, ?, 1)',
                    [eventId, userId, new Date().toISOString()]
                );
            }

            return new statusObject(201, 'Attendee added to event.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }
}
