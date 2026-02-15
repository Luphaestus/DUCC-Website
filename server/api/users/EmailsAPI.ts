/**
 * EmailsAPI.ts
 * 
 * This file handles user email management (multiple emails).
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import check from '../../misc/authentication.js';
import EmailsDB from '../../db/emailsDB.js';
import crypto from 'crypto';
import { EmailManager } from '../../emails/EmailManager.js';
import Logger from '../../misc/Logger.js';
import ValidationRules from '../../rules/ValidationRules.js';

export default class EmailsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * Get current user's emails.
         */
        this.app.get('/api/users/me/emails', { preHandler: [check()] }, async (request: any, reply) => {
            const status = await EmailsDB.getUserEmails(this.db, request.user.id);
            if (status.isError()) return status.getResponse(reply);
            return reply.send(status.getData());
        });

        /**
         * Add a new email to current user.
         */
        this.app.post('/api/users/me/emails', { preHandler: [check()] }, async (request: any, reply) => {
            let { email } = request.body as any;
            if (!email) return reply.status(400).send({ message: 'Email is required.' });

            email = email.replace(/\s/g, '').toLowerCase();
            const emailError = ValidationRules.validate('email', email);
            if (emailError) return reply.status(400).send({ message: emailError });

            const verificationToken = crypto.randomBytes(32).toString('hex');
            const status = await EmailsDB.addEmail(this.db, request.user.id, email, verificationToken);
            
            if (!status.isError()) {
                const protocol = request.protocol;
                const host = request.headers.host;
                const baseUrl = `${protocol}://${host}`;
                const verifyUrl = `${baseUrl}/api/auth/emails/verify/${verificationToken}`;

                EmailManager.getInstance().sendTemplatedEmail(
                    email,
                    'Verify your secondary email - DUCC',
                    'verify_email',
                    {
                        name: request.user.first_name,
                        verify_url: verifyUrl
                    }
                ).catch(err => Logger.error('[EmailsAPI] Failed to send verification email:', err));
            }

            return status.getResponse(reply);
        });

        /**
         * Verify a secondary email.
         */
        this.app.get<{ Params: { token: string } }>('/api/auth/emails/verify/:token', async (request, reply) => {
            const { token } = request.params;
            const status = await EmailsDB.verifyEmail(this.db, token);
            if (status.isError()) return status.getResponse(reply);

            return reply.redirect('/email-verified');
        });

        /**
         * Set an email as primary.
         */
        this.app.post<{ Params: { id: string } }>('/api/users/me/emails/:id/set-primary', { preHandler: [check()] }, async (request: any, reply) => {
            const emailId = parseInt(request.params.id);
            if (isNaN(emailId)) return reply.status(400).send({ message: 'Invalid ID.' });

            const status = await EmailsDB.setPrimaryEmail(this.db, request.user.id, emailId);
            return status.getResponse(reply);
        });

        /**
         * Delete an email.
         */
        this.app.delete<{ Params: { id: string } }>('/api/users/me/emails/:id', { preHandler: [check()] }, async (request: any, reply) => {
            const emailId = parseInt(request.params.id);
            if (isNaN(emailId)) return reply.status(400).send({ message: 'Invalid ID.' });

            const status = await EmailsDB.deleteEmail(this.db, request.user.id, emailId);
            return status.getResponse(reply);
        });
    }
}
