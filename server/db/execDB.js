/**
 * execDB.js
 * 
 * This module manages database operations for the executive committee.
 */

import BaseDB from './BaseDB.js';
import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';

export default class ExecDB extends BaseDB {
    /**
     * Get the current executive committee members.
     */
    static async getCurrentExec(db) {
        return this.wrap(async () => {
            const rows = await db.all(`
                SELECT ec.*, u.first_name, u.last_name, u.email,
                       (SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63), "view=true") FROM files f WHERE f.id = u.profile_picture_id) as profile_picture_path
                FROM exec_committee ec
                JOIN users u ON ec.user_id = u.id
                WHERE ec.is_current = 1
                ORDER BY ec.display_order ASC
            `);
            return new statusObject(200, null, rows);
        });
    }

    /**
     * Get past executive committee members.
     */
    static async getPastExec(db) {
        return this.wrap(async () => {
            const rows = await db.all(`
                SELECT ec.*, u.first_name, u.last_name, u.email,
                       (SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63), "view=true") FROM files f WHERE f.id = u.profile_picture_id) as profile_picture_path
                FROM exec_committee ec
                JOIN users u ON ec.user_id = u.id
                WHERE ec.is_current = 0
                ORDER BY ec.term_end DESC, ec.display_order ASC
            `);
            return new statusObject(200, null, rows);
        });
    }

    /**
     * Add a member to the executive committee.
     */
    static async addExecMember(db, { userId, roleName, displayOrder, termStart, isCurrent = 1 }) {
        return this.wrap(async () => {
            const result = await db.run(
                `INSERT INTO exec_committee (user_id, role_name, display_order, term_start, is_current)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, roleName, displayOrder || 0, termStart || new Date().toISOString().slice(0, 10), isCurrent]
            );
            return new statusObject(201, 'Exec member added.', { id: result.lastID });
        });
    }

    /**
     * Update an exec member's details.
     */
    static async updateExecMember(db, id, data) {
        return this.wrap(async () => {
            const keys = Object.keys(data);
            if (keys.length === 0) return new statusObject(200);

            const sets = keys.map(k => `${k} = ?`).join(', ');
            await db.run(`UPDATE exec_committee SET ${sets} WHERE id = ?`, [...Object.values(data), id]);
            return new statusObject(200, 'Exec member updated.');
        });
    }

    /**
     * Remove an exec member from the committee record.
     */
    static async deleteExecMember(db, id) {
        return this.wrap(async () => {
            await db.run('DELETE FROM exec_committee WHERE id = ?', [id]);
            return new statusObject(200, 'Exec member removed.');
        });
    }

    /**
     * "Save" current committee: Mark current members as past and end their term.
     */
    static async archiveCurrentCommittee(db) {
        return db.transaction(async (tx) => {
            const today = new Date().toISOString().slice(0, 10);
            await tx.run(
                'UPDATE exec_committee SET is_current = 0, term_end = ? WHERE is_current = 1',
                [today]
            );
            return new statusObject(200, 'Current committee archived.');
        });
    }
}
