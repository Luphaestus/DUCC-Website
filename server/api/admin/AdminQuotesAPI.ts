/**
 * AdminQuotesAPI.ts
 * 
 * Administrative routes for quote moderation.
 */

import QuotesDB from '../../db/quotesDB.js';
import { Permissions } from '../../misc/permissions.js';
import checkAuthentication from '../../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminQuotesAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch all quotes for moderation. */
        this.app.get('/api/admin/quotes', { preHandler: [checkAuthentication('quote.manage')] }, async (request: any, reply: FastifyReply) => {
            const { search, personId, visibility, page, limit, sort, order } = request.query as any;
            const user = request.user;
            
            const canSeeAuthor = await Permissions.hasPermission(this.db, user.id, 'quote.see_author');

            const status = await QuotesDB.getQuotes(this.db, { 
                search: search as string, 
                personId: personId as string, 
                visibility: (visibility as any) || 'all',
                page: page as string,
                limit: limit as string,
                sort: sort as string,
                order: order as 'asc' | 'desc'
            }, user, canSeeAuthor);
            return status.getResponse(reply);
        });

        /** Update quote visibility (Release/Private/Hidden). */
        this.app.post<{ Params: { id: string }, Body: { visibility: string } }>('/api/admin/quotes/:id/visibility', { preHandler: [checkAuthentication('quote.manage')] }, async (request, reply) => {
            const { visibility } = request.body;
            const { id } = request.params;

            if (!['public', 'private', 'hidden'].includes(visibility)) {
                return reply.status(400).send({ message: 'Invalid visibility state.' });
            }

            const status = await QuotesDB.setVisibility(this.db, id, visibility);
            return status.getResponse(reply);
        });

        /** Delete a quote. */
        this.app.delete<{ Params: { id: string } }>('/api/admin/quotes/:id', { preHandler: [checkAuthentication('quote.manage')] }, async (request, reply) => {
            const { id } = request.params;
            const status = await QuotesDB.deleteQuote(this.db, id);
            return status.getResponse(reply);
        });
    }
}