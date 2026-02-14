/**
 * userDB.ts
 * 
 * This module handles core database operations for user profiles and management.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';
import Utils from '../misc/utils.js';

interface UserPermissions {
    canManageUsers: boolean;
    canManageTrans: boolean;
    canManageEvents: boolean;
    isScopedExec: boolean;
}

interface GetUsersOptions {
    page?: number | string;
    limit?: number | string;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    inDebt?: string; // 'true' or undefined
    isMember?: string; // 'true', 'false', or undefined
    difficulty?: string | number;
    permissions?: string;
}

export default class UserDB {
    /**
     * Fetch a paginated, searchable, and filterable list of users.
     */
    static async getUsers(db: DatabaseWrapper, userPerms: UserPermissions, options: GetUsersOptions): Promise<statusObject> {
        const { canManageUsers, canManageTrans, canManageEvents, isScopedExec } = userPerms;
        const { page = 1, limit = 20, search, sort, order, inDebt, isMember, difficulty, permissions } = options;
        const offset = (Number(page) - 1) * Number(limit);

        const isOnlyExec = isScopedExec && !canManageUsers && !canManageTrans && !canManageEvents;

        const allowedSorts = ['first_name', 'last_name', 'email', 'balance', 'first_aid_expiry', 'filled_legal_info', 'is_member', 'difficulty_level'];
        const sortSql = Utils.getSortSql(sort, allowedSorts, 'last_name', order);

        let conditions: string[] = [];
        const params: any[] = [];

        if (search) {
            const terms = search.trim().split(/\s+/);
            const matchTerms = terms.map(t => `+${t}*`).join(' ');
            
            // Try MATCH first (fast, handles AND across words)
            // AND also check each term with LIKE for partial matching within words
            const termConditions = terms.map(() => `(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)`);
            const termParams = terms.flatMap(t => [`%${t}%`, `%${t}%`, `%${t}%`]);

            conditions.push(`(MATCH(u.first_name, u.last_name, u.email) AGAINST(? IN BOOLEAN MODE) OR (${termConditions.join(' AND ')}))`);
            params.push(matchTerms, ...termParams);
        }

        if (isMember !== undefined && isMember !== '') {
            if (isMember === 'true') {
                conditions.push(`(u.is_member = 1 OR u.is_permanent_member = 1)`);
            } else { // isMember === 'false'
                conditions.push(`(u.is_member = 0 AND u.is_permanent_member = 0)`);
            }
        }

        if (difficulty !== undefined && difficulty !== '') {
            conditions.push(`u.difficulty_level = ?`);
            params.push(Number(difficulty));
        }

        if (permissions) {
            const permOrs: string[] = [];
            const permParts = permissions.split('|').map(p => p.trim());

            for (const p of permParts) {
                if (p === 'perm:is_exec') {
                    permOrs.push(`EXISTS(SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id)`);
                } else if (p.startsWith('role:')) {
                    const roleName = p.substring(5);
                    permOrs.push(`EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = u.id AND r.name = ?)`);
                    params.push(roleName);
                } else {
                    const slug = p.startsWith('perm:') ? p.substring(5) : p;
                    permOrs.push(`(
                        EXISTS(SELECT 1 FROM user_roles ur 
                               JOIN role_permissions rp ON ur.role_id = rp.role_id 
                               JOIN permissions p ON rp.permission_id = p.id 
                               WHERE ur.user_id = u.id AND p.slug = ?)
                        OR EXISTS(SELECT 1 FROM user_permissions up 
                                  JOIN permissions p ON up.permission_id = p.id 
                                  WHERE up.user_id = u.id AND p.slug = ?)
                    )`);
                    params.push(slug, slug);
                }
            }
            if (permOrs.length > 0) conditions.push('(' + permOrs.join(' OR ') + ')');
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const havingClause = inDebt === 'true' ? 'HAVING balance + (CASE WHEN u.debt_limit_expires_at IS NULL OR u.debt_limit_expires_at > NOW() THEN u.debt_limit ELSE 0 END) < 0' : '';

        try {
            const selectFields = isOnlyExec 
                ? `u.id, u.first_name, u.last_name`
                : `u.id, u.first_name, u.last_name, u.email, 
                   u.first_aid_expiry, u.filled_legal_info, u.is_member, u.free_sessions, u.difficulty_level,
                   u.swims, u.booties, u.debt_limit, u.debt_limit_expires_at, u.is_permanent_member,
                   (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.user_id = u.id) as balance,
                   u.profile_picture_id, u.profile_picture_color, u.profile_picture_font, u.profile_picture_initials,
                   (SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63 USING utf8mb4), "view=true") FROM files f WHERE f.id = u.profile_picture_id) as profile_picture_path`;

            const orderBy = (sortSql.startsWith('first_name') || sortSql.startsWith('last_name') || isOnlyExec)
                ? (sortSql.startsWith('first_name') ? `u.first_name ${sortSql.split(' ')[1]}, u.last_name` : `u.last_name ${sortSql.split(' ')[1]}, u.first_name`)
                : `u.${sortSql}, u.last_name ASC`;

            const query = `
                SELECT ${selectFields}
                FROM users u
                ${whereClause}
                ${havingClause}
                ORDER BY ${orderBy}
                LIMIT ? OFFSET ?
            `;

            const users = await db.all(query, [...params, Number(limit), Number(offset)]);

            const countQuery = havingClause 
                ? `SELECT COUNT(*) as count FROM (SELECT u.id, (SELECT COALESCE(SUM(t.amount), 0) FROM transactions t WHERE t.user_id = u.id) as balance, u.debt_limit, u.debt_limit_expires_at FROM users u ${whereClause} HAVING balance + (CASE WHEN u.debt_limit_expires_at IS NULL OR u.debt_limit_expires_at > NOW() THEN u.debt_limit ELSE 0 END) < 0) as sub`
                : `SELECT COUNT(*) as count FROM users u ${whereClause}`;

            const countResult = await db.get(countQuery, params);
            const totalUsers = countResult ? countResult.count : 0;
            const totalPages = Math.ceil(totalUsers / Number(limit));

            return new statusObject(200, null, { users, totalPages, currentPage: Number(page) });
        } catch (error) {
            Logger.error('Database error in getUsers:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch a specific set of columns for a user.
     */
    static async getElements(db: DatabaseWrapper, userId: number, elements: string | string[]): Promise<statusObject> {
        if (typeof elements === 'string') elements = [elements];

        const needsPermanentMember = (elements as string[]).includes('is_member') || (elements as string[]).includes('is_permanent_member');
        const selectFields = [...new Set([...(elements as string[]), ...(needsPermanentMember ? ['is_permanent_member'] : [])])];
        const selectMapped = selectFields.map(e => {
            if (e === 'balance') return '(SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = users.id) as balance';
            if (e === 'profile_picture_path') return '(SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63 USING utf8mb4), "view=true") FROM files f WHERE f.id = users.profile_picture_id) as profile_picture_path';
            return e;
        });

        try {
            const user = await db.get(
                `SELECT ${selectMapped.join(', ')} FROM users WHERE id = ?`,
                [userId]
            );
            if (!user) return new statusObject(404, 'User not found');

            if (user.is_permanent_member === 1 && user.is_member !== undefined) {
                user.is_member = 1; // Force is_member to true if they are a permanent member
            }

            // Filter output to only requested elements
            const filteredResult: any = {};
            (elements as string[]).forEach(e => {
                filteredResult[e] = user[e];
            });

            return new statusObject(200, null, filteredResult);
        } catch (error: any) {
            Logger.error(`Database error in getElements (${(elements as string[]).join(', ')}):`, error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch specific columns for a user by ID.
     */
    static async getElementsById(db: DatabaseWrapper, id: number, elements: string | string[]): Promise<statusObject> {
        return this.getElements(db, id, elements);
    }

    /**
     * Update user fields based on their ID.
     */
    static async writeElementsById(db: DatabaseWrapper, id: number, data: any): Promise<statusObject> {
        if (data.email) {
            data.email = data.email.replace(/\s/g, '').toLowerCase();
        }
        try {
            const keys = Object.keys(data);
            if (keys.length === 0) return new statusObject(200, null);

            await db.run(
                `UPDATE users SET ${keys.map(el => `${el} = ?`).join(', ')} WHERE id = ?`,
                [...Object.values(data), id]
            );
            return new statusObject(200, null);
        } catch (error) {
            Logger.error('Database error in writeElementsById:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update user fields.
     */
    static async writeElements(db: DatabaseWrapper, userId: number, data: any): Promise<statusObject> {
        return this.writeElementsById(db, userId, data);
    }

    /**
     * Explicitly toggle a user's membership status.
     */
    static async setMembershipStatus(db: DatabaseWrapper, userId: number, is_member: boolean): Promise<statusObject> {
        return db.run(
            `UPDATE users SET is_member = ? WHERE id = ?`,
            [is_member ? 1 : 0, userId]
        ).then(() => new statusObject(200, null))
            .catch((error) => {
                Logger.error('Database error in setMembershipStatus:', error);
                return new statusObject(500, 'Database error');
            });
    }

    /**
     * Remove a user from the system.
     */
    static async removeUser(db: DatabaseWrapper, userId: number, real: boolean = false): Promise<statusObject> {
        try {
            if (!real) {
                // Soft delete: clear personal info but keep record for historical integrity
                const user = await db.get('SELECT email FROM users WHERE id = ?', [userId]);
                if (!user) return new statusObject(404, 'User not found');

                // Clear most fields, but keep ID, names (for logs), and swims
                await db.run(`
                    UPDATE users SET 
                        email = CONCAT('deleted:', email),
                        hashed_password = NULL,
                        date_of_birth = NULL,
                        college_id = NULL,
                        emergency_contact_name = NULL,
                        emergency_contact_phone = NULL,
                        home_address = NULL,
                        phone_number = NULL,
                        has_medical_conditions = 0,
                        medical_conditions_details = NULL,
                        takes_medication = 0,
                        medication_details = NULL,
                        has_dietary_info = 0,
                        dietary_info_details = NULL,
                        profile_picture_id = NULL,
                        profile_picture_color = NULL,
                        profile_picture_font = NULL,
                        profile_picture_initials = NULL,
                        filled_legal_info = 0,
                        legal_filled_at = NULL
                    WHERE id = ?
                `, [userId]);

                // Also clean up some related data that isn't historical
                await db.run('DELETE FROM user_roles WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM user_permissions WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM user_managed_tags WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM event_waiting_list WHERE user_id = ?', [userId]);
                await db.run('DELETE FROM cars WHERE user_id = ?', [userId]);
            } else {
                // Hard delete: relies on ON DELETE CASCADE in the schema
                await db.run('DELETE FROM users WHERE id = ?', [userId]);
            }
            return new statusObject(200, null);
        } catch (error) {
            Logger.error('Database error in removeUser:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch a comprehensive user profile, including college data and balance.
     */
    static async getUserProfile(db: DatabaseWrapper, userId: number, elements: string[], includeBalance: boolean): Promise<statusObject> {
        try {
            const query = `
                SELECT u.*, c.name as college_name,
                       (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = u.id) as balance,
                       (SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63 USING utf8mb4), "view=true") FROM files f WHERE f.id = u.profile_picture_id) as profile_picture_path
                FROM users u 
                LEFT JOIN colleges c ON u.college_id = c.id 
                WHERE u.id = ?
            `;
            const user = await db.get(query, [userId]);
            if (!user) return new statusObject(404, 'User not found');

            const result: any = {};
            elements.forEach(key => {
                if (user[key] !== undefined) result[key] = user[key];
            });
            if (includeBalance) result.balance = user.balance;

            // Ensure profile customization fields are included if requested or by default if not filtered
            const customFields = ['profile_picture_color', 'profile_picture_font', 'profile_picture_initials', 'profile_picture_path'];
            customFields.forEach(f => {
                if (user[f] !== undefined && !result[f]) result[f] = user[f];
            });

            return new statusObject(200, null, result);
        } catch (error) {
            Logger.error('Database error fetching user profile:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /** 
     * Perform a total system permission reset and assign a new President.
     */
    static async resetPermissions(db: DatabaseWrapper, newPresidentId: number): Promise<statusObject> {
        // Dynamic imports to avoid circular dependencies
        const ExecDB = (await import('./execDB.js')).default;

        return db.transaction(async (tx) => {
            // Find the current President and mark them as permanent member
            const currentPresident = await tx.get(
                'SELECT u.id FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE r.name = ?',
                ['President']
            );
            if (currentPresident) {
                await tx.run('UPDATE users SET is_permanent_member = 1, goodbye_role = ? WHERE id = ?', ['President', currentPresident.id]);
            }

            // Archive current committee before wiping roles
            await ExecDB.archiveCurrentCommittee(tx);

            await tx.run(`DELETE FROM user_roles`);
            await tx.run(`DELETE FROM user_permissions`);
            await tx.run(`DELETE FROM user_managed_tags`);

            await tx.run(`
                UPDATE users SET 
                    date_of_birth = NULL, college_id = NULL, emergency_contact_name = NULL, 
                    emergency_contact_phone = NULL, home_address = NULL, phone_number = NULL, 
                    has_medical_conditions = 0, medical_conditions_details = NULL, 
                    takes_medication = 0, medication_details = NULL, 
                    has_dietary_info = 0, dietary_info_details = NULL,
                    agrees_to_fitness_statement = 0,
                    agrees_to_club_rules = 0, agrees_to_pay_debts = 0, agrees_to_data_storage = 0, 
                    agrees_to_keep_health_data = 0, filled_legal_info = 0, legal_filled_at = NULL
                WHERE agrees_to_keep_health_data = 0 OR agrees_to_keep_health_data IS NULL
            `);

            const presidentRole = await tx.get('SELECT id FROM roles WHERE name = ?', ['President']);
            if (presidentRole) {
                await tx.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [newPresidentId, presidentRole.id]);
                // Sync new president to the (now archived) exec committee
                await ExecDB.syncExecMember(tx, newPresidentId);
            }
            return new statusObject(200);
        }).catch(error => {
            Logger.error('Database error in resetPermissions:', error);
            return new statusObject(500, 'Database error');
        });
    }

    /**
     * Set a user's profile picture.
     */
    static async setProfilePicture(db: DatabaseWrapper, userId: number, fileId: number | null, color: string | null = null, font: string | null = null, initials: string | null = null): Promise<statusObject> {
        return db.run('UPDATE users SET profile_picture_id = ?, profile_picture_color = ?, profile_picture_font = ?, profile_picture_initials = ? WHERE id = ?', [fileId, color, font, initials, userId])
            .then(() => new statusObject(200, 'Profile picture updated.'))
            .catch((error) => {
                Logger.error('Database error in setProfilePicture:', error);
                return new statusObject(500, 'Database error');
            });
    }
}
