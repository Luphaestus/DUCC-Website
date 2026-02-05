/**
 * QuotesAPI.ts
 * 
 * Public and member-facing routes for quotes.
 */

import QuotesDB from '../db/quotesDB.js';
import { Permissions } from '../misc/permissions.js';
import checkAuthentication from '../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';

export default class QuotesAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch released quotes. */
        this.app.get('/api/quotes', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { search, personId, page, limit } = request.query as any;
            const user = request.user;

            if (!user.is_member) {
                return reply.status(403).send({ message: 'Only members can view quotes.' });
            }
            
            let canSeeAuthor = await Permissions.hasPermission(this.db, user.id, 'quote.see_author');

            const status = await QuotesDB.getQuotes(this.db, { 
                search: search as string, 
                personId: personId as string, 
                visibility: 'public',
                page: page as string,
                limit: limit as string
            }, user, canSeeAuthor);
            return status.getResponse(reply);
        });

        /** Submit a new quote (Members only). */
        this.app.post('/api/quotes', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { text, quotedUserId } = request.body as any;
            const user = request.user;

            if (!user.is_member) {
                return reply.status(403).send({ message: 'Only members can submit quotes.' });
            }

            if (!text || !quotedUserId) {
                return reply.status(400).send({ message: 'Text and person are required.' });
            }

            const status = await QuotesDB.createQuote(this.db, text, quotedUserId, user.id);
            return status.getResponse(reply);
        });

        /** Get list of all users for the dropdown. */
        this.app.get('/api/quotes/users', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            if (!request.user.is_member) {
                return reply.status(403).send({ message: 'Only members can access quote data.' });
            }

            // Simplified user list for dropdown
            try {
                const users = await this.db.all('SELECT id, first_name, last_name FROM users ORDER BY first_name ASC');
                return reply.status(200).send(users);
            } catch (e) {
                return reply.status(500).send({ message: 'Database error' });
            }
        });

        /** Get a random public quote. */
        this.app.get('/api/quotes/random', async (request: FastifyRequest, reply: FastifyReply) => {
            try {
                const quote = await this.db.get(`
                    SELECT q.*, u.first_name as quoted_first_name, u.last_name as quoted_last_name
                    FROM quotes q
                    LEFT JOIN users u ON q.quoted_user_id = u.id
                    WHERE q.visibility = 'public'
                    ORDER BY RAND() LIMIT 1
                `);
                if (!quote) return reply.status(404).send({ message: 'No quotes found.' });
                return reply.status(200).send(quote);
            } catch (e) {
                return reply.status(500).send({ message: 'Database error' });
            }
        });
    }
}