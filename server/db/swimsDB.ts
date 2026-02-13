/**
 * swimsDB.ts
 * 
 * This module manages "swims" records and leaderboard data.
 */

import { statusObject } from '../misc/status.js';
import Utils from '../misc/utils.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';
import Globals from '../misc/globals.js';

export default class SwimsDB {
    /**
     * Add swims to a user's total and record the entry in swim history.
     */
    static async addSwims(db: DatabaseWrapper, userId: number | string, count: number, addedBy: number | string, message: string): Promise<statusObject> {
        try {
            await db.transaction(async (tx) => {
                await tx.run('UPDATE users SET swims = swims + ? WHERE id = ?', [count, userId]);
                await tx.run('INSERT INTO swim_history (user_id, added_by, count, message) VALUES (?, ?, ?, ?)', [userId, addedBy, count, message]);
            });
            return new statusObject(200, 'Swims added successfully');
        } catch (error) {
            Logger.error('Database error in addSwims:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Toggle the bootie status of a specific swim record.
     */
    static async toggleBootie(db: DatabaseWrapper, swimId: number | string): Promise<statusObject> {
        try {
            return await db.transaction(async (tx) => {
                const swim = await tx.get('SELECT user_id, is_bootie, count FROM swim_history WHERE id = ?', [swimId]);
                if (!swim) return new statusObject(404, 'Swim record not found');

                const newStatus = swim.is_bootie ? 0 : 1;
                const bootieChange = newStatus ? swim.count : -swim.count;

                await tx.run('UPDATE swim_history SET is_bootie = ? WHERE id = ?', [newStatus, swimId]);
                await tx.run('UPDATE users SET booties = booties + ? WHERE id = ?', [bootieChange, swim.user_id]);

                return new statusObject(200, `Bootie ${newStatus ? 'marked' : 'unmarked'}.`);
            });
        } catch (error) {
            Logger.error('Database error in toggleBootie:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch the swim history for a specific user.
     */
    static async getSwimHistory(db: DatabaseWrapper, userId: number | string): Promise<statusObject> {
        try {
            const showMessages = new Globals().getInt('ShowSwimMessages') === 1;
            const history = await db.all(
                `SELECT sh.*, u.first_name as added_by_name 
                 FROM swim_history sh
                 LEFT JOIN users u ON sh.added_by = u.id
                 WHERE sh.user_id = ?
                 ORDER BY sh.created_at DESC`,
                [userId]
            );

            // Redact messages if not allowed to see them
            const processed = history.map(h => ({
                ...h,
                message: showMessages ? h.message : (h.message ? 'Hidden' : null)
            }));

            return new statusObject(200, null, processed);
        } catch (error) {
            Logger.error('Database error in getSwimHistory:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Generate a leaderboard of users with the most swims.
     */
    static async getSwimsLeaderboard(db: DatabaseWrapper, yearly: boolean = false, currentUserId?: number | string): Promise<statusObject> {
        try {
            let query: string;
            let params: any[] = [];

            if (yearly) {
                const start = Utils.getAcademicYearStart();
                query = `
                    SELECT u.id, u.first_name, u.last_name, SUM(sh.count) as swims, 
                           SUM(CASE WHEN sh.is_bootie = 1 THEN sh.count ELSE 0 END) as booties,
                           u.profile_picture_color, u.profile_picture_font, u.profile_picture_initials,
                           (SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63 USING utf8mb4), "view=true") FROM files f WHERE f.id = u.profile_picture_id) as profile_picture_path
                    FROM users u
                    JOIN swim_history sh ON u.id = sh.user_id
                    WHERE sh.created_at >= ?
                    GROUP BY u.id
                    HAVING swims > 0
                    ORDER BY swims DESC, u.last_name ASC
                `;
                params.push(start);
            } else {
                query = `SELECT u.id, u.first_name, u.last_name, u.swims, u.booties,
                                u.profile_picture_color, u.profile_picture_font, u.profile_picture_initials,
                                (SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63 USING utf8mb4), "view=true") FROM files f WHERE f.id = u.profile_picture_id) as profile_picture_path
                         FROM users u WHERE u.swims > 0 ORDER BY u.swims DESC, u.last_name ASC`;
            }

            const users = await db.all(query, params);

            let rank = 0;
            let lastSwims = -1;
            const leaderboard = users.map((user: any) => {
                if (user.swims !== lastSwims) {
                    rank++;
                    lastSwims = user.swims;
                }
                const is_me = user.id === currentUserId;
                return { ...user, rank, is_me };
            });

            return new statusObject(200, null, leaderboard);
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Calculate a specific user's rank and total swim count relative to all users.
     */
    static async getUserSwimmerRank(db: DatabaseWrapper, userId: number | string, yearly: boolean = false): Promise<statusObject> {
        try {
            let allSwimmers: any[];
            if (yearly) {
                const start = Utils.getAcademicYearStart();
                allSwimmers = await db.all(`
                    SELECT u.id, SUM(sh.count) as swims, SUM(CASE WHEN sh.is_bootie = 1 THEN sh.count ELSE 0 END) as booties
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
            Logger.error('Database error in getUserSwimmerRank:', error);
            return new statusObject(500, 'Database error');
        }
    }
}
