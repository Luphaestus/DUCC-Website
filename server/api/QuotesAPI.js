/**
 * QuotesAPI.js
 * 
 * Public and member-facing routes for quotes.
 */

import QuotesDB from '../db/quotesDB.js';
import UserDB from '../db/userDB.js';
import { Permissions } from '../misc/permissions.js';
import checkAuthentication from '../misc/authentication.js';

export default class QuotesAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /** Fetch released quotes. */
        this.app.get('/api/quotes', checkAuthentication(), async (req, res) => {
            const { search, personId, page, limit } = req.query;
            const user = req.user;

            if (!user.is_member) {
                return res.status(403).json({ message: 'Only members can view quotes.' });
            }
            
            let canSeeAuthor = await Permissions.hasPermission(this.db, user.id, 'quote.see_author');

            const status = await QuotesDB.getQuotes(this.db, { 
                search, 
                personId, 
                visibility: 'public',
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 15
            }, user, canSeeAuthor);
            status.getResponse(res);
        });

        /** Submit a new quote (Members only). */
        this.app.post('/api/quotes', checkAuthentication(), async (req, res) => {
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
        this.app.get('/api/quotes/users', checkAuthentication(), async (req, res) => {
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
        this.app.get('/api/quotes/random', async (req, res) => {
            try {
                const quote = await this.db.get(`
                    SELECT q.*, u.first_name as quoted_first_name, u.last_name as quoted_last_name
                    FROM quotes q
                    LEFT JOIN users u ON q.quoted_user_id = u.id
                    WHERE q.visibility = 'public'
                    ORDER BY RANDOM() LIMIT 1
                `);
                if (!quote) return res.status(404).json({ message: 'No quotes found.' });
                res.status(200).json(quote);
            } catch (e) {
                res.status(500).json({ message: 'Database error' });
            }
        });
    }
}
