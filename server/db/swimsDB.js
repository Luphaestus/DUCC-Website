/**
 * swimsDB.js
 * 
 * This module manages "swims" records and leaderboard data.
 */

const { statusObject } = require('../misc/status.js');
const Utils = require('../misc/utils.js');
const { Permissions } = require('../misc/permissions.js');

class SwimsDB {
    /**
     * Add swims to a user's total and record the entry in swim history.
     */
    static async addSwims(db, userId, count, addedBy) {
        try {
            await db.run('BEGIN TRANSACTION');
            await db.run('UPDATE users SET swims = swims + ? WHERE id = ?', [count, userId]);
            await db.run('INSERT INTO swim_history (user_id, added_by, count) VALUES (?, ?, ?)', [userId, addedBy, count]);
            await db.run('COMMIT');
            return new statusObject(200, 'Swims added successfully');
        } catch (error) {
            await db.run('ROLLBACK');
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Add booties to a user's total.
     */
    static async addBooties(db, userId, count) {
        try {
            const user = await db.get('SELECT swims, booties FROM users WHERE id = ?', [userId]);
            if (!user) return new statusObject(404, 'User not found');

            if (user.booties + count > user.swims) {
                return new statusObject(400, 'Booties cannot exceed swims');
            }

            await db.run('UPDATE users SET booties = booties + ? WHERE id = ?', [count, userId]);
            return new statusObject(200, 'Booties added successfully');
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Generate a leaderboard of users with the most swims.
     */
    static async getSwimsLeaderboard(db, yearly = false, currentUserId) {
        try {
            let query;
            let params = [];

            if (yearly) {
                const start = Utils.getAcademicYearStart();
                query = `
                    SELECT u.id, u.first_name, u.last_name, SUM(sh.count) as swims, u.booties
                    FROM users u
                    JOIN swim_history sh ON u.id = sh.user_id
                    WHERE sh.created_at >= ?
                    GROUP BY u.id
                    HAVING swims > 0
                    ORDER BY swims DESC, u.last_name ASC
                `;
                params.push(start);
            } else {
                query = 'SELECT id, first_name, last_name, swims, booties FROM users WHERE swims > 0 ORDER BY swims DESC, last_name ASC';
            }

            const users = await db.all(query, params);

            let rank = 0;
            let lastSwims = -1;
            const leaderboard = users.map((user) => {
                if (user.swims !== lastSwims) {
                    rank++;
                    lastSwims = user.swims;
                }
                const is_me = user.id === currentUserId;
                const { id, ...rest } = user;
                return { ...rest, rank, is_me };
            });

            return new statusObject(200, null, leaderboard);
        } catch (error) {
            console.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Calculate a specific user's rank and total swim count relative to all users.
     */
    static async getUserSwimmerRank(db, userId, yearly = false) {
        try {
            let allSwimmers;
            if (yearly) {
                const start = Utils.getAcademicYearStart();
                allSwimmers = await db.all(`
                    SELECT u.id, SUM(sh.count) as swims, u.booties
                    FROM users u
                    JOIN swim_history sh ON u.id = sh.user_id
                    WHERE sh.created_at >= ?
                    GROUP BY u.id
                    ORDER BY swims DESC
                `, [start]);
            } else {
                allSwimmers = await db.all('SELECT id, swims, booties FROM users ORDER BY swims DESC');
            }

            let rank = 0;
            let lastSwims = -1;
            let userRank = -1;
            let userSwims = 0;
            let userBooties = 0;

            if (allSwimmers && allSwimmers.length > 0) {
                for (const s of allSwimmers) {
                    if (s.swims !== lastSwims) {
                        rank++;
                        lastSwims = s.swims;
                    }
                    if (s.id === userId) {
                        userRank = rank;
                        userSwims = s.swims;
                        userBooties = s.booties;
                        break;
                    }
                }
            }

            return new statusObject(200, null, { rank: userRank, swims: userSwims, booties: userBooties });
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }
}

module.exports = SwimsDB;