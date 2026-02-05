/**
 * ExecAPI.ts
 * 
 * This file handles management of the executive committee.
 */

import ExecDB from '../db/execDB.js';
import check from '../misc/authentication.js';
import { Permissions } from '../misc/permissions.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';

export default class ExecAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * Get current and past exec committee.
         */
        this.app.get('/api/exec', async (request: FastifyRequest<{ Querystring: { admin?: string } }>, reply: FastifyReply) => {
            const user = (request as any).user;
            const includeHidden = request.query.admin === 'true' && 
                                  user && 
                                  await Permissions.hasPermission(this.db, user.id, 'user.manage');
            
            const currentRes = await ExecDB.getCurrentExec(this.db, includeHidden);
            const pastRes = await ExecDB.getPastExec(this.db);

            if (currentRes.isError()) return currentRes.getResponse(reply);
            if (pastRes.isError()) return pastRes.getResponse(reply);

            return reply.send({
                current: currentRes.getData(),
                past: pastRes.getData()
            });
        });

        /**
         * Toggle exec member visibility (publish/unpublish).
         */
        this.app.post('/api/exec/:id/toggle-visibility', { preHandler: [check('exec.manage')] }, async (request: FastifyRequest<{ Params: { id: string }, Body: { is_hidden: boolean } }>, reply: FastifyReply) => {
            const status = await ExecDB.updateExecMember(this.db, parseInt(request.params.id), { is_hidden: request.body.is_hidden ? 1 : 0 });
            return status.getResponse(reply);
        });

        /**
         * Add an exec member.
         */
        this.app.post('/api/exec', { preHandler: [check('exec.manage')] }, async (request: FastifyRequest, reply: FastifyReply) => {
            const status = await ExecDB.addExecMember(this.db, request.body as any);
            return status.getResponse(reply);
        });

        /**
         * Update an exec member.
         */
        this.app.put('/api/exec/:id', { preHandler: [check('exec.manage')] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const status = await ExecDB.updateExecMember(this.db, parseInt(request.params.id), request.body as any);
            return status.getResponse(reply);
        });

        /**
         * Delete an exec member.
         */
        this.app.delete('/api/exec/:id', { preHandler: [check('exec.manage')] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const status = await ExecDB.deleteExecMember(this.db, parseInt(request.params.id));
            return status.getResponse(reply);
        });
    }
}