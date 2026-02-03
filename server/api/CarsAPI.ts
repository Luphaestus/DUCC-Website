/**
 * CarsAPI.ts
 * 
 * Public and member routes for car management and driver volunteering.
 */

import CarsDB from '../db/carsDB.js';
import { Permissions } from '../misc/permissions.js';
import checkAuthentication from '../misc/authentication.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../db/db.js';

export default class CarsAPI {
    app: Express;
    db: DatabaseWrapper;

    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch cars available to the current user (personal + global). */
        this.app.get('/api/cars', checkAuthentication(), async (req: any, res: Response) => {
            const status = await CarsDB.getCars(this.db, req.user.id);
            status.getResponse(res);
        });

        /** Fetch drivers for an event (Member view). */
        this.app.get('/api/events/:eventId/drivers', checkAuthentication(), async (req: Request, res: Response) => {
            const status = await CarsDB.getEventDrivers(this.db, req.params.eventId);
            status.getResponse(res);
        });

        /** Fetch a single driver record. */
        this.app.get('/api/drivers/:id', checkAuthentication(), async (req: any, res: Response) => {
            const { id } = req.params;
            const status = await CarsDB.getDriverById(this.db, id);
            if (status.isError()) return status.getResponse(res);

            const driver = status.getData();
            if (driver.user_id !== req.user.id) {
                if (!(await Permissions.canManageEvent(this.db, req.user.id, driver.event_id))) {
                    return res.status(403).json({ message: 'Forbidden.' });
                }
            }
            status.getResponse(res);
        });

        /** Add a new car. */
        this.app.post('/api/cars', checkAuthentication(), async (req: any, res: Response) => {
            const { name, seats, boats, isGlobal } = req.body;
            const userId = req.user.id;

            if (!name || !seats) {
                return res.status(400).json({ message: 'Name and seats are required.' });
            }

            let globalFlag = false;
            if (isGlobal) {
                if (await Permissions.hasPermission(this.db, userId, 'car.manage_global')) {
                    globalFlag = true;
                } else {
                    return res.status(403).json({ message: 'Insufficient permissions to create global cars.' });
                }
            }

            const status = await CarsDB.createCar(this.db, { 
                name, 
                seats: parseInt(seats), 
                boats: parseInt(boats || 0), 
                isGlobal: globalFlag, 
                userId: globalFlag ? null : userId 
            });
            status.getResponse(res);
        });

        /** Update a car. */
        this.app.put('/api/cars/:id', checkAuthentication(), async (req: any, res: Response) => {
            const { id } = req.params;
            const { name, seats, boats, isGlobal } = req.body;
            const userId = req.user.id;

            if (!name || !seats) {
                return res.status(400).json({ message: 'Name and seats are required.' });
            }

            const carsRes = await CarsDB.getCars(this.db, userId);
            const car = (carsRes.getData() || []).find((c: any) => c.id == id);

            if (!car) return res.status(404).json({ message: 'Car not found.' });

            let globalFlag = false;
            const hasGlobalPerm = await Permissions.hasPermission(this.db, userId, 'car.manage_global');

            if (car.user_id !== userId && !hasGlobalPerm) {
                return res.status(403).json({ message: 'Forbidden.' });
            }

            if (isGlobal) {
                if (hasGlobalPerm) globalFlag = true;
                else return res.status(403).json({ message: 'Insufficient permissions to set global cars.' });
            }

            const status = await CarsDB.updateCar(this.db, id, {
                name,
                seats: parseInt(seats),
                boats: parseInt(boats || 0),
                isGlobal: globalFlag
            }, hasGlobalPerm ? null : userId);
            
            status.getResponse(res);
        });

        /** Remove a car. */
        this.app.delete('/api/cars/:id', checkAuthentication(), async (req: any, res: Response) => {
            const { id } = req.params;
            const userId = req.user.id;

            // Check if it's their car or they have global manage permission
            const carsRes = await CarsDB.getCars(this.db, userId);
            const car = (carsRes.getData() || []).find((c: any) => c.id == id);

            if (!car) return res.status(404).json({ message: 'Car not found.' });

            if (car.user_id !== userId) {
                if (!(await Permissions.hasPermission(this.db, userId, 'car.manage_global'))) {
                    return res.status(403).json({ message: 'Forbidden.' });
                }
            }

            const status = await CarsDB.deleteCar(this.db, id);
            status.getResponse(res);
        });

        /** Submit mileage and proof. */
        this.app.post('/api/drivers/:id/mileage', checkAuthentication(), async (req: any, res: Response) => {
            const { id } = req.params;
            const { type, mileage, proofId } = req.body;

            if (!['start', 'end'].includes(type)) return res.status(400).json({ message: 'Invalid mileage type.' });
            if (!mileage || !proofId) return res.status(400).json({ message: 'Mileage and proof image are required.' });

            // Ensure the user is the driver
            const drivers = await this.db.all('SELECT user_id FROM event_drivers WHERE id = ?', [id]);
            if (drivers.length === 0) return res.status(404).json({ message: 'Driver record not found.' });
            if (drivers[0].user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

            const status = await CarsDB.submitMileage(this.db, id, type, parseFloat(mileage), proofId);
            status.getResponse(res);
        });
    }
}
