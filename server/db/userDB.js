const { statusObject } = require('../misc/status.js');

/**
 * Database operations for user profiles, permissions, and administrative listings.
 */
class UserDB {

    /**
     * Verifies user management permissions.
     * @param {object} req
     * @param {object} db
     * @returns {Promise<statusObject>}
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
     * Fetch paginated, searchable user list with balances.
     * @param {object} req
     * @param {object} db
     * @param {object} options - Pagination, search, and sort parameters.
     * @returns {Promise<statusObject>}
     */
    static async getUsers(req, db, options) {
        const perms = await db.get('SELECT can_manage_users, can_manage_transactions, is_exec FROM users WHERE id = ?', req.user.id);
        if (!perms || (!perms.can_manage_users && !perms.can_manage_transactions && !perms.is_exec)) {
            return new statusObject(403, 'User not authorized');
        }

        const { page, limit, search, sort, order } = options;
        const offset = (page - 1) * limit;

        const isOnlyExec = perms.is_exec && !perms.can_manage_users && !perms.can_manage_transactions;

        const allowedSorts = ['first_name', 'last_name', 'email', 'balance', 'first_aid_expiry', 'filled_legal_info', 'is_member', 'difficulty_level'];
        let sortCol = allowedSorts.includes(sort) ? sort : (isOnlyExec ? 'first_name' : 'last_name');
        let sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        let whereClause = '';
        const params = [];

        if (search) {
            const terms = search.trim().split(/\s+/);
            const conditions = terms.map(term => {
                const termPattern = `%${term}%`;
                params.push(termPattern, termPattern);
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

            const countQuery = `SELECT COUNT(*) as count FROM users u ${whereClause}`;
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
     * Fetch specific columns for a user.
     * @param {object} req
     * @param {object} db
     * @param {string|string[]} elements
     * @param {number|null} id - Target user ID (defaults to current).
     * @returns {Promise<statusObject>}
     */
    static async getElements(req, db, elements, id = null) {
        if (typeof elements === 'string') elements = [elements];

        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        if (id && ((await this.canManageUsers(req, db)).getData() !== 1)) {
            return new statusObject(403, 'User not authorized');
        }

        const mappedElements = elements.map(e => 
            e === 'balance' 
                ? '(SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = users.id) as balance' 
                : e
        );

        try {
            const user = await db.get(
                `SELECT ${mappedElements.join(', ')} FROM users WHERE id = ?`,
                id || req.user.id
            );
            if (!user) return new statusObject(404, 'User not found');
            return new statusObject(200, null, user);
        } catch (error) {
            console.error(`Database error in getElements (${elements.join(', ')}):`, error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch specific columns for a user by ID (Internal/System use).
     * @param {object} db
     * @param {number} id
     * @param {string|string[]} elements
     * @returns {Promise<statusObject>}
     */
    static async getElementsById(db, id, elements) {
        if (typeof elements === 'string') elements = [elements];

        const mappedElements = elements.map(e => 
            e === 'balance' 
                ? '(SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = users.id) as balance' 
                : e
        );

        try {
            const user = await db.get(
                `SELECT ${mappedElements.join(', ')} FROM users WHERE id = ?`,
                id
            );
            if (!user) return new statusObject(404, 'User not found');
            return new statusObject(200, null, user);
        } catch (error) {
            console.error(`Database error in getElementsById (${elements.join(', ')}):`, error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update user columns by ID (Internal/System use).
     * @param {object} db
     * @param {number} id
     * @param {object} data
     * @returns {Promise<statusObject>}
     */
    static async writeElementsById(db, id, data) {
        if (data.email) {
            data.email = data.email.replace(/\s/g, '').toLowerCase();
        }
        try {
            await db.run(
                `UPDATE users SET
                    ${Object.keys(data).map(el => `${el} = ?`).join(', ')}
                WHERE id = ?`,
                [...Object.values(data), id]
            );
            return new statusObject(200, null);
        } catch (error) {
            console.error('Database error in writeElementsById:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update user columns.
     * @param {object} req
     * @param {object} db
     * @param {object} data
     * @param {number|null} id
     * @returns {Promise<statusObject>}
     */
    static async writeElements(req, db, data, id = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        if (id && ((await this.canManageUsers(req, db)).getData() !== 1)) {
            return new statusObject(403, 'User not authorized');
        }

        if (data.email) {
            data.email = data.email.replace(/\s/g, '').toLowerCase();
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
     * Set membership status.
     * @param {object} req
     * @param {object} db
     * @param {boolean} is_member
     * @param {number|null} userId
     * @returns {Promise<statusObject>}
     */
    static async setMembershipStatus(req, db, is_member, userId = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

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
     * Remove user (soft or hard delete).
     * @param {object} req
     * @param {object} db
     * @param {boolean} real - If true, performs hard delete.
     * @param {number|null} userId
     * @returns {Promise<statusObject>}
     */
    static async removeUser(req, db, real = false, userId = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        if (userId && ((await this.canManageUsers(req, db)).getData() !== 1)) {
            return new statusObject(403, 'User not authorized');
        }

        const targetId = userId || req.user.id;

        try {
            if (!real) {
                // Soft delete: Anonymize user data but keep stats (swims, attendance)
                await db.run(`
                    UPDATE users SET 
                        hashed_password = NULL,
                        first_name = 'Deleted',
                        last_name = 'User',
                        email = 'deleted_' || id || '@durham.ac.uk', 
                        phone_number = NULL,
                        home_address = NULL,
                        emergency_contact_name = NULL,
                        emergency_contact_phone = NULL,
                        medical_conditions_details = NULL,
                        medication_details = NULL,
                        profile_picture_path = NULL,
                        is_member = 0,
                        is_instructor = 0,
                        is_exec = 0,
                        can_manage_users = 0,
                        can_manage_events = 0,
                        can_manage_transactions = 0
                    WHERE id = ?`,
                    [targetId]
                );
            } else {
                await db.run(`DELETE FROM users WHERE id = ?`, [targetId]);
                await db.run(`DELETE FROM event_attendees WHERE user_id = ?`, [targetId]);
            }
            return new statusObject(200, null);
        } catch (error) {
            console.error('Database error in removeUser:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Verifies exec permissions.
     * @param {object} req
     * @param {object} db
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
     * Add swims and record in history.
     * @param {object} req
     * @param {object} db
     * @param {number} userId
     * @param {number} count
     * @returns {Promise<statusObject>}
     */
    static async addSwims(req, db, userId, count) {
        const canManage = await this.canManageSwims(req, db);
        if (canManage.isError()) return canManage;
        if (!canManage.getData()) return new statusObject(403, 'User not authorized to manage swims');

        try {
            await db.run('BEGIN TRANSACTION');
            await db.run('UPDATE users SET swims = swims + ? WHERE id = ?', [count, userId]);
            await db.run('INSERT INTO swim_history (user_id, added_by, count) VALUES (?, ?, ?)', [userId, req.user.id, count]);
            await db.run('COMMIT');
            return new statusObject(200, 'Swims added successfully');
        } catch (error) {
            await db.run('ROLLBACK');
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Get academic year start date (Sept 1st).
     */
    static getAcademicYearStart() {
        const now = new Date();
        const year = now.getMonth() < 8 ? now.getFullYear() - 1 : now.getFullYear();
        return new Date(year, 8, 1).toISOString();
    }

    /**
     * Fetch swim leaderboard (all-time or yearly).
     * @param {object} db
     * @param {boolean} yearly
     * @returns {Promise<statusObject>}
     */
    static async getSwimsLeaderboard(db, yearly = false) {
        try {
            let query;
            let params = [];

            if (yearly) {
                const start = this.getAcademicYearStart();
                query = `
                    SELECT u.first_name, u.last_name, SUM(sh.count) as swims
                    FROM users u
                    JOIN swim_history sh ON u.id = sh.user_id
                    WHERE sh.created_at >= ?
                    GROUP BY u.id
                    HAVING swims > 0
                    ORDER BY swims DESC, u.last_name ASC
                `;
                params.push(start);
            } else {
                query = 'SELECT first_name, last_name, swims FROM users WHERE swims > 0 ORDER BY swims DESC, last_name ASC';
            }

            const users = await db.all(query, params);

            let rank = 0;
            let lastSwims = -1;
            const leaderboard = users.map((user) => {
                if (user.swims !== lastSwims) {
                    rank++;
                    lastSwims = user.swims;
                }
                return { ...user, rank };
            });

            return new statusObject(200, null, leaderboard);
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch user's swim rank and count.
     * @param {object} db
     * @param {number} userId
     * @param {boolean} yearly
     * @returns {Promise<statusObject>}
     */
    static async getUserSwimmerRank(db, userId, yearly = false) {
        try {
            let allSwimmers;
            if (yearly) {
                const start = this.getAcademicYearStart();
                allSwimmers = await db.all(`
                    SELECT u.id, SUM(sh.count) as swims
                    FROM users u
                    JOIN swim_history sh ON u.id = sh.user_id
                    WHERE sh.created_at >= ?
                    GROUP BY u.id
                    ORDER BY swims DESC
                `, [start]);
            } else {
                allSwimmers = await db.all('SELECT id, swims FROM users ORDER BY swims DESC');
            }

            let rank = 0;
            let lastSwims = -1;
            let userRank = -1;
            let userSwims = 0;

            if (allSwimmers && allSwimmers.length > 0) {
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
            }

            return new statusObject(200, null, { rank: userRank, swims: userSwims });
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /** 
     * Reset permissions and assign new President.
     * @param {object} db
     * @param {number} newPresidentId
     * @returns {Promise<statusObject>}
     */
    static async resetPermissions(db, newPresidentId) {
        try {
            await db.run(`
                            UPDATE users 
                            SET can_manage_users = 0, 
                                can_manage_events = 0, 
                                can_manage_transactions = 0, 
                                is_exec = 0
                            WHERE id != ?
                        `, [newPresidentId]);

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