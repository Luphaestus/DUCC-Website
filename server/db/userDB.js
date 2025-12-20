const { statusObject } = require('../misc/status.js');

class UserDB {

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

    static async getUsers(req, db, options) {
        const canManage = await this.canManageUsers(req, db);
        if (canManage.isError()) return canManage;
        if (canManage.getData() !== 1) return new statusObject(403, 'User not authorized');

        const { page, limit, search, sort, order } = options;
        const offset = (page - 1) * limit;
        const searchTerm = `%${search}%`;

        const allowedSorts = ['first_name', 'last_name', 'email', 'balance', 'first_aid_expiry', 'filled_legal_info', 'is_member', 'difficulty_level'];
        const sortCol = allowedSorts.includes(sort) ? sort : 'last_name';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        try {
            const query = `
                SELECT 
                    u.id, u.first_name, u.last_name, u.email, 
                    u.first_aid_expiry, u.filled_legal_info, u.is_member, u.free_sessions, u.difficulty_level,
                    COALESCE(SUM(t.amount), 0) as balance
                FROM users u
                LEFT JOIN transactions t ON u.id = t.user_id
                WHERE (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
                GROUP BY u.id
                ORDER BY ${sortCol} ${sortOrder}
                LIMIT ? OFFSET ?
            `;

            const users = await db.all(query, [searchTerm, searchTerm, searchTerm, limit, offset]);

            const countQuery = `
                SELECT COUNT(*) as count 
                FROM users 
                WHERE (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
            `;
            const countResult = await db.get(countQuery, [searchTerm, searchTerm, searchTerm]);
            const totalUsers = countResult ? countResult.count : 0;
            const totalPages = Math.ceil(totalUsers / limit);

            return new statusObject(200, null, { users, totalPages, currentPage: page });
        } catch (error) {
            console.error('Database error in getUsers:', error);
            return new statusObject(500, 'Database error');
        }
    }

    static async getElements(req, db, elements, id = null) {
        if (typeof elements === 'string') {
            elements = [elements];
        }

        if (!req.isAuthenticated()) {
            return new statusObject(401, 'User not authenticated');
        }

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

    static async removeUser(req, db, real = false, userId = null) {
        if (!req.isAuthenticated()) {
            return new statusObject(401, 'User not authenticated');
        }

        if (userId && ((await this.canManageUsers(req, db)).getData() !== 1)) {
            return new statusObject(403, 'User not authorized');
        }

        try {
            if (!real) {
                await db.run(
                    `UPDATE users SET hashed_password = NULL WHERE id = ?`,
                    [userId || req.user.id]
                );
            } else {
                await db.run(
                    `DELETE FROM users WHERE id = ?`,
                    [userId || req.user.id]
                );
            }
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
}

module.exports = UserDB;