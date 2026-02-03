import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';

export default class BaseDB {
    /**
     * Helper to wrap DB operations in statusObject and handle errors.
     */
    static async wrap<T>(callback: () => Promise<T>): Promise<T | statusObject> {
        try {
            return await callback();
        } catch (error: any) {
            Logger.error('Database Error:', error);
            return new statusObject(500, 'Database error: ' + error.message);
        }
    }

    /**
     * Helper to handle paginated results.
     */
    static async paginate(db: DatabaseWrapper, query: string, countQuery: string, params: any[], page: number | string, limit: number | string): Promise<{ data: any[], total: number, totalPages: number, currentPage: number }> {
        const p = Number(page);
        const l = Number(limit);
        const offset = (p - 1) * l;
        const rows = await db.all(`${query} LIMIT ? OFFSET ?`, [...params, l, offset]);
        const countResult = await db.get(countQuery, params);
        const total = countResult ? (countResult.count || countResult.total || 0) : 0;
        const totalPages = Math.ceil(total / l);
        
        return {
            data: rows,
            total,
            totalPages,
            currentPage: p
        };
    }
}
