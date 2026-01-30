/**
 * AdminQuotesAPI.js
 * 
 * Administrative routes for quote moderation.
 */

import QuotesDB from '../../db/quotesDB.js';
import { Permissions } from '../../misc/permissions.js';
import checkAuthentication from '../../misc/authentication.js';

export default class AdminQuotesAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch all quotes for moderation. */
        this.app.get('/api/admin/quotes', checkAuthentication('quote.manage'), async (req, res) => {
            const { search, personId, visibility, page, limit, sort, order } = req.query;
            const user = req.user;
            
            const canSeeAuthor = await Permissions.hasPermission(this.db, user.id, 'quote.see_author');

            const status = await QuotesDB.getQuotes(this.db, { 
                search, 
                personId, 
                visibility: visibility || 'all',
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 15,
                sort,
                order
            }, user, canSeeAuthor);
            status.getResponse(res);
        });

        /** Update quote visibility (Release/Private/Hidden). */
        this.app.post('/api/admin/quotes/:id/visibility', checkAuthentication('quote.manage'), async (req, res) => {
            const { visibility } = req.body;
            const { id } = req.params;

            if (!['public', 'private', 'hidden'].includes(visibility)) {
                return res.status(400).json({ message: 'Invalid visibility state.' });
            }

            const status = await QuotesDB.setVisibility(this.db, id, visibility);
            status.getResponse(res);
        });

        /** Delete a quote. */
        this.app.delete('/api/admin/quotes/:id', checkAuthentication('quote.manage'), async (req, res) => {
            const { id } = req.params;
            const status = await QuotesDB.deleteQuote(this.db, id);
            status.getResponse(res);
        });
    }
}
