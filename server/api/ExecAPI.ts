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
import Logger from '../misc/Logger.js';

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
        this.app.get<{ Querystring: { admin?: string } }>('/api/exec', async (request, reply) => {
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
         * Update the current authenticated exec member's own details.
         */
        this.app.put('/api/exec/me', { preHandler: [check('perm:is_exec')] }, async (request: any, reply) => {
            const userId = request.user.id;
            const body = request.body as any;

            try {
                // Find the active exec committee entry for the current user
                const execEntry = await this.db.get('SELECT id FROM exec_committee WHERE user_id = ? AND is_current = 1', [userId]);

                if (!execEntry) {
                    return reply.status(404).send({ message: 'No active exec entry found for this user.' });
                }
                
                // Allowed fields for self-update (internal names)
                const allowedFields = ['first_name_override', 'last_name_override', 'email_override', 
                                       'profile_picture_override_id', 'profile_picture_color_override', 
                                       'profile_picture_font_override', 'profile_picture_initials_override',
                                       'instagram_link', 'linkedin_link'];
                
                const updateData: { [key: string]: any } = {};
                for (const field of allowedFields) {
                    // Check both snake_case and camelCase
                    const camelField = field.replace(/_([a-z])/g, g => g[1].toUpperCase());
                    if (body[field] !== undefined) {
                        updateData[field] = body[field];
                    } else if (body[camelField] !== undefined) {
                        updateData[field] = body[camelField];
                    }
                }

                const status = await ExecDB.updateExecMember(this.db, execEntry.id, updateData);
                return status.getResponse(reply);
            } catch (e: any) {
                Logger.error('Failed to update exec self-details', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        /**
         * Toggle exec member visibility (publish/unpublish).
         */
        this.app.post<{ Params: { id: string }, Body: { is_hidden: boolean } }>('/api/exec/:id/toggle-visibility', { preHandler: [check('exec.manage')] }, async (request, reply) => {
            const status = await ExecDB.updateExecMember(this.db, parseInt(request.params.id), { is_hidden: request.body.is_hidden ? 1 : 0 });
            return status.getResponse(reply);
        });

        /**
         * Add an exec member.
         */
        this.app.post('/api/exec', { preHandler: [check('exec.manage')] }, async (request, reply) => {
            const status = await ExecDB.addExecMember(this.db, request.body as any);
            return status.getResponse(reply);
        });

        /**
         * Update an exec member.
         */
        this.app.put<{ Params: { id: string } }>('/api/exec/:id', { preHandler: [check('exec.manage')] }, async (request, reply) => {
            const status = await ExecDB.updateExecMember(this.db, parseInt(request.params.id), request.body as any);
            return status.getResponse(reply);
        });

        /**
         * Delete an exec member.
         */
        this.app.delete<{ Params: { id: string } }>('/api/exec/:id', { preHandler: [check('exec.manage')] }, async (request, reply) => {
            const status = await ExecDB.deleteExecMember(this.db, parseInt(request.params.id));
            return status.getResponse(reply);
        });
    }
}