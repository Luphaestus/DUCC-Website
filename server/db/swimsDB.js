const { statusObject } = require('../misc/status.js');
const Utils = require('../misc/utils.js');
const { Permissions } = require('../misc/permissions.js');

class SwimsDB {

    /**
     * Add swims and record in history.
     * @param {object} db
     * @param {number} userId
     * @param {number} count
     * @param {number} addedBy
     * @returns {Promise<statusObject>}
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
                const start = Utils.getAcademicYearStart();
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