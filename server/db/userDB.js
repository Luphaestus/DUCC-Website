const { statusObject } = require('../misc/status.js');
const { Permissions } = require('../misc/permissions.js');
const TransactionsDB = require('./transactionDB.js');

/**
 * Database operations for user profiles, permissions, and administrative listings.
 */
class UserDB {

    /**
     * Fetch paginated, searchable user list with balances.
     * @param {object} db
     * @param {object} userPerms - Permissions object.
     * @param {object} options - Pagination, search, and sort parameters.
     * @returns {Promise<statusObject>}
     */
    static async getUsers(db, userPerms, options) {
        const { canManageUsers, canManageTrans, canManageEvents, isScopedExec } = userPerms;

        const { page, limit, search, sort, order, inDebt, isMember, difficulty, permissions } = options;
        const offset = (page - 1) * limit;

        const isOnlyExec = isScopedExec && !canManageUsers && !canManageTrans && !canManageEvents;

        const allowedSorts = ['first_name', 'last_name', 'email', 'balance', 'first_aid_expiry', 'filled_legal_info', 'is_member', 'difficulty_level'];
        let sortCol = allowedSorts.includes(sort) ? sort : 'last_name';
        let sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        let conditions = [];
        const params = [];

        if (search) {
            const terms = search.trim().split(/\s+/);
            const searchConds = terms.map(term => {
                const termPattern = `%${term}%`;
                params.push(termPattern, termPattern);
                if (isOnlyExec) return `(u.first_name LIKE ? OR u.last_name LIKE ? )`;

                params.push(termPattern);
                return `(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`;
            });
            conditions.push('(' + searchConds.join(' AND ') + ')');
        }

        if (isMember !== undefined && isMember !== '') {
            conditions.push(`u.is_member = ?`);
            params.push(isMember === 'true' ? 1 : 0);
        }

        if (difficulty !== undefined && difficulty !== '') {
            conditions.push(`u.difficulty_level = ?`);
            params.push(parseInt(difficulty));
        }

        if (permissions) {
            const permOrs = [];
            const permParts = permissions.split('|').map(p => p.trim());

            for (const p of permParts) {
                if (p === 'perm:is_exec') {
                    permOrs.push(`u.id IN (SELECT user_id FROM user_roles)`);
                } else if (p.startsWith('role:')) {
                    const roleName = p.substring(5);
                    permOrs.push(`u.id IN (SELECT ur.user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = ?)`);
                    params.push(roleName);
                } else {
                    const slug = p.startsWith('perm:') ? p.substring(5) : p;
                    permOrs.push(`(
                        u.id IN (
                            SELECT ur.user_id FROM user_roles ur 
                            JOIN role_permissions rp ON ur.role_id = rp.role_id 
                            JOIN permissions p ON rp.permission_id = p.id 
                            WHERE p.slug = ?
                        ) OR u.id IN (
                            SELECT up.user_id FROM user_permissions up 
                            JOIN permissions p ON up.permission_id = p.id 
                            WHERE p.slug = ?
                        )
                    )`);
                    params.push(slug, slug);
                }
            }
            if (permOrs.length > 0) {
                conditions.push('(' + permOrs.join(' OR ') + ')');
            }
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        let havingClause = '';
        if (inDebt === 'true') {
            havingClause = 'HAVING balance < 0';
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

            let orderBy;
            if (sortCol === 'first_name' || sortCol === 'last_name' || isOnlyExec) {
                const primary = sortCol === 'first_name' ? 'u.first_name' : 'u.last_name';
                const secondary = sortCol === 'first_name' ? 'u.last_name' : 'u.first_name';
                orderBy = `${primary} COLLATE NOCASE ${sortOrder}, ${secondary} COLLATE NOCASE ${sortOrder}`;
            } else {
                orderBy = `${sortCol} ${sortOrder}, u.last_name COLLATE NOCASE ASC`;
            }

            const query = `
                SELECT ${selectFields}
                FROM users u
                ${joinTransactions}
                ${whereClause}
                GROUP BY u.id
                ${havingClause}
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `;

            const users = await db.all(query, [...params, limit, offset]);

            let countQuery;
            if (havingClause) {
                countQuery = `
                    SELECT COUNT(*) as count FROM (
                        SELECT u.id, COALESCE(SUM(t.amount), 0) as balance 
                        FROM users u 
                        LEFT JOIN transactions t ON u.id = t.user_id 
                        ${whereClause} 
                        GROUP BY u.id 
                        HAVING balance < 0
                    )
                `;
            } else {
                countQuery = `SELECT COUNT(*) as count FROM users u ${whereClause}`;
            }

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
     * @param {object} db
     * @param {number} userId
     * @param {string|string[]} elements
     * @returns {Promise<statusObject>}
     */
    static async getElements(db, userId, elements) {
        if (typeof elements === 'string') elements = [elements];

        const mappedElements = elements.map(e =>
            e === 'balance'
                ? '(SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = users.id) as balance'
                : e
        );

        try {
            const user = await db.get(
                `SELECT ${mappedElements.join(', ')} FROM users WHERE id = ?`,
                userId
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
     * @param {object} db
     * @param {number} userId
     * @param {object} data
     * @returns {Promise<statusObject>}
     */
    static async writeElements(db, userId, data) {
        if (data.email) {
            data.email = data.email.replace(/\s/g, '').toLowerCase();
        }

        try {
            await db.run(
                `UPDATE users SET
                    ${Object.keys(data).map(el => `${el} = ?`).join(', ')}
                WHERE id = ?`,
                [...Object.values(data), userId]
            );
            return new statusObject(200, null);
        } catch (error) {
            console.error('Database error in writeElements:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Set membership status.
     * @param {object} db
     * @param {number} userId
     * @param {boolean} is_member
     * @returns {Promise<statusObject>}
     */
    static async setMembershipStatus(db, userId, is_member) {
        return db.run(
            `UPDATE users SET is_member = ? WHERE id = ?`,
            [is_member ? 1 : 0, userId]
        ).then(() => new statusObject(200, null))
            .catch((error) => {
                console.error('Database error in setMembershipStatus:', error);
                return new statusObject(500, 'Database error');
            });
    }

    /**
     * Remove user (soft or hard delete).
     * @param {object} db
     * @param {number} userId
     * @param {boolean} real - If true, performs hard delete.
     * @returns {Promise<statusObject>}
     */
    static async removeUser(db, userId, real = false) {
        const targetId = userId;

        try {
            const allTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
            const tablesWithUserId = [];
            for (const tbl of allTables) {
                const info = await db.all(`PRAGMA table_info(${tbl.name})`);
                if (info.some(c => c.name === 'user_id')) tablesWithUserId.push(tbl.name);
            }

            if (!real) {
                // Soft delete: Keep name and history, anonymize sensitive info, prefix email
                const user = await db.get('SELECT email FROM users WHERE id = ?', [targetId]);
                if (!user) return new statusObject(404, 'User not found');

                // Dynamic Update to clear all unspecified fields
                const cols = await db.all('PRAGMA table_info(users)');
                const keepCols = ['id', 'first_name', 'last_name', 'swims', 'created_at', 'free_sessions', 'difficulty_level'];
                
                const updates = ["email = 'deleted:' || email"];

                for (const col of cols) {
                    if (col.name === 'email') continue;
                    if (keepCols.includes(col.name)) continue;

                    if (col.notnull) {
                        if (col.dflt_value !== null) {
                            updates.push(`${col.name} = ${col.dflt_value}`);
                        } else {
                            updates.push(`${col.name} = 0`);
                        }
                    } else {
                        updates.push(`${col.name} = NULL`);
                    }
                }

                await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, [targetId]);

                // Dynamic delete from related tables (except safe ones)
                const softDeleteSafeTables = ['users', 'swim_history', 'event_attendees', 'transactions'];
                for (const tbl of tablesWithUserId) {
                    if (!softDeleteSafeTables.includes(tbl)) {
                        await db.run(`DELETE FROM ${tbl} WHERE user_id = ?`, [targetId]);
                    }
                }
            } else {
                // Hard delete: delete from all related tables first (if cascade fails/disabled), then user
                for (const tbl of tablesWithUserId) {
                    if (tbl !== 'users') {
                        await db.run(`DELETE FROM ${tbl} WHERE user_id = ?`, [targetId]);
                    }
                }
                await db.run(`DELETE FROM users WHERE id = ?`, [targetId]);
            }
            return new statusObject(200, null);
        } catch (error) {
            console.error('Database error in removeUser:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch full user profile with roles, perms, and tags.
     * @param {object} req
     * @param {object} db
     * @param {number} userId
     * @param {string[]} elements
     * @param {boolean} includeBalance
     * @returns {Promise<statusObject>}
     */
    static async getUserProfile(db, userId, elements, includeBalance) {
        try {
            const query = `
                SELECT u.*, c.name as college_name 
                FROM users u 
                LEFT JOIN colleges c ON u.college_id = c.id 
                WHERE u.id = ?
            `;
            const user = await db.get(query, userId);
            if (!user) return new statusObject(404, 'User not found');

            // Filter elements
            const filteredUser = {};
            elements.forEach(key => {
                if (user[key] !== undefined) filteredUser[key] = user[key];
            });

            // Add balance if requested
            if (includeBalance) {
                const balanceRes = await TransactionsDB.get_balance(db, userId);
                if (balanceRes.isError()) return balanceRes;
                filteredUser.balance = balanceRes.getData();
            }

            return new statusObject(200, null, filteredUser);
        } catch (error) {
            console.error('Database error fetching user profile:', error);
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
            await db.run('BEGIN TRANSACTION');

            await db.run(`DELETE FROM user_roles`);
            await db.run(`DELETE FROM user_permissions`);
            await db.run(`DELETE FROM user_managed_tags`);

            const legalFields = [
                "date_of_birth", "college_id", "emergency_contact_name", "emergency_contact_phone",
                "home_address", "phone_number", "has_medical_conditions", "medical_conditions_details",
                "takes_medication", "medication_details", "agrees_to_fitness_statement",
                "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data"
            ];
            const setClause = legalFields.map(f => `${f} = NULL`).join(', ') + ", filled_legal_info = 0, legal_filled_at = NULL";
            
            await db.run(`UPDATE users SET ${setClause} WHERE agrees_to_keep_health_data = 0 OR agrees_to_keep_health_data IS NULL`);

            const presidentRole = await db.get('SELECT id FROM roles WHERE name = ?', ['President']);
            if (presidentRole) {
                await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [newPresidentId, presidentRole.id]);
            }

            await db.run('COMMIT');
            return new statusObject(200);
        } catch (error) {
            await db.run('ROLLBACK');
            console.error('Database error in resetPermissions:', error);
            return new statusObject(500, 'Database error');
        }
    }
}

module.exports = UserDB;