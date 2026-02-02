/**
 * quotesDB.js
 * 
 * This module handles database operations for the quotes system.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';

import BaseDB from './BaseDB.js';

export default class QuotesDB extends BaseDB {
    /**
     * Fetch quotes with filtering and visibility rules.
     */
    static async getQuotes(db, options = {}, user = null, canSeeAuthor = false) {
        return this.wrap(async () => {
            const { search, personId, visibility, page = 1, limit = 15, sort, order } = options;

            const allowedSorts = ['created_at', 'text', 'quoted_user', 'visibility'];
            let sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
            if (sortCol === 'quoted_user') sortCol = 'u.first_name';
            else sortCol = `q.${sortCol}`;
            
            const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
            
            let conditions = [];
            const params = [];

            if (!user) {
                conditions.push("1=0");
            } else {
                if (visibility === 'private') {
                    conditions.push("q.visibility = 'private'");
                } else if (visibility === 'all') {
                    // Admin view
                } else {
                    conditions.push("q.visibility = 'public'");
                }
            }

            if (search) {
                if (search.startsWith('person:')) {
                    const personSearch = search.substring(7).trim();
                    const terms = personSearch.split(/\s+/);
                    const searchTerms = terms.map(t => `+${t}*`).join(' ');
                    // Use FTS but provide fallback for small words/test env if needed
                    // Index is (first_name, last_name, email)
                    conditions.push(`(MATCH(u.first_name, u.last_name, u.email) AGAINST(? IN BOOLEAN MODE) OR u.first_name LIKE ? OR u.last_name LIKE ?)`);
                    params.push(searchTerms, `%${personSearch}%`, `%${personSearch}%`);
                } else {
                    const searchTerms = search.trim().split(/\s+/).map(t => `+${t}*`).join(' ');
                    conditions.push(`(MATCH(q.text) AGAINST(? IN BOOLEAN MODE) OR q.text LIKE ?)`);
                    params.push(searchTerms, `%${search}%`);
                }
            }

            if (personId) {
                conditions.push("q.quoted_user_id = ?");
                params.push(Number(personId));
            }

            const whereClause = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";

            const query = `
                SELECT q.*, 
                       u.first_name as quoted_first_name, u.last_name as quoted_last_name,
                       s.first_name as submitter_first_name, s.last_name as submitter_last_name
                FROM quotes q
                LEFT JOIN users u ON q.quoted_user_id = u.id
                LEFT JOIN users s ON q.submitted_by_id = s.id
                ${whereClause}
                ORDER BY ${sortCol} ${sortOrder}
            `;

            const countQuery = `
                SELECT COUNT(*) as count 
                FROM quotes q
                LEFT JOIN users u ON q.quoted_user_id = u.id
                ${whereClause}
            `;

            const { data: rows, total, totalPages } = await this.paginate(db, query, countQuery, params, page, limit);

            const quotes = rows.map(row => {
                const quote = {
                    id: row.id,
                    text: row.text,
                    quoted_user: {
                        id: row.quoted_user_id,
                        first_name: row.quoted_first_name,
                        last_name: row.quoted_last_name
                    },
                    visibility: row.visibility,
                    created_at: row.created_at
                };

                if (canSeeAuthor) {
                    quote.submitted_by = {
                        id: row.submitted_by_id,
                        first_name: row.submitter_first_name,
                        last_name: row.submitter_last_name
                    };
                }

                return quote;
            });

            return new statusObject(200, null, { quotes, totalPages, totalQuotes: total, currentPage: page });
        });
    }

    /**
     * Create a new quote.
     */
    static async createQuote(db, text, quotedUserId, submittedById) {
        return this.wrap(async () => {
            const result = await db.run(
                'INSERT INTO quotes (text, quoted_user_id, submitted_by_id, visibility) VALUES (?, ?, ?, ?)',
                [text, quotedUserId, submittedById, 'private']
            );
            return new statusObject(201, 'Quote submitted for moderation.', { id: result.lastID });
        });
    }

    /**
     * Update quote visibility.
     */
    static async setVisibility(db, id, visibility) {
        return this.wrap(async () => {
            await db.run('UPDATE quotes SET visibility = ? WHERE id = ?', [visibility, id]);
            return new statusObject(200, `Quote marked as ${visibility}.`);
        });
    }

    /**
     * Delete a quote.
     */
    static async deleteQuote(db, id) {
        return this.wrap(async () => {
            await db.run('DELETE FROM quotes WHERE id = ?', [id]);
            return new statusObject(200, 'Quote deleted.');
        });
    }
}
