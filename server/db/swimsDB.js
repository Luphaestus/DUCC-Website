/**
 * swimsDB.js
 * 
 * This module manages "swims" - a record of disciplinary or performance-related events.
 * It tracks individual swim history and generates leaderboard data.
 */

const { statusObject } = require('../misc/status.js');
const Utils = require('../misc/utils.js');
const { Permissions } = require('../misc/permissions.js');

class SwimsDB {

    /**
     * Add swims to a user's total and record the entry in swim history.
     * @param {object} db - Database connection.
     * @param {number} userId - ID of the target user.
     * @param {number} count - Number of swims to add.
     * @param {number} addedBy - ID of the user who added the swims.
     * @returns {Promise<statusObject>}
     */
    static async addSwims(db, userId, count, addedBy) {
        try {
            await db.run('BEGIN TRANSACTION');
            // Update the user's aggregate swim count for fast lookup
            await db.run('UPDATE users SET swims = swims + ? WHERE id = ?', [count, userId]);
            // Log the individual entry for history/auditing
            await db.run('INSERT INTO swim_history (user_id, added_by, count) VALUES (?, ?, ?)', [userId, addedBy, count]);
            await db.run('COMMIT');
            return new statusObject(200, 'Swims added successfully');
        } catch (error) {
            await db.run('ROLLBACK');
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Generate a leaderboard of users with the most swims.
     * Supports filtering by the current academic year.
     * @param {object} db - Database connection.
     * @param {boolean} [yearly=false] - If true, only counts swims in the current academic year.
     * @param {number} currentUserId - ID of the user requesting (used to flag 'is_me').
     * @returns {Promise<statusObject>} - Data is a list of user objects with rank and swim count.
     */
    static async getSwimsLeaderboard(db, yearly = false, currentUserId) {
        try {
            let query;
            let params = [];

            if (yearly) {
                // Fetch the start date of the current academic year
                const start = Utils.getAcademicYearStart();
                query = `
                    SELECT u.id, u.first_name, u.last_name, SUM(sh.count) as swims
                    FROM users u
                    JOIN swim_history sh ON u.id = sh.user_id
                    WHERE sh.created_at >= ?
                    GROUP BY u.id
                    HAVING swims > 0
                    ORDER BY swims DESC, u.last_name ASC
                `;
                params.push(start);
            } else {
                query = 'SELECT id, first_name, last_name, swims FROM users WHERE swims > 0 ORDER BY swims DESC, last_name ASC';
            }

            const users = await db.all(query, params);

            // Assign numerical ranks, handling ties
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
     * @param {object} db - Database connection.
     * @param {number} userId - Target user ID.
     * @param {boolean} [yearly=false] - If true, calculates rank based on current academic year.
     * @returns {Promise<statusObject>} - Data contains { rank, swims }.
     */
    static async getUserSwimmerRank(db, userId, yearly = false) {
        try {
            let allSwimmers;
            if (yearly) {
                const start = Utils.getAcademicYearStart();
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
                // Iterate through sorted list to find the user's position
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
}

module.exports = SwimsDB;