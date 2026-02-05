/**
 * SwimsAPI.ts
 * 
 * This file handles user "swims" records.
 */

import SwimsDB from '../../db/swimsDB.js';
import check from '../../misc/authentication.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../../db/db.js';

export default class SwimsAPI {
    app: Express;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Express application.
     * @param {object} db - Database connection.
     */
    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all swim-related routes.
     */
    registerRoutes() {
        /**
         * Fetch swim leaderboard.
         */
        this.app.get('/api/user/swims/leaderboard', check(), async (req: any, res: Response) => {
            const yearly = req.query.yearly === 'true';
            const status = await SwimsDB.getSwimsLeaderboard(this.db, yearly, req.user.id);
            return status.getResponse(res);
        });

        /**
         * Add swims to a user account.
         */
        this.app.post('/api/user/:id/swims', check('perm:swims.manage'), async (req: any, res: Response) => {
            const userId = parseInt(req.params.id, 10);
            const count = parseInt(req.body.count, 10);
            if (isNaN(userId) || isNaN(count)) return res.status(400).json({ message: 'Invalid data' });
            
            const status = await SwimsDB.addSwims(this.db, userId, count, req.user.id);
            if (!status.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('swims_update', { userId });
            }
            return status.getResponse(res);
        });

        /**
         * Add booties to a user account.
         */
        this.app.post('/api/user/:id/booties', check('perm:swims.manage'), async (req: any, res: Response) => {
            const userId = parseInt(req.params.id, 10);
            const count = parseInt(req.body.count, 10);
            if (isNaN(userId) || isNaN(count)) return res.status(400).json({ message: 'Invalid data' });

            const status = await SwimsDB.addBooties(this.db, userId, count);
            if (!status.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.broadcast('swims_update', { userId });
            }
            return status.getResponse(res);
        });
    }
}
