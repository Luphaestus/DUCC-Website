const { statusObject } = require('../misc/status.js');

/**
 * Database operations for files and categories.
 */
class FilesDB {

    /**
     * Fetch paginated, searchable, and filterable file list.
     * @param {object} db
     * @param {object} options - Pagination, search, sort, and filter parameters.
     * @param {string} userRole - 'public', 'member', or 'exec'.
     * @returns {Promise<statusObject>}
     */
    static async getFiles(db, options, userRole = 'public') {
        const { page = 1, limit = 20, search, sort, order, categoryId } = options;
        const offset = (page - 1) * limit;

        const allowedSorts = ['title', 'author', 'date', 'size', 'category_name'];
        let sortCol = allowedSorts.includes(sort) ? sort : 'date';
        if (sortCol === 'category_name') sortCol = 'c.name';
        else sortCol = `d.${sortCol}`;
        
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

        let conditions = [];
        const params = [];

        // Visibility filter
        if (userRole === 'public') {
            conditions.push("d.visibility = 'public'");
        } else if (userRole === 'member') {
            conditions.push("d.visibility IN ('public', 'members')");
        }

        if (search) {
            conditions.push("(d.title LIKE ? OR d.author LIKE ? OR d.filename LIKE ?)");
            const term = `%${search}%`;
            params.push(term, term, term);
        }

        if (categoryId) {
            conditions.push("d.category_id = ?");
            params.push(categoryId);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        try {
            const query = `
                SELECT d.*, c.name as category_name 
                FROM files d
                LEFT JOIN file_categories c ON d.category_id = c.id
                ${whereClause}
                ORDER BY ${sortCol} ${sortOrder}
                LIMIT ? OFFSET ?
            `;
            const files = await db.all(query, [...params, limit, offset]);

            const countResult = await db.get(`SELECT COUNT(*) as count FROM files d ${whereClause}`, params);
            const totalFiles = countResult ? countResult.count : 0;
            const totalPages = Math.ceil(totalFiles / limit);

            return new statusObject(200, null, { files, totalPages, currentPage: page, totalFiles });
        } catch (error) {
            console.error('Database error in getFiles:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new file entry.
     */
    static async createFile(db, data) {
        const { title, author, date, size, filename, category_id, visibility } = data;
        try {
            const result = await db.run(
                `INSERT INTO files (title, author, date, size, filename, category_id, visibility) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [title, author, date || new Date().toISOString(), size, filename, category_id, visibility || 'members']
            );
            return new statusObject(201, null, { id: result.lastID });
        } catch (error) {
            console.error('Database error in createFile:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Get a file by ID.
     */
    static async getFileById(db, id) {
        try {
            const file = await db.get(`SELECT * FROM files WHERE id = ?`, id);
            if (!file) return new statusObject(404, 'File not found');
            return new statusObject(200, null, file);
        } catch (error) {
            console.error('Database error in getFileById:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update file metadata.
     */
    static async updateFile(db, id, data) {
        const { title, author, date, visibility, category_id } = data;
        const updates = [];
        const params = [];

        if (title !== undefined) { updates.push("title = ?"); params.push(title); }
        if (author !== undefined) { updates.push("author = ?"); params.push(author); }
        if (date !== undefined) { updates.push("date = ?"); params.push(date); }
        if (visibility !== undefined) { updates.push("visibility = ?"); params.push(visibility); }
        if (category_id !== undefined) { updates.push("category_id = ?"); params.push(category_id); }

        if (updates.length === 0) return new statusObject(400, 'No fields to update');

        params.push(id);
        try {
            const result = await db.run(`UPDATE files SET ${updates.join(', ')} WHERE id = ?`, params);
            if (result.changes === 0) return new statusObject(404, 'File not found');
            return new statusObject(200, 'File updated');
        } catch (error) {
            console.error('Database error in updateFile:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete a file.
     */
    static async deleteFile(db, id) {
        try {
            const result = await db.run(`DELETE FROM files WHERE id = ?`, id);
            if (result.changes === 0) return new statusObject(404, 'File not found');
            return new statusObject(200, 'File deleted');
        } catch (error) {
            console.error('Database error in deleteFile:', error);
            return new statusObject(500, 'Database error');
        }
    }

    // --- Category Methods ---

    static async getCategories(db, userRole = 'public') {
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

    static async createCategory(db, data) {
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

    static async updateCategory(db, id, data) {
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

    static async deleteCategory(db, id) {
        try {
            await db.run(`DELETE FROM file_categories WHERE id = ?`, id);
            return new statusObject(200);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }
}

module.exports = FilesDB;