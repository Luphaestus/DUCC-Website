/**
 * carsDB.js
 * 
 * This module handles database operations for cars and event drivers.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import Globals from '../misc/globals.js';

export default class CarsDB {
    /**
     * Fetch cars for a user, or all global cars.
     */
    static async getCars(db, userId = null, includeGlobal = true) {
        let query = `SELECT * FROM cars WHERE 1=0`;
        const params = [];

        if (userId) {
            query += ` OR user_id = ?`;
            params.push(userId);
        }

        if (includeGlobal) {
            query += ` OR is_global = 1`;
        }

        try {
            const rows = await db.all(query, params);
            return new statusObject(200, null, rows);
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new car.
     */
    static async createCar(db, { name, seats, boats, isGlobal = false, userId = null }) {
        try {
            const result = await db.run(
                'INSERT INTO cars (name, seats, boats, is_global, user_id) VALUES (?, ?, ?, ?, ?)',
                [name, seats, boats, isGlobal ? 1 : 0, userId]
            );
            return new statusObject(201, 'Car added successfully.', { id: result.lastID });
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update an existing car.
     */
    static async updateCar(db, id, { name, seats, boats, isGlobal }, userId = null) {
        try {
            let query = 'UPDATE cars SET name = ?, seats = ?, boats = ?, is_global = ? WHERE id = ?';
            const params = [name, seats, boats, isGlobal ? 1 : 0, id];
            
            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }

            const result = await db.run(query, params);
            if (result.changes === 0) return new statusObject(404, 'Car not found or unauthorized.');
            return new statusObject(200, 'Car updated successfully.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete a car.
     */
    static async deleteCar(db, id, userId = null) {
        try {
            let query = 'DELETE FROM cars WHERE id = ?';
            const params = [id];
            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }
            const result = await db.run(query, params);
            if (result.changes === 0) return new statusObject(404, 'Car not found.');
            return new statusObject(200, 'Car removed.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Assign a driver to a trip.
     */
    static async assignDriver(db, tripId, userId, carId) {
        try {
            const event = await db.get('SELECT costs_released FROM events e JOIN trips t ON e.id = t.event_id WHERE t.id = ?', [tripId]);
            if (event && event.costs_released) return new statusObject(403, 'Cannot assign driver for a finalized event.');

            const result = await db.run(
                'INSERT INTO event_drivers (trip_id, user_id, car_id, status) VALUES (?, ?, ?, ?)',
                [tripId, userId, carId, 'accepted']
            );
            return new statusObject(201, 'Driver assigned.', { id: result.lastID });
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update driver volunteer status.
     */
    static async updateDriverStatus(db, id, status) {
        try {
            const event = await db.get('SELECT costs_released FROM events e JOIN trips t ON e.id = t.event_id JOIN event_drivers ed ON t.id = ed.trip_id WHERE ed.id = ?', [id]);
            if (event && event.costs_released) return new statusObject(403, 'Cannot update driver status for a finalized event.');

            await db.run('UPDATE event_drivers SET status = ? WHERE id = ?', [status, id]);
            return new statusObject(200, `Driver status updated to ${status}.`);
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch drivers for an event.
     */
    static async getEventDrivers(db, eventId) {
        try {
            const rows = await db.all(`
                SELECT ed.*, c.name as car_name, c.seats, c.boats, u.first_name, u.last_name, t.name as trip_name
                FROM event_drivers ed
                JOIN cars c ON ed.car_id = c.id
                JOIN users u ON ed.user_id = u.id
                JOIN trips t ON ed.trip_id = t.id
                WHERE t.event_id = ?
            `, [eventId]);
            return new statusObject(200, null, rows);
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch a single driver record by ID.
     */
    static async getDriverById(db, id) {
        try {
            const row = await db.get(`
                SELECT ed.*, c.name as car_name, t.name as trip_name, t.event_id
                FROM event_drivers ed
                JOIN cars c ON ed.car_id = c.id
                JOIN trips t ON ed.trip_id = t.id
                WHERE ed.id = ?
            `, [id]);
            if (!row) return new statusObject(404, 'Driver record not found.');
            return new statusObject(200, null, row);
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Remove a driver from a trip.
     */
    static async removeDriver(db, id, userId = null) {
        try {
            const event = await db.get('SELECT costs_released FROM events e JOIN trips t ON e.id = t.event_id JOIN event_drivers ed ON t.id = ed.trip_id WHERE ed.id = ?', [id]);
            if (event && event.costs_released) return new statusObject(403, 'Cannot remove driver from a finalized event.');

            let query = 'DELETE FROM event_drivers WHERE id = ?';
            const params = [id];
            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }
            const result = await db.run(query, params);
            if (result.changes === 0) return new statusObject(404, 'Driver entry not found.');
            return new statusObject(200, 'Driver removed from trip.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Submit mileage and proof.
     */
    static async submitMileage(db, id, type, mileage, proofId) {
        try {
            const event = await db.get(`
                SELECT e.start, e.costs_released 
                FROM events e
                JOIN trips t ON e.id = t.event_id
                JOIN event_drivers ed ON t.id = ed.trip_id
                WHERE ed.id = ?
            `, [id]);

            if (!event) return new statusObject(404, 'Event/Driver record not found.');
            if (event.costs_released) return new statusObject(403, 'Cannot submit mileage for a finalized event.');

            const now = new Date();
            const startLimitHours = new Globals().getInt('ExpenseReportStartLimit');
            const startLimit = new Date(new Date(event.start).getTime() - (startLimitHours * 60 * 60 * 1000));
            if (now < startLimit) {
                return new statusObject(403, `Mileage can only be reported starting ${startLimitHours} hour${startLimitHours !== 1 ? 's' : ''} before the event begins.`);
            }

            const fieldPrefix = type === 'start' ? 'start' : 'end';
            const query = `
                UPDATE event_drivers 
                SET ${fieldPrefix}_mileage = ?, 
                    ${fieldPrefix}_mileage_proof_id = ?, 
                    ${fieldPrefix}_mileage_submitted_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `;
            await db.run(query, [mileage, proofId, id]);
            return new statusObject(200, 'Mileage submitted.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }
}
