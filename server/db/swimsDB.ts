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
    private static schemaEnsured = false;

    private static async ensureSwimHistorySchema(db: DatabaseWrapper): Promise<void> {
        if (SwimsDB.schemaEnsured) return;

        try {
            await db.run('ALTER TABLE swim_history ADD COLUMN bootie_count INT NOT NULL DEFAULT 0');
        } catch (error: any) {
            if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
        }

        await db.run('UPDATE swim_history SET bootie_count = count WHERE is_bootie = 1 AND bootie_count = 0');
        SwimsDB.schemaEnsured = true;
    }

    private static async syncBootiesFromHistory(tx: any, userId: number | string): Promise<void> {
        await tx.run(
            `UPDATE users
             SET booties = COALESCE((
                SELECT SUM(sh.bootie_count)
                FROM swim_history sh
                WHERE sh.user_id = ?
             ), 0)
             WHERE id = ?`,
            [userId, userId]
        );
    }

    /**
     * Add swims to a user's total and record the entry in swim history.
     */
    static async addSwims(db: DatabaseWrapper, userId: number | string, count: number, addedBy: number | string, message: string): Promise<statusObject> {
        try {
            await SwimsDB.ensureSwimHistorySchema(db);
            await db.transaction(async (tx) => {
                await tx.run('UPDATE users SET swims = swims + ? WHERE id = ?', [count, userId]);
                await tx.run('INSERT INTO swim_history (user_id, added_by, count, message, is_bootie, bootie_count) VALUES (?, ?, ?, ?, 0, 0)', [userId, addedBy, count, message]);
            });
            return new statusObject(200, 'Swims added successfully');
        } catch (error) {
            Logger.error('Database error in addSwims:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Directly add booties to a user's total.
     */
    static async addBooties(db: DatabaseWrapper, userId: number | string, count: number): Promise<statusObject> {
        try {
            return new statusObject(400, 'Direct bootie increments are no longer supported. Select swim records to mark as booties.');
        } catch (error) {
            Logger.error('Database error in addBooties:', error);
            return new statusObject(500, 'Database error');
        }
    }

    static async searchSwimmers(db: DatabaseWrapper, search: string = '', limit: number = 60): Promise<statusObject> {
        try {
            const safeLimit = Math.max(1, Math.min(200, Number(limit) || 60));
            const q = `%${(search || '').trim()}%`;

            const rows = await db.all(
                `SELECT id, first_name, last_name
                 FROM users
                 WHERE first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name, ' ', last_name) LIKE ?
                 ORDER BY first_name ASC, last_name ASC
                 LIMIT ?`,
                [q, q, q, safeLimit]
            );

            return new statusObject(200, null, rows);
        } catch (error) {
            Logger.error('Database error in searchSwimmers:', error);
            return new statusObject(500, 'Database error');
        }
    }

    static async getPendingBootieSwims(db: DatabaseWrapper, userId: number | string): Promise<statusObject> {
        try {
            await SwimsDB.ensureSwimHistorySchema(db);
            const rows = await db.all(
                `SELECT sh.id, sh.user_id, sh.count, sh.bootie_count, sh.message, sh.created_at, sh.is_bootie,
                        u.first_name as added_by_name
                 FROM swim_history sh
                 LEFT JOIN users u ON sh.added_by = u.id
                 WHERE sh.user_id = ? AND sh.bootie_count < sh.count
                 ORDER BY sh.created_at DESC`,
                [userId]
            );

            return new statusObject(200, null, rows);
        } catch (error) {
            Logger.error('Database error in getPendingBootieSwims:', error);
            return new statusObject(500, 'Database error');
        }
    }

    static async markSwimsAsBooties(db: DatabaseWrapper, userId: number | string, swimIds: Array<number | string>): Promise<statusObject> {
        try {
            await SwimsDB.ensureSwimHistorySchema(db);
            const cleanedIds = Array.from(new Set((swimIds || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));

            if (!cleanedIds.length) {
                return new statusObject(400, 'No swim records selected.');
            }

            return await db.transaction(async (tx) => {
                const user = await tx.get('SELECT id FROM users WHERE id = ?', [userId]);
                if (!user) return new statusObject(404, 'User not found');

                const placeholders = cleanedIds.map(() => '?').join(',');
                const rows = await tx.all(
                    `SELECT id, count, is_bootie, bootie_count
                     FROM swim_history
                     WHERE user_id = ? AND id IN (${placeholders})`,
                    [userId, ...cleanedIds]
                );

                if (rows.length !== cleanedIds.length) {
                    return new statusObject(400, 'Some selected swims are invalid for this user.');
                }

                const alreadyBootied = rows.filter((row: any) => Number(row.bootie_count || 0) >= Number(row.count || 0));
                if (alreadyBootied.length > 0) {
                    return new statusObject(400, 'Some selected swims were already marked as booties.');
                }

                await tx.run(
                    `UPDATE swim_history
                     SET is_bootie = 1, bootie_count = count
                     WHERE user_id = ? AND id IN (${placeholders})`,
                    [userId, ...cleanedIds]
                );

                await SwimsDB.syncBootiesFromHistory(tx, userId);

                const bootiesAdded = rows.reduce((sum: number, row: any) => sum + (Number(row.count || 0) - Number(row.bootie_count || 0)), 0);
                return new statusObject(200, `Marked ${cleanedIds.length} swim record(s) as bootie.`, { swimsMarked: cleanedIds.length, bootiesAdded });
            });
        } catch (error) {
            Logger.error('Database error in markSwimsAsBooties:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Toggle the bootie status of a specific swim record.
     */
    static async toggleBootie(db: DatabaseWrapper, swimId: number | string, options?: { mode?: 'toggle' | 'add' | 'remove' | 'set-all'; amount?: number }): Promise<statusObject> {
        try {
            await SwimsDB.ensureSwimHistorySchema(db);
            return await db.transaction(async (tx) => {
                const swim = await tx.get('SELECT user_id, count, is_bootie, bootie_count FROM swim_history WHERE id = ?', [swimId]);
                if (!swim) return new statusObject(404, 'Swim record not found');

                const currentBootieCount = Number(swim.bootie_count || 0);
                const totalCount = Number(swim.count || 0);
                const amount = Math.max(1, Number(options?.amount || 1));
                let nextBootieCount = currentBootieCount;

                switch (options?.mode) {
                    case 'add':
                        nextBootieCount = Math.min(totalCount, currentBootieCount + amount);
                        break;
                    case 'remove':
                        nextBootieCount = Math.max(0, currentBootieCount - amount);
                        break;
                    case 'set-all':
                        nextBootieCount = totalCount;
                        break;
                    case 'toggle':
                    default:
                        nextBootieCount = currentBootieCount >= totalCount ? 0 : totalCount;
                        break;
                }

                const newStatus = nextBootieCount >= totalCount ? 1 : 0;

                await tx.run('UPDATE swim_history SET is_bootie = ?, bootie_count = ? WHERE id = ?', [newStatus, nextBootieCount, swimId]);
                await SwimsDB.syncBootiesFromHistory(tx, swim.user_id);

                return new statusObject(200, 'Bootie progress updated.', {
                    swimId: Number(swimId),
                    bootieCount: nextBootieCount,
                    totalCount,
                    isBootie: newStatus
                });
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
            await SwimsDB.ensureSwimHistorySchema(db);
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
                bootie_count: Number(h.bootie_count || 0),
                bootie_ratio: Number(h.count || 0) > 0 ? Number(h.bootie_count || 0) / Number(h.count || 0) : 0,
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
            await SwimsDB.ensureSwimHistorySchema(db);
            let query: string;
            let params: any[] = [];

            if (yearly) {
                const start = Utils.getAcademicYearStart();
                query = `
                    SELECT u.id, u.first_name, u.last_name, SUM(sh.count) as swims, 
                              SUM(sh.bootie_count) as booties,
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
                query = `SELECT u.id, u.first_name, u.last_name,
                                SUM(sh.count) as swims,
                                SUM(sh.bootie_count) as booties,
                                u.profile_picture_color, u.profile_picture_font, u.profile_picture_initials,
                                (SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63 USING utf8mb4), "view=true") FROM files f WHERE f.id = u.profile_picture_id) as profile_picture_path
                         FROM users u
                         JOIN swim_history sh ON u.id = sh.user_id
                         GROUP BY u.id
                         HAVING swims > 0
                         ORDER BY swims DESC, u.last_name ASC`;
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
            await SwimsDB.ensureSwimHistorySchema(db);
            let allSwimmers: any[];
            if (yearly) {
                const start = Utils.getAcademicYearStart();
                allSwimmers = await db.all(`
                    SELECT u.id, SUM(sh.count) as swims, SUM(sh.bootie_count) as booties
                    FROM users u
                    JOIN swim_history sh ON u.id = sh.user_id
                    WHERE sh.created_at >= ?
                    GROUP BY u.id
                    ORDER BY swims DESC
                `, [start]);
            } else {
                allSwimmers = await db.all(`
                    SELECT u.id,
                           COALESCE(SUM(sh.count), 0) as swims,
                          COALESCE(SUM(sh.bootie_count), 0) as booties
                    FROM users u
                    LEFT JOIN swim_history sh ON sh.user_id = u.id
                    GROUP BY u.id
                    ORDER BY swims DESC
                `);
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
