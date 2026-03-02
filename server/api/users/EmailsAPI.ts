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
    private static readonly SECONDARY_EMAIL_VERIFICATION_EXPIRY_MINUTES = 60;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    private formatExpiryGmt(expiresAt: Date): string {
        return expiresAt.toUTCString();
    }

    private sendSecondaryVerificationEmail(targetEmail: string, verifyUrl: string) {
        const expiresInMinutes = EmailsAPI.SECONDARY_EMAIL_VERIFICATION_EXPIRY_MINUTES;
        const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

        return EmailManager.getInstance().sendTemplatedEmail(
            targetEmail,
            'Verify your secondary email - DUCC',
            'verify_email_secondary',
            {
                requested_email: targetEmail,
                verify_url: verifyUrl,
                expires_at_gmt: this.formatExpiryGmt(expiresAt),
                expires_in_minutes: String(expiresInMinutes)
            }
        );
    }

    private renderVerificationErrorPage(reply: FastifyReply, statusCode: number, message: string) {
        const title = statusCode === 410 ? 'Verification Link Expired' : 'Verification Failed';
        const html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} - DUCC</title>
    <style>
        body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: #f6f7fb; color: #1f2937; }
        .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .card { max-width: 560px; width: 100%; background: white; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.08); padding: 28px; }
        h1 { margin: 0 0 10px; font-size: 1.4rem; }
        p { margin: 0 0 14px; line-height: 1.5; }
        a { color: #7E317B; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <main class="wrap">
        <section class="card">
            <h1>${title}</h1>
            <p>${message}</p>
            <p>Please return to your account page and request a new verification email.</p>
            <p><a href="/profile?tab=settings">Go to Profile Settings</a></p>
        </section>
    </main>
</body>
</html>`;

        return reply.status(statusCode).type('text/html; charset=utf-8').send(html);
    }

    registerRoutes() {
        /**
         * Get current user's emails.
         */
        this.app.get('/api/users/me/emails', { preHandler: [check()] }, async (request: any, reply) => {
            try {
                if (!request.user || !request.user.id) return reply.status(401).send({ message: 'Unauthorized' });
                const status = await EmailsDB.getUserEmails(this.db, request.user.id);
                if (status.isError()) return status.getResponse(reply);
                // Return the raw array for client convenience (legacy behaviour)
                return reply.send(status.getData() || []);
            } catch (err) {
                Logger.error('[EmailsAPI] GET /api/users/me/emails error:', err);
                return reply.status(500).send({ message: 'Server error' });
            }
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

                this.sendSecondaryVerificationEmail(email, verifyUrl)
                    .catch(err => Logger.error('[EmailsAPI] Failed to send verification email:', err));
            }

            return status.getResponse(reply);
        });

        /**
         * Verify a secondary email.
         */
        this.app.get<{ Params: { token: string } }>('/api/auth/emails/verify/:token', async (request, reply) => {
            const { token } = request.params;
            const status = await EmailsDB.verifyEmail(this.db, token);
            if (status.isError()) {
                return this.renderVerificationErrorPage(reply, status.getStatus(), status.getMessage() || 'Unable to verify this email address.');
            }

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
         * Resend verification for a user's secondary email.
         */
        this.app.post<{ Params: { id: string } }>('/api/users/me/emails/:id/resend', { preHandler: [check()] }, async (request: any, reply) => {
            try {
                const emailId = parseInt(request.params.id);
                if (isNaN(emailId)) return reply.status(400).send({ message: 'Invalid ID.' });

                const verificationToken = crypto.randomBytes(32).toString('hex');
                const status = await EmailsDB.resendVerification(this.db, request.user.id, emailId, verificationToken);
                if (status.isError()) return status.getResponse(reply);

                const protocol = request.protocol;
                const host = request.headers.host;
                const baseUrl = `${protocol}://${host}`;
                const verifyUrl = `${baseUrl}/api/auth/emails/verify/${verificationToken}`;

                const { email } = status.getData() as any;
                this.sendSecondaryVerificationEmail(email, verifyUrl)
                    .catch(err => Logger.error('[EmailsAPI] Failed to send verification email:', err));

                return status.getResponse(reply);
            } catch (err) {
                Logger.error('[EmailsAPI] POST /api/users/me/emails/:id/resend error:', err);
                return reply.status(500).send({ message: 'Server error' });
            }
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
