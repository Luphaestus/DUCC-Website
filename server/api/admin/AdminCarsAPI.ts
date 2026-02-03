/**
 * AdminCarsAPI.ts
 * 
 * Administrative routes for driver moderation and car management.
 */

import CarsDB from '../../db/carsDB.js';
import checkAuthentication from '../../misc/authentication.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminCarsAPI {
    app: Express;
    db: DatabaseWrapper;

    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch all drivers for an event. */
        this.app.get('/api/admin/events/:eventId/drivers', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { eventId } = req.params;
            const status = await CarsDB.getEventDrivers(this.db, eventId);
            status.getResponse(res);
        });

        /** Moderate a driver volunteer. */
        this.app.post('/api/admin/drivers/:id/status', checkAuthentication('event.manage.all|event.manage.scoped'), async (req: Request, res: Response) => {
            const { id } = req.params;
            const { status } = req.body;

            if (!['accepted', 'declined', 'pending'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status.' });
            }

            const response = await CarsDB.updateDriverStatus(this.db, id, status);
            response.getResponse(res);
        });
    }
}
