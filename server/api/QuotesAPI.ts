/**
 * QuotesAPI.ts
 * 
 * Public and member-facing routes for quotes.
 */

import QuotesDB from '../db/quotesDB.js';
import { Permissions } from '../misc/permissions.js';
import checkAuthentication from '../misc/authentication.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../db/db.js';

export default class QuotesAPI {
    app: Express;
    db: DatabaseWrapper;

    constructor(app: Express, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch released quotes. */
        this.app.get('/api/quotes', checkAuthentication(), async (req: any, res: Response) => {
            const { search, personId, page, limit } = req.query;
            const user = req.user;

            if (!user.is_member) {
                return res.status(403).json({ message: 'Only members can view quotes.' });
            }
            
            let canSeeAuthor = await Permissions.hasPermission(this.db, user.id, 'quote.see_author');

            const status = await QuotesDB.getQuotes(this.db, { 
                search: search as string, 
                personId: personId as string, 
                visibility: 'public',
                page: page as string,
                limit: limit as string
            }, user, canSeeAuthor);
            status.getResponse(res);
        });

        /** Submit a new quote (Members only). */
        this.app.post('/api/quotes', checkAuthentication(), async (req: any, res: Response) => {
            const { text, quotedUserId } = req.body;
            const user = req.user;

            if (!user.is_member) {
                return res.status(403).json({ message: 'Only members can submit quotes.' });
            }

            if (!text || !quotedUserId) {
                return res.status(400).json({ message: 'Text and person are required.' });
            }

            const status = await QuotesDB.createQuote(this.db, text, quotedUserId, user.id);
            status.getResponse(res);
        });

        /** Get list of all users for the dropdown. */
        this.app.get('/api/quotes/users', checkAuthentication(), async (req: any, res: Response) => {
            if (!req.user.is_member) {
                return res.status(403).json({ message: 'Only members can access quote data.' });
            }

            // Simplified user list for dropdown
            try {
                const users = await this.db.all('SELECT id, first_name, last_name FROM users ORDER BY first_name ASC');
                res.status(200).json(users);
            } catch (e) {
                res.status(500).json({ message: 'Database error' });
            }
        });

        /** Get a random public quote. */
        this.app.get('/api/quotes/random', async (req: Request, res: Response) => {
            try {
                const quote = await this.db.get(`
                    SELECT q.*, u.first_name as quoted_first_name, u.last_name as quoted_last_name
                    FROM quotes q
                    LEFT JOIN users u ON q.quoted_user_id = u.id
                    WHERE q.visibility = 'public'
                    ORDER BY RAND() LIMIT 1
                `);
                if (!quote) return res.status(404).json({ message: 'No quotes found.' });
                res.status(200).json(quote);
            } catch (e) {
                res.status(500).json({ message: 'Database error' });
            }
        });
    }
}
