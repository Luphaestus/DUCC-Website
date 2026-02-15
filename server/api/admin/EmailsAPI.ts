/**
 * EmailsAPI.ts
 * 
 * Handles administrative email sending.
 */

import check from '../../misc/authentication.js';
import { FastifyInstance, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import { EmailManager } from '../../emails/EmailManager.js';
import Logger from '../../misc/Logger.js';

export default class EmailsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * Get stats for potential email recipients.
         */
        this.app.get('/api/admin/emails/stats', { preHandler: [check('perm:email.send')] }, async (request, reply) => {
            const stats = await this.db.get(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_member = 1 THEN 1 ELSE 0 END) as members,
                    SUM(CASE WHEN is_member = 0 THEN 1 ELSE 0 END) as guests
                FROM users 
                WHERE email IS NOT NULL AND is_verified = 1
            `);
            return reply.send(stats);
        });

        /**
         * Send an announcement email.
         */
        this.app.post<{ Body: { subject: string, content: string, target: 'all' | 'members' | 'guests' } }>(
            '/api/admin/emails/send', 
            { preHandler: [check('perm:email.send')] }, 
            async (request, reply) => {
                const { subject, content, target } = request.body;

                if (!subject || !content || !target) {
                    return reply.status(400).send({ message: 'Missing subject, content, or target' });
                }

                const finalSubject = subject.endsWith(' - DUCC') ? subject : `${subject} - DUCC`;

                let query = 'SELECT email FROM users WHERE email IS NOT NULL AND is_verified = 1';
                if (target === 'members') {
                    query += ' AND is_member = 1';
                } else if (target === 'guests') {
                    query += ' AND is_member = 0';
                }

                try {
                    const users = await this.db.all(query);
                    const emailManager = EmailManager.getInstance();

                    // Send asynchronously to not block the request
                    Promise.all(users.map(async (user: any) => {
                        try {
                            await emailManager.sendTemplatedEmail(
                                user.email,
                                finalSubject,
                                'announcement',
                                { content }
                            );
                        } catch (err) {
                            Logger.error(`Failed to send announcement to ${user.email}`, err);
                        }
                    })).then(() => Logger.info(`Announcement sent to ${users.length} recipients.`));

                    return reply.send({ message: `Announcement sending started for ${users.length} recipients.` });
                } catch (e: any) {
                    return reply.status(500).send({ message: e.message });
                }
            }
        );
    }
}
