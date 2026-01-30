/**
 * quotesDB.js
 * 
 * This module handles database operations for the quotes system.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';

export default class QuotesDB {
    /**
     * Fetch quotes with filtering and visibility rules.
     */
    static async getQuotes(db, options = {}, user = null, canSeeAuthor = false) {
        const { search, personId, visibility, page = 1, limit = 15, sort, order } = options;
        const offset = (page - 1) * limit;

        const allowedSorts = ['created_at', 'text', 'quoted_user', 'visibility'];
        let sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
        if (sortCol === 'quoted_user') sortCol = 'u.first_name';
        else sortCol = `q.${sortCol}`;
        
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
        
        let query = `
            SELECT q.*, 
                   u.first_name as quoted_first_name, u.last_name as quoted_last_name,
                   s.first_name as submitter_first_name, s.last_name as submitter_last_name
            FROM quotes q
            LEFT JOIN users u ON q.quoted_user_id = u.id
            LEFT JOIN users s ON q.submitted_by_id = s.id
        `;
        
        let conditions = [];
        const params = [];

        // Visibility logic
        if (!user) {
            // Guests see nothing
            conditions.push("1=0");
        } else {
            // Logged in users
            if (visibility === 'private') {
                // Only execs can request private quotes (handled by API check, but DB filter here)
                conditions.push("q.visibility = 'private'");
            } else if (visibility === 'all') {
                // Admin view
                // No extra filter
            } else {
                // Standard view: public
                conditions.push("q.visibility = 'public'");
            }
        }

        if (search) {
            if (search.startsWith('person:')) {
                const terms = search.substring(7).trim().split(/\s+/);
                const nameConds = terms.map(term => {
                    params.push(`%${term}%`, `%${term}%`);
                    return "(u.first_name LIKE ? OR u.last_name LIKE ?)";
                });
                if (nameConds.length > 0) {
                    conditions.push("(" + nameConds.join(" AND ") + ")");
                }
            } else {
                conditions.push("q.text LIKE ?");
                params.push(`%${search}%`);
            }
        }

        if (personId) {
            conditions.push("q.quoted_user_id = ?");
            params.push(personId);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;

        try {
            const rows = await db.all(query, [...params, limit, offset]);

            const countQuery = `
                SELECT COUNT(*) as count 
                FROM quotes q
                LEFT JOIN users u ON q.quoted_user_id = u.id
                ${conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : ""}
            `;
            const countResult = await db.get(countQuery, params);
            const totalQuotes = countResult ? countResult.count : 0;
            const totalPages = Math.ceil(totalQuotes / limit);
            
            const processedRows = rows.map(row => {
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

            return new statusObject(200, null, { quotes: processedRows, totalPages, totalQuotes, currentPage: page });
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new quote.
     */
    static async createQuote(db, text, quotedUserId, submittedById) {
        try {
            const result = await db.run(
                'INSERT INTO quotes (text, quoted_user_id, submitted_by_id, visibility) VALUES (?, ?, ?, ?)',
                [text, quotedUserId, submittedById, 'private'] // Default to private until released
            );
            return new statusObject(201, 'Quote submitted for moderation.', { id: result.lastID });
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update quote visibility.
     */
    static async setVisibility(db, id, visibility) {
        try {
            await db.run('UPDATE quotes SET visibility = ? WHERE id = ?', [visibility, id]);
            return new statusObject(200, `Quote marked as ${visibility}.`);
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete a quote.
     */
    static async deleteQuote(db, id) {
        try {
            await db.run('DELETE FROM quotes WHERE id = ?', [id]);
            return new statusObject(200, 'Quote deleted.');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }
}
