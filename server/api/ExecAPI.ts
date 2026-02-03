/**
 * ExecAPI.ts
 * 
 * This file handles management of the executive committee.
 */

import ExecDB from '../db/execDB.js';
import check from '../misc/authentication.js';
import { Permissions } from '../misc/permissions.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../db/db.js';

export default class ExecAPI {
    app: Express;
    db: DatabaseWrapper;

    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * Get current and past exec committee.
         */
        this.app.get('/api/exec', async (req: Request, res: Response) => {
            const includeHidden = req.query.admin === 'true' && 
                                  req.user && 
                                  await Permissions.hasPermission(this.db, (req.user as any).id, 'user.manage');
            
            const currentRes = await ExecDB.getCurrentExec(this.db, includeHidden);
            const pastRes = await ExecDB.getPastExec(this.db);

            if (currentRes.isError()) return currentRes.getResponse(res);
            if (pastRes.isError()) return pastRes.getResponse(res);

            res.json({
                current: currentRes.getData(),
                past: pastRes.getData()
            });
        });

        /**
         * Toggle exec member visibility (publish/unpublish).
         */
        this.app.post('/api/exec/:id/toggle-visibility', check('exec.manage'), async (req: Request, res: Response) => {
            const status = await ExecDB.updateExecMember(this.db, parseInt(req.params.id), { is_hidden: req.body.is_hidden ? 1 : 0 });
            status.getResponse(res);
        });

        /**
         * Add an exec member.
         */
        this.app.post('/api/exec', check('exec.manage'), async (req: Request, res: Response) => {
            const status = await ExecDB.addExecMember(this.db, req.body);
            status.getResponse(res);
        });

        /**
         * Update an exec member.
         */
        this.app.put('/api/exec/:id', check('exec.manage'), async (req: Request, res: Response) => {
            const status = await ExecDB.updateExecMember(this.db, parseInt(req.params.id), req.body);
            status.getResponse(res);
        });

        /**
         * Delete an exec member.
         */
        this.app.delete('/api/exec/:id', check('exec.manage'), async (req: Request, res: Response) => {
            const status = await ExecDB.deleteExecMember(this.db, parseInt(req.params.id));
            status.getResponse(res);
        });
    }
}
