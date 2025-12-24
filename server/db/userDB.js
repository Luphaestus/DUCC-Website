const { statusObject } = require('../misc/status.js');

/**
 * UserDB module.
 * Provides database operations for user profile management, permissions, and administrative user listings.
 */
class UserDB {

    /**
     * Checks if the currently authenticated user has general user management permissions.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @returns {Promise<statusObject>} A statusObject containing the boolean-like permission status (1 or 0).
     */
    static async canManageUsers(req, db) {
        if (!req.isAuthenticated()) {
            return new statusObject(401, 'User not authenticated');
        }
        try {
            const row = await db.get('SELECT can_manage_users FROM users WHERE id = ?', req.user.id);
            if (!row) return new statusObject(404, 'User not found');
            return new statusObject(200, null, row.can_manage_users);
        } catch (error) {
            console.error('Database error in canManageUsers:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Retrieves a paginated and searchable list of users for administrative purposes.
     * Includes the current balance for each user.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {object} options - Options for pagination (page, limit), searching (search), and sorting (sort, order).
     * @returns {Promise<statusObject>} A statusObject containing the list of users and pagination metadata.
     */
    static async getUsers(req, db, options) {
        // Authorization check: Must be able to manage users OR transactions
        const perms = await db.get('SELECT can_manage_users, can_manage_transactions FROM users WHERE id = ?', req.user.id);
        if (!perms || (!perms.can_manage_users && !perms.can_manage_transactions)) {
            return new statusObject(403, 'User not authorized');
        }

        const { page, limit, search, sort, order } = options;
        const offset = (page - 1) * limit;

        // Valid columns for sorting to prevent SQL injection
        const allowedSorts = ['first_name', 'last_name', 'email', 'balance', 'first_aid_expiry', 'filled_legal_info', 'is_member', 'difficulty_level'];
        const sortCol = allowedSorts.includes(sort) ? sort : 'last_name';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        let whereClause = '';
        const params = [];

        // Simple multi-term text search
        if (search) {
            const terms = search.trim().split(/\s+/);
            const conditions = terms.map(term => {
                const termPattern = `%${term}%`;
                params.push(termPattern, termPattern, termPattern);
                return `(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
            });
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        try {
            // Complex query joining users with their sum of transactions (balance)
            const query = `
                SELECT 
                    u.id, u.first_name, u.last_name, u.email, 
                    u.first_aid_expiry, u.filled_legal_info, u.is_member, u.free_sessions, u.difficulty_level,
                    COALESCE(SUM(t.amount), 0) as balance
                FROM users u
                LEFT JOIN transactions t ON u.id = t.user_id
                ${whereClause}
                GROUP BY u.id
                ORDER BY ${sortCol} ${sortOrder}
                LIMIT ? OFFSET ?
            `;

            const users = await db.all(query, [...params, limit, offset]);

            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(*) as count 
                FROM users u
                ${whereClause}
            `;
            const countResult = await db.get(countQuery, params);
            const totalUsers = countResult ? countResult.count : 0;
            const totalPages = Math.ceil(totalUsers / limit);

            return new statusObject(200, null, { users, totalPages, currentPage: page });
        } catch (error) {
            console.error('Database error in getUsers:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Retrieves specific data elements (columns) for a user.
     * Supports both reading own data and reading others (if admin).
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {string|string[]} elements - The column names to retrieve.
     * @param {number|null} id - Target user ID (defaults to current user).
     * @returns {Promise<statusObject>}
     */
    static async getElements(req, db, elements, id = null) {
        if (typeof elements === 'string') {
            elements = [elements];
        }

        if (!req.isAuthenticated()) {
            return new statusObject(401, 'User not authenticated');
        }

        // Authorization: Current user or someone with 'can_manage_users'
        if (id && ((await this.canManageUsers(req, db)).getData() !== 1)) {
            return new statusObject(403, 'User not authorized');
        }

        try {
            const user = await db.get(
                `SELECT ${elements.join(', ')} FROM users WHERE id = ?`,
                id || req.user.id
            );
            if (!user) {
                return new statusObject(404, 'User not found');
            }
            return new statusObject(200, null, user);
        } catch (error) {
            console.error(`Database error in getElements (${elements.join(', ')}):`, error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Updates specific data elements (columns) for a user.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {object} data - Key-value pairs of column names and new values.
     * @param {number|null} id - Target user ID (defaults to current user).
     * @returns {Promise<statusObject>}
     */
    static async writeElements(req, db, data, id = null) {
        if (!req.isAuthenticated()) {
            return new statusObject(401, 'User not authenticated');
        }

        if (id && ((await this.canManageUsers(req, db)).getData() !== 1)) {
            return new statusObject(403, 'User not authorized');
        }

        try {
            await db.run(
                `UPDATE users SET
                    ${Object.keys(data).map(el => `${el} = ?`).join(', ')}
                WHERE id = ?`,
                [...Object.values(data), id || req.user.id]
            );
            return new statusObject(200, null);
        } catch (error) {
            console.error('Database error in writeElements:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Updates a user's membership status.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {boolean} is_member - New status.
     * @param {number|null} userId - Target user ID (defaults to current user).
     * @returns {Promise<statusObject>}
     */
    static async setMembershipStatus(req, db, is_member, userId = null) {
        if (!req.isAuthenticated()) {
            return new statusObject(401, 'User not authenticated');
        }

        if (userId && ((await this.canManageUsers(req, db)).getData() !== 1)) {
            return new statusObject(403, 'User not authorized');
        }

        return db.run(
            `UPDATE users SET is_member = ? WHERE id = ?`,
            [is_member ? 1 : 0, req.user.id]
        ).then(() => new statusObject(200, null))
            .catch((error) => {
                console.error('Database error in setMembershipStatus:', error);
                return new statusObject(500, 'Database error');
            });
    }

    /**
     * Removes a user from the system.
     * Supports both soft delete (clearing password) and hard delete.
     * Also cleans up linked attendance records.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {boolean} real - If true, performs a hard DELETE. Otherwise, updates password to NULL.
     * @param {number|null} userId - Target user ID (defaults to current user).
     * @returns {Promise<statusObject>}
     */
    static async removeUser(req, db, real = false, userId = null) {
        if (!req.isAuthenticated()) {
            return new statusObject(401, 'User not authenticated');
        }

        if (userId && ((await this.canManageUsers(req, db)).getData() !== 1)) {
            return new statusObject(403, 'User not authorized');
        }

        try {
            if (!real) {
                // Soft delete: keep the record but prevent login
                await db.run(
                    `UPDATE users SET hashed_password = NULL WHERE id = ?`,
                    [userId || req.user.id]
                );
            } else {
                // Hard delete: remove the record entirely
                await db.run(
                    `DELETE FROM users WHERE id = ?`,
                    [userId || req.user.id]
                );
            }
            // Always remove attendance records for deleted/deactivated users
            await db.run(
                `DELETE FROM event_attendees WHERE user_id = ?`,
                [userId || req.user.id]
            );
            return new statusObject(200, null);
        } catch (error) {
            console.error('Database error in removeUser:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /** 
     * Resets administrative permissions for all users and assigns the "President" role to a new user.
     * This is a critical security function.
     * @param {object} db - The database instance.
     * @param {number} newPresidentId - The ID of the user who will become the new President.
     * @returns {Promise<statusObject>}
     */
    static async resetPermissions(db, newPresidentId) {
        try {
            // Reset permissions for everyone who is NOT the new president
            await db.run(`
                            UPDATE users 
                            SET can_manage_users = 0, 
                                can_manage_events = 0, 
                                can_manage_transactions = 0, 
                                is_exec = 0
                            WHERE id != ?
                        `, [newPresidentId]);

            // Grant full administrative permissions to the new president
            await db.run(`
                            UPDATE users 
                            SET can_manage_users = 1, 
                                can_manage_events = 1, 
                                can_manage_transactions = 1, 
                                is_exec = 1
                            WHERE id = ?
                        `, [newPresidentId]);
        } catch (error) {
            console.error('Database error in resetPermissions:', error);
            return new statusObject(500, 'Database error');
        }
        return new statusObject(200);
    }
}

module.exports = UserDB;