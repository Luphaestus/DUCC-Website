/**
 * AdminCarsAPI.js
 * 
 * Administrative routes for driver moderation and car management.
 */

import CarsDB from '../../db/carsDB.js';
import checkAuthentication from '../../misc/authentication.js';

export default class AdminCarsAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch all drivers for an event. */
        this.app.get('/api/admin/events/:eventId/drivers', checkAuthentication('event.manage.all|event.manage.scoped'), async (req, res) => {
            const { eventId } = req.params;
            const status = await CarsDB.getEventDrivers(this.db, eventId);
            status.getResponse(res);
        });

        /** Moderate a driver volunteer. */
        this.app.post('/api/admin/drivers/:id/status', checkAuthentication('event.manage.all|event.manage.scoped'), async (req, res) => {
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
