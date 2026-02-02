import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';

export default class BaseDB {
    /**
     * Helper to wrap DB operations in statusObject and handle errors.
     */
    static async wrap(callback) {
        try {
            return await callback();
        } catch (error) {
            Logger.error('Database Error:', error);
            return new statusObject(500, 'Database error: ' + error.message);
        }
    }

    /**
     * Helper to handle paginated results.
     */
    static async paginate(db, query, countQuery, params, page, limit) {
        const offset = (page - 1) * limit;
        const rows = await db.all(`${query} LIMIT ? OFFSET ?`, [...params, Number(limit), Number(offset)]);
        const countResult = await db.get(countQuery, params);
        const total = countResult ? (countResult.count || countResult.total || 0) : 0;
        const totalPages = Math.ceil(total / limit);
        
        return {
            data: rows,
            total,
            totalPages,
            currentPage: Number(page)
        };
    }
}
