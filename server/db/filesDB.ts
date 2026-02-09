import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';

export default class FilesDB {
    /**
     * Fetch a paginated, searchable, and filterable list of files.
     */
    static async getFiles(db: DatabaseWrapper, options: any, userRole: string = 'public'): Promise<statusObject> {
        const { page = 1, limit = 20, search, sort, order, categoryId, includeUsed = false } = options;
        const offset = (Number(page) - 1) * Number(limit);

        const allowedSorts = ['title', 'author', 'date', 'size', 'category_name'];
        let sortCol = allowedSorts.includes(sort) ? sort : 'date';
        if (sortCol === 'category_name') sortCol = 'c.name';
        else sortCol = `d.${sortCol}`;
        
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

        let conditions: string[] = [];
        const params: any[] = [];

        if (userRole === 'public') {
            conditions.push("d.visibility = 'public'");
        } else if (userRole === 'member') {
            conditions.push("d.visibility IN ('public', 'members')");
        }

        let ftsJoin = "";
        if (search) {
            let searchTerm = search;
            let useFts = true;

            if (search.startsWith('filename:')) {
                searchTerm = search.substring(9).trim();
                conditions.push("d.filename LIKE ?");
                params.push(`%${searchTerm}%`);
                useFts = false;
            } else if (search.startsWith('content:')) {
                searchTerm = search.substring(8).trim();
                conditions.push("d.content LIKE ?");
                params.push(`%${searchTerm}%`);
                useFts = false;
            }

            if (useFts && searchTerm) {
                const cleanedSearch = searchTerm.replace(/[+\-><()~*"]/g, ' ');
                const ftsQuery = cleanedSearch.split(/\s+/).filter((s: string) => s).map((s: string) => `+${s}*`).join(' ');
                
                conditions.push("MATCH (d.title, d.filename, d.content) AGAINST (? IN BOOLEAN MODE)");
                params.push(ftsQuery);
            }
        }

        if (categoryId) {
            conditions.push("d.category_id = ?");
            params.push(categoryId);
        }

        const usageFilter = !includeUsed ? `
            AND NOT EXISTS (SELECT 1 FROM events WHERE image_id = d.id)
            AND NOT EXISTS (SELECT 1 FROM tags WHERE image_id = d.id)
            AND NOT EXISTS (SELECT 1 FROM slides WHERE file_id = d.id)
        ` : '';

        try {
            const query = `
                SELECT d.*, c.name as category_name 
                FROM files d
                ${ftsJoin}
                LEFT JOIN file_categories c ON d.category_id = c.id
                WHERE 1=1 ${usageFilter}
                ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
                ORDER BY ${sortCol} ${sortOrder}
                LIMIT ? OFFSET ?
            `;
            const files = await db.all(query, [...params, Number(limit), Number(offset)]);

            const countQuery = `
                SELECT COUNT(*) as count 
                FROM files d 
                ${ftsJoin}
                WHERE 1=1 ${usageFilter}
                ${conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : ''}
            `;
            const countResult = await db.get(countQuery, params);
            const totalFiles = countResult ? countResult.count : 0;
            const totalPages = Math.ceil(totalFiles / Number(limit));

            return new statusObject(200, null, { files, totalPages, currentPage: Number(page), totalFiles });
        } catch (error: any) {
            Logger.error('Database error in getFiles:', error);
            // Fallback for FTS errors (e.g. syntax)
            if (ftsJoin) {
                return this.getFiles(db, { ...options, search: null }, userRole); // Try without search or handle differently
            }
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new file entry in the database.
     */
    static async createFile(db: DatabaseWrapper, data: any): Promise<statusObject> {
        const { title, author, date, size, filename, hash, category_id, visibility, content } = data;
        try {
            const result = await db.run(
                `INSERT INTO files (title, author, date, size, filename, hash, category_id, visibility, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, author, date || new Date().toISOString(), size, filename, hash, category_id, visibility || 'members', content]
            );
            return new statusObject(201, null, { id: result.lastID });
        } catch (error: any) {
            Logger.error('Database error in createFile:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Find a file by its unique content hash.
     */
    static async getFileByHash(db: DatabaseWrapper, hash: string): Promise<statusObject> {
        try {
            const file = await db.get(`SELECT * FROM files WHERE hash = ? LIMIT 1`, [hash]);
            if (!file) return new statusObject(404, 'File not found');
            return new statusObject(200, null, file);
        } catch (error: any) {
            Logger.error('Database error in getFileByHash:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Retrieve file metadata by ID.
     */
    static async getFileById(db: DatabaseWrapper, id: number | string): Promise<statusObject> {
        try {
            const file = await db.get(`SELECT * FROM files WHERE id = ?`, [id]);
            if (!file) return new statusObject(404, 'File not found');
            return new statusObject(200, null, file);
        } catch (error: any) {
            Logger.error('Database error in getFileById:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update an existing file's metadata.
     */
    static async updateFile(db: DatabaseWrapper, id: number | string, data: any): Promise<statusObject> {
        const { title, author, date, visibility, category_id, content } = data;
        const updates: string[] = [];
        const params: any[] = [];

        if (title !== undefined) { updates.push("title = ?"); params.push(title); }
        if (author !== undefined) { updates.push("author = ?"); params.push(author); }
        if (date !== undefined) { updates.push("date = ?"); params.push(date); }
        if (visibility !== undefined) { updates.push("visibility = ?"); params.push(visibility); }
        if (category_id !== undefined) { updates.push("category_id = ?"); params.push(category_id); }
        if (content !== undefined) { updates.push("content = ?"); params.push(content); }

        if (updates.length === 0) return new statusObject(400, 'No fields to update');

        params.push(id);
        try {
            const result = await db.run(`UPDATE files SET ${updates.join(', ')} WHERE id = ?`, params);
            if (result.changes === 0) return new statusObject(404, 'File not found');
            return new statusObject(200, 'File updated');
        } catch (error: any) {
            Logger.error('Database error in updateFile:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete a file entry from the database.
     */
    static async deleteFile(db: DatabaseWrapper, id: number | string): Promise<statusObject> {
        try {
            const result = await db.run(`DELETE FROM files WHERE id = ?`, [id]);
            if (result.changes === 0) return new statusObject(404, 'File not found');
            return new statusObject(200, 'File deleted');
        } catch (error: any) {
            Logger.error('Database error in deleteFile:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch categories, filtered by the user's role access level.
     */
    static async getCategories(db: DatabaseWrapper, userRole: string = 'public'): Promise<statusObject> {
        let condition = "";
        if (userRole === 'public') condition = "WHERE default_visibility = 'public'";
        else if (userRole === 'member') condition = "WHERE default_visibility IN ('public', 'members')";

        try {
            const categories = await db.all(`SELECT * FROM file_categories ${condition} ORDER BY name ASC`);
            return new statusObject(200, null, categories);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new category for files.
     */
    static async createCategory(db: DatabaseWrapper, data: any): Promise<statusObject> {
        const { name, default_visibility } = data;
        try {
            const result = await db.run(
                `INSERT INTO file_categories (name, default_visibility) VALUES (?, ?)`,
                [name, default_visibility || 'members']
            );
            return new statusObject(201, null, { id: result.lastID });
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update an existing category.
     */
    static async updateCategory(db: DatabaseWrapper, id: number | string, data: any): Promise<statusObject> {
        const { name, default_visibility } = data;
        try {
            await db.run(
                `UPDATE file_categories SET name = ?, default_visibility = ? WHERE id = ?`,
                [name, default_visibility, id]
            );
            return new statusObject(200);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete a category.
     */
    static async deleteCategory(db: DatabaseWrapper, id: number | string): Promise<statusObject> {
        try {
            await db.run(`DELETE FROM file_categories WHERE id = ?`, [id]);
            return new statusObject(200);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }
}
