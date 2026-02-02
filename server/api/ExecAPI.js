/**
 * ExecAPI.js
 * 
 * This file handles management of the executive committee.
 */

import { statusObject } from '../misc/status.js';
import ExecDB from '../db/execDB.js';
import check from '../misc/authentication.js';
import Logger from '../misc/Logger.js';

export default class ExecAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * Get current and past exec committee.
         */
        this.app.get('/api/exec', async (req, res) => {
            const currentRes = await ExecDB.getCurrentExec(this.db);
            const pastRes = await ExecDB.getPastExec(this.db);

            if (currentRes.isError()) return currentRes.getResponse(res);
            if (pastRes.isError()) return pastRes.getResponse(res);

            res.json({
                current: currentRes.getData(),
                past: pastRes.getData()
            });
        });

        /**
         * Add an exec member.
         */
        this.app.post('/api/exec', check('user.manage'), async (req, res) => {
            const status = await ExecDB.addExecMember(this.db, req.body);
            status.getResponse(res);
        });

        /**
         * Update an exec member.
         */
        this.app.put('/api/exec/:id', check('user.manage'), async (req, res) => {
            const status = await ExecDB.updateExecMember(this.db, req.params.id, req.body);
            status.getResponse(res);
        });

        /**
         * Delete an exec member.
         */
        this.app.delete('/api/exec/:id', check('user.manage'), async (req, res) => {
            const status = await ExecDB.deleteExecMember(this.db, req.params.id);
            status.getResponse(res);
        });

        /**
         * Archive current committee (Save button).
         */
        this.app.post('/api/exec/archive', check('site.admin'), async (req, res) => {
            const status = await ExecDB.archiveCurrentCommittee(this.db);
            status.getResponse(res);
        });
    }
}
