/**
 * InvitationsAPI.ts
 * 
 * This file handles administration of user invitations.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import check from '../../misc/authentication.js';
import InvitationsDB from '../../db/invitationsDB.js';
import crypto from 'crypto';
import { EmailManager } from '../../emails/EmailManager.js';
import Logger from '../../misc/Logger.js';
import config from '../../config.js';

export default class InvitationsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * Get all invitations.
         */
        this.app.get('/api/admin/invitations', { preHandler: [check('user.manage')] }, async (request, reply) => {
            const status = await InvitationsDB.getAllInvitations(this.db);
            if (status.isError()) return status.getResponse(reply);
            return reply.send(status.getData());
        });

        /**
         * Create and send an invitation.
         */
        this.app.post('/api/admin/invitations', { preHandler: [check('user.manage')] }, async (request: any, reply) => {
            const { email } = request.body as any;
            if (!email) return reply.status(400).send({ message: 'Email is required.' });

            const inviterId = request.user.id;
            const token = crypto.randomBytes(32).toString('hex');

            const status = await InvitationsDB.createInvitation(this.db, email, inviterId, token);
            if (status.isError()) return status.getResponse(reply);

            // Send invitation email
            const protocol = request.protocol;
            const host = request.headers.host;
            const baseUrl = `${protocol}://${host}`;
            const signupUrl = `${baseUrl}/signup?token=${token}&email=${encodeURIComponent(email)}`;

            EmailManager.getInstance().sendTemplatedEmail(
                email,
                'Invitation to join DUCC - DUCC',
                'invitation',
                {
                    inviter_name: `${request.user.first_name} ${request.user.last_name}`,
                    signup_url: signupUrl,
                    email: email
                }
            ).catch(err => Logger.error('[InvitationsAPI] Failed to send invitation email:', err));

            return status.getResponse(reply);
        });

        /**
         * Delete an invitation.
         */
        this.app.delete<{ Params: { id: string } }>('/api/admin/invitations/:id', { preHandler: [check('user.manage')] }, async (request, reply) => {
            const id = parseInt(request.params.id);
            if (isNaN(id)) return reply.status(400).send({ message: 'Invalid ID.' });

            const status = await InvitationsDB.deleteInvitation(this.db, id);
            return status.getResponse(reply);
        });
        
        /**
         * Verify an invitation token.
         */
        this.app.get<{ Querystring: { token: string } }>('/api/auth/invitation/verify', async (request, reply) => {
            const { token } = request.query;
            if (!token) return reply.status(400).send({ message: 'Token is required.' });

            const invitation = await InvitationsDB.getInvitationByToken(this.db, token);
            if (!invitation) return reply.status(404).send({ message: 'Invalid or expired invitation.' });

            return reply.send({ 
                email: invitation.email,
                inviter_name: `${invitation.inviter_first_name} ${invitation.inviter_last_name}`
            });
        });
    }
}
