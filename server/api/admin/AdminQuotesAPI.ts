/**
 * AdminQuotesAPI.ts
 * 
 * Administrative routes for quote moderation.
 */

import QuotesDB from '../../db/quotesDB.js';
import { Permissions } from '../../misc/permissions.js';
import checkAuthentication from '../../misc/authentication.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminQuotesAPI {
    app: Express;
    db: DatabaseWrapper;

    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch all quotes for moderation. */
        this.app.get('/api/admin/quotes', checkAuthentication('quote.manage'), async (req: any, res: Response) => {
            const { search, personId, visibility, page, limit, sort, order } = req.query;
            const user = req.user;
            
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
            status.getResponse(res);
        });

        /** Update quote visibility (Release/Private/Hidden). */
        this.app.post('/api/admin/quotes/:id/visibility', checkAuthentication('quote.manage'), async (req: Request, res: Response) => {
            const { visibility } = req.body;
            const { id } = req.params;

            if (!['public', 'private', 'hidden'].includes(visibility)) {
                return res.status(400).json({ message: 'Invalid visibility state.' });
            }

            const status = await QuotesDB.setVisibility(this.db, id, visibility);
            status.getResponse(res);
        });

        /** Delete a quote. */
        this.app.delete('/api/admin/quotes/:id', checkAuthentication('quote.manage'), async (req: Request, res: Response) => {
            const { id } = req.params;
            const status = await QuotesDB.deleteQuote(this.db, id);
            status.getResponse(res);
        });
    }
}
