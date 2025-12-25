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
        // Authorization check: Must be able to manage users OR transactions OR be exec
        const perms = await db.get('SELECT can_manage_users, can_manage_transactions, is_exec FROM users WHERE id = ?', req.user.id);
        if (!perms || (!perms.can_manage_users && !perms.can_manage_transactions && !perms.is_exec)) {
            return new statusObject(403, 'User not authorized');
        }

        const { page, limit, search, sort, order } = options;
        const offset = (page - 1) * limit;

        const isOnlyExec = perms.is_exec && !perms.can_manage_users && !perms.can_manage_transactions;

        // Valid columns for sorting
        const allowedSorts = ['first_name', 'last_name', 'email', 'balance', 'first_aid_expiry', 'filled_legal_info', 'is_member', 'difficulty_level'];
        let sortCol = allowedSorts.includes(sort) ? sort : (isOnlyExec ? 'first_name' : 'last_name');
        let sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        let whereClause = '';
        const params = [];

        // Simple multi-term text search
        if (search) {
            const terms = search.trim().split(/\s+/);
            const conditions = terms.map(term => {
                const termPattern = `%${term}%`;
                params.push(termPattern, termPattern);
                // Restricted search for execs
                if (isOnlyExec) return `(u.first_name LIKE ? OR u.last_name LIKE ? )`;
                
                params.push(termPattern);
                return `(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
            });
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        try {
            let selectFields;
            let joinTransactions = '';
            
            if (isOnlyExec) {
                selectFields = `u.id, u.first_name, u.last_name`;
            } else {
                selectFields = `
                    u.id, u.first_name, u.last_name, u.email, 
                    u.first_aid_expiry, u.filled_legal_info, u.is_member, u.free_sessions, u.difficulty_level,
                    u.swims,
                    COALESCE(SUM(t.amount), 0) as balance
                `;
                joinTransactions = `LEFT JOIN transactions t ON u.id = t.user_id`;
            }

            // Enhanced sorting for names (case-insensitive)
            let orderBy = `${sortCol} ${sortOrder}`;
            if (sortCol === 'first_name' || isOnlyExec) {
                orderBy = `u.first_name COLLATE NOCASE ${sortOrder}, u.last_name COLLATE NOCASE ${sortOrder}`;
            } else if (sortCol === 'last_name') {
                orderBy = `u.last_name COLLATE NOCASE ${sortOrder}, u.first_name COLLATE NOCASE ${sortOrder}`;
            }

            const query = `
                SELECT ${selectFields}
                FROM users u
                ${joinTransactions}
                ${whereClause}
                GROUP BY u.id
                ORDER BY ${orderBy}
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
     * Checks if the currently authenticated user is an exec.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @returns {Promise<statusObject>}
     */
    static async canManageSwims(req, db) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        try {
            const row = await db.get('SELECT is_exec FROM users WHERE id = ?', req.user.id);
            if (!row) return new statusObject(404, 'User not found');
            return new statusObject(200, null, !!row.is_exec);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Adds a number of swims to a user.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} userId - Target user ID.
     * @param {number} count - Number of swims to add.
     * @returns {Promise<statusObject>}
     */
    static async addSwims(req, db, userId, count) {
        const canManage = await this.canManageSwims(req, db);
        if (canManage.isError()) return canManage;
        if (!canManage.getData()) return new statusObject(403, 'User not authorized to manage swims');

        try {
            await db.run('UPDATE users SET swims = swims + ? WHERE id = ?', [count, userId]);
            return new statusObject(200, 'Swims added successfully');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Gets the swim leaderboard.
     * @param {object} db - The database instance.
     * @returns {Promise<statusObject>}
     */
    static async getSwimsLeaderboard(db) {
        try {
            const users = await db.all('SELECT first_name, last_name, swims FROM users WHERE swims > 0 ORDER BY swims DESC, last_name ASC');
            
            // Calculate ranks with ties (dense rank)
            let rank = 0;
            let lastSwims = -1;
            const leaderboard = users.map((user, index) => {
                if (user.swims !== lastSwims) {
                    rank++;
                    lastSwims = user.swims;
                }
                return { ...user, rank };
            });

            return new statusObject(200, null, leaderboard);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Gets the swimmer rank for a specific user.
     * @param {object} db - The database instance.
     * @param {number} userId - The target user ID.
     * @returns {Promise<statusObject>}
     */
    static async getUserSwimmerRank(db, userId) {
        try {
            const allSwimmers = await db.all('SELECT id, swims FROM users ORDER BY swims DESC');
            
            let rank = 0;
            let lastSwims = -1;
            let userRank = -1;
            let userSwims = 0;

            for (const s of allSwimmers) {
                if (s.swims !== lastSwims) {
                    rank++;
                    lastSwims = s.swims;
                }
                if (s.id === userId) {
                    userRank = rank;
                    userSwims = s.swims;
                    break;
                }
            }

            return new statusObject(200, null, { rank: userRank, swims: userSwims });
        } catch (error) {
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