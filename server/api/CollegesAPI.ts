/**
 * CollegesAPI.ts
 * 
 * This file handles routes for college-related data.
 */

import CollegesDB from '../db/collegesDB.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../db/db.js';

export default class CollegesAPI {
    app: Express;
    db: DatabaseWrapper;

    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database connection instance.
     */
    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers college-related routes.
     */
    registerRoutes() {
        /**
         * List all colleges.
         */
        this.app.get('/api/colleges', async (req: Request, res: Response) => {
            const result = await CollegesDB.getAll(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });
    }
}
