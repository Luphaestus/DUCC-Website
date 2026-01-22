/**
 * userDB.js
 * 
 * This module handles all core database operations for user profiles and management.
 * It manages user data fetching (including pagination and complex filtering),
 * profile updates, soft/hard deletion, and administrative permission resets.
 */

const { statusObject } = require('../misc/status.js');
const { Permissions } = require('../misc/permissions.js');
const TransactionsDB = require('./transactionDB.js');

/**
 * Database operations for user profiles, permissions, and administrative listings.
 */
class UserDB {

    /**
     * Fetch a paginated, searchable, and filterable list of users.
     * Restricts data visibility based on the requesting administrator's permissions.
     * @param {object} db - Database connection.
     * @param {object} userPerms - Mapping of the admin's management capabilities.
     * @param {object} options - Search and pagination filters.
     * @returns {Promise<statusObject>} - Data contains { users, totalPages, currentPage }.
     */
    static async getUsers(db, userPerms, options) {
        const { canManageUsers, canManageTrans, canManageEvents, isScopedExec } = userPerms;

        const { page, limit, search, sort, order, inDebt, isMember, difficulty, permissions } = options;
        const offset = (page - 1) * limit;

        // Scoped Execs who can't manage anything else have severely restricted data access
        const isOnlyExec = isScopedExec && !canManageUsers && !canManageTrans && !canManageEvents;

        const allowedSorts = ['first_name', 'last_name', 'email', 'balance', 'first_aid_expiry', 'filled_legal_info', 'is_member', 'difficulty_level'];
        let sortCol = allowedSorts.includes(sort) ? sort : 'last_name';
        let sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        let conditions = [];
        const params = [];

        // Handle multi-term searching
        if (search) {
            const terms = search.trim().split(/\s+/);
            const searchConds = terms.map(term => {
                const termPattern = `%${term}%`;
                params.push(termPattern, termPattern);
                // Scoped execs can't search by email (PII protection)
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

        // Handle complex permission filtering (OR logic)
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

            // Restrict returned columns based on admin role
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

            // Total count calculation (including debt sub-query if needed)
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
     * Fetch a specific set of columns for a user.
     * @param {object} db - Database connection.
     * @param {number} userId - ID of the user.
     * @param {string|string[]} elements - Keys to fetch.
     * @returns {Promise<statusObject>} - Data is an object with requested fields.
     */
    static async getElements(db, userId, elements) {
        if (typeof elements === 'string') elements = [elements];

        // Handle the 'balance' virtual column by mapping it to a sub-select
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
     * Fetch specific columns for a user by ID. Identical to getElements but intended for internal system usage.
     */
    static async getElementsById(db, id, elements) {
        return this.getElements(db, id, elements);
    }

    /**
     * Update user fields based on their ID.
     * @param {object} db - Database connection.
     * @param {number} id - User ID.
     * @param {object} data - Map of field names to new values.
     * @returns {Promise<statusObject>}
     */
    static async writeElementsById(db, id, data) {
        if (data.email) {
            data.email = data.email.replace(/\s/g, '').toLowerCase();
        }
        try {
            // Build dynamic update query keys
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
     * Update user fields. Identical to writeElementsById.
     */
    static async writeElements(db, userId, data) {
        return this.writeElementsById(db, userId, data);
    }

    /**
     * Explicitly toggle a user's membership status.
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
     * Remove a user from the system.
     * Defaults to a "soft delete" which anonymizes PII and prefixes the email but keeps history.
     * @param {object} db - Database connection.
     * @param {number} userId - Target user ID.
     * @param {boolean} [real=false] - If true, performs a destructive hard delete.
     * @returns {Promise<statusObject>}
     */
    static async removeUser(db, userId, real = false) {
        const targetId = userId;

        try {
            // Identify all tables that have a foreign key to the user
            const allTables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
            const tablesWithUserId = [];
            for (const tbl of allTables) {
                const info = await db.all(`PRAGMA table_info(${tbl.name})`);
                if (info.some(c => c.name === 'user_id')) tablesWithUserId.push(tbl.name);
            }

            if (!real) {
                // Soft delete logic:
                // Prefix email with 'deleted:' to free up the unique constraint
                // Clear all PII fields (medical, address, phone, etc.)
                // Keep first/last name and historical record links (attendance, transactions)
                
                const user = await db.get('SELECT email FROM users WHERE id = ?', [targetId]);
                if (!user) return new statusObject(404, 'User not found');

                const cols = await db.all('PRAGMA table_info(users)');
                const keepCols = ['id', 'first_name', 'last_name', 'swims', 'created_at', 'free_sessions', 'difficulty_level'];
                
                const updates = ["email = 'deleted:' || email"];

                for (const col of cols) {
                    if (col.name === 'email') continue;
                    if (keepCols.includes(col.name)) continue;

                    // Clear column based on its type and nullability
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

                // Wipe rows in auxiliary tables that don't need to be kept for auditing
                const softDeleteSafeTables = ['users', 'swim_history', 'event_attendees', 'transactions'];
                for (const tbl of tablesWithUserId) {
                    if (!softDeleteSafeTables.includes(tbl)) {
                        await db.run(`DELETE FROM ${tbl} WHERE user_id = ?`, [targetId]);
                    }
                }
            } else {
                // Destructive hard delete
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
     * Fetch a comprehensive user profile, including college data and balance.
     * @param {object} db - Database connection.
     * @param {number} userId - User ID.
     * @param {string[]} elements - Keys to include in the output.
     * @param {boolean} includeBalance - If true, calculates and attaches the balance.
     * @returns {Promise<statusObject>} - Data contains filtered user object.
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

            // Strip any fields not requested
            const filteredUser = {};
            elements.forEach(key => {
                if (user[key] !== undefined) filteredUser[key] = user[key];
            });

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
     * Perform a total system permission reset and assign a new President.
     * Also scrubs legal/medical data for users who have not opted-in to long-term storage.
     * This is a sensitive operation wrapped in a transaction.
     * @param {object} db - Database connection.
     * @param {number} newPresidentId - User ID to grant President role.
     * @returns {Promise<statusObject>}
     */
    static async resetPermissions(db, newPresidentId) {
        try {
            await db.run('BEGIN TRANSACTION');

            // Wipe all assigned roles, direct permissions, and scopes
            await db.run(`DELETE FROM user_roles`);
            await db.run(`DELETE FROM user_permissions`);
            await db.run(`DELETE FROM user_managed_tags`);

            // GDPR Logic: Scrub data for users who didn't explicitly agree to keep health data
            const legalFields = [
                "date_of_birth", "college_id", "emergency_contact_name", "emergency_contact_phone",
                "home_address", "phone_number", "has_medical_conditions", "medical_conditions_details",
                "takes_medication", "medication_details", "agrees_to_fitness_statement",
                "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data"
            ];
            const setClause = legalFields.map(f => `${f} = NULL`).join(', ') + ", filled_legal_info = 0, legal_filled_at = NULL";
            
            await db.run(`UPDATE users SET ${setClause} WHERE agrees_to_keep_health_data = 0 OR agrees_to_keep_health_data IS NULL`);

            // Assign the new President
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