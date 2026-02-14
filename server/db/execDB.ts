/**
 * execDB.ts
 * 
 * This module manages database operations for the executive committee.
 */

import BaseDB from './BaseDB.js';
import { statusObject } from '../misc/status.js';
import { DatabaseWrapper } from './db.js';

interface ExecMemberData {
    userId?: number | null;
    roleName: string;
    displayOrder?: number;
    votesReceived?: number;
    termStart?: string;
    termEnd?: string | null;
    isCurrent?: number;
    firstNameOverride?: string | null;
    lastNameOverride?: string | null;
    emailOverride?: string | null;
    profilePictureOverrideId?: number | null;
    profilePictureColorOverride?: string | null;
    profilePictureFontOverride?: string | null;
    profilePictureInitialsOverride?: string | null;
    instagramLink?: string | null;
    linkedinLink?: string | null;
    manifestoFileId?: number | null;
}

export default class ExecDB extends BaseDB {
    /**
     * Get the current executive committee members.
     * @param {boolean} includeHidden - If true, returns hidden members too (for admin).
     */
    static async getCurrentExec(db: DatabaseWrapper, includeHidden: boolean = false): Promise<statusObject> {
        return this.wrap(async () => {
            const rows = await db.all(`
                SELECT ec.*, 
                       COALESCE(ec.first_name_override, u.first_name) as first_name, 
                       COALESCE(ec.last_name_override, u.last_name) as last_name, 
                       COALESCE(ec.email_override, u.email) as email,
                       u.email as username,
                       ec.votes_received,
                       COALESCE(ec.profile_picture_color_override, u.profile_picture_color) as profile_picture_color, 
                       COALESCE(ec.profile_picture_font_override, u.profile_picture_font) as profile_picture_font, 
                       COALESCE(ec.profile_picture_initials_override, u.profile_picture_initials) as profile_picture_initials,
                       ec.instagram_link,
                       ec.linkedin_link,
                       CASE 
                           WHEN f_override.id IS NOT NULL THEN CONCAT('/api/files/', f_override.id, '/download', CHAR(63), 'view=true')
                           WHEN f_user.id IS NOT NULL THEN CONCAT('/api/files/', f_user.id, '/download', CHAR(63), 'view=true')
                           ELSE NULL
                       END as profile_picture_path,
                       CASE 
                           WHEN f_manifesto.id IS NOT NULL THEN CONCAT('/api/files/', f_manifesto.id, '/download')
                           ELSE NULL
                       END as manifesto_path
                FROM exec_committee ec
                LEFT JOIN users u ON ec.user_id = u.id
                LEFT JOIN files f_override ON ec.profile_picture_override_id = f_override.id
                LEFT JOIN files f_user ON u.profile_picture_id = f_user.id
                LEFT JOIN files f_manifesto ON ec.manifesto_file_id = f_manifesto.id
                WHERE ec.is_current = 1 ${hiddenFilter}
                ORDER BY ec.display_order ASC
            `);
            return new statusObject(200, null, rows);
        });
    }

    /**
     * Synchronize a user's executive status based on their assigned roles.
     * Roles with 'exec.publish' permission will cause the user to be added.
     */
    static async syncExecMember(db: DatabaseWrapper, userId: number): Promise<statusObject> {
        return this.wrap(async () => {
            // Find all roles for this user that have the exec.publish permission
            const execRoles = await db.all(`
                SELECT r.name, r.exec_ranking 
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN role_permissions rp ON r.id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = ? AND p.slug = 'exec.publish'
            `, [userId]);

            if (execRoles.length === 0) {
                // Decouple historical data before marking as past
                await db.run(`
                                    UPDATE exec_committee
                                    JOIN users u ON exec_committee.user_id = u.id
                                    SET exec_committee.profile_picture_override_id = COALESCE(exec_committee.profile_picture_override_id, u.profile_picture_id),
                                        exec_committee.profile_picture_color_override = COALESCE(exec_committee.profile_picture_color_override, u.profile_picture_color),
                                        exec_committee.profile_picture_font_override = COALESCE(exec_committee.profile_picture_font_override, u.profile_picture_font),
                                        exec_committee.profile_picture_initials_override = COALESCE(exec_committee.profile_picture_initials_override, u.profile_picture_initials),
                                        exec_committee.first_name_override = COALESCE(exec_committee.first_name_override, u.first_name),
                                        exec_committee.last_name_override = COALESCE(exec_committee.last_name_override, u.last_name),
                                        exec_committee.email_override = COALESCE(exec_committee.email_override, u.email),
                                        exec_committee.manifesto_file_id = COALESCE(exec_committee.manifesto_file_id, NULL),
                                        exec_committee.instagram_link = COALESCE(exec_committee.instagram_link, null),
                                        exec_committee.linkedin_link = COALESCE(exec_committee.linkedin_link, null)
                                    WHERE exec_committee.user_id = ? AND exec_committee.is_current = 1                `, [userId]);

                // If they no longer have any exec roles, mark current entries as not current
                await db.run('UPDATE exec_committee SET is_current = 0, term_end = CURDATE() WHERE user_id = ? AND is_current = 1', [userId]);
                return new statusObject(200, 'User removed from current exec.');
            }

            const currentRoleNames = execRoles.map((r: any) => r.name);

            // Decouple historical data for roles being removed
            const placeholders = currentRoleNames.map(() => '?').join(',');
            await db.run(
                `UPDATE exec_committee
                 JOIN users u ON exec_committee.user_id = u.id
                 SET exec_committee.profile_picture_override_id = COALESCE(exec_committee.profile_picture_override_id, u.profile_picture_id),
                     exec_committee.profile_picture_color_override = COALESCE(exec_committee.profile_picture_color_override, u.profile_picture_color),
                     exec_committee.profile_picture_font_override = COALESCE(exec_committee.profile_picture_font_override, u.profile_picture_font),
                     exec_committee.profile_picture_initials_override = COALESCE(exec_committee.profile_picture_initials_override, u.profile_picture_initials),
                     exec_committee.first_name_override = COALESCE(exec_committee.first_name_override, u.first_name),
                     exec_committee.last_name_override = COALESCE(exec_committee.last_name_override, u.last_name),
                     exec_committee.email_override = COALESCE(exec_committee.email_override, u.email),
                     exec_committee.manifesto_file_id = COALESCE(exec_committee.manifesto_file_id, NULL),
                     exec_committee.instagram_link = COALESCE(exec_committee.instagram_link, null),
                     exec_committee.linkedin_link = COALESCE(exec_committee.linkedin_link, null)
                 WHERE exec_committee.user_id = ? AND exec_committee.is_current = 1 AND exec_committee.role_name NOT IN (${placeholders})`,
                [userId, ...currentRoleNames]
            );

            // Mark any current entries that are NO LONGER in the user's roles as not current
            await db.run(
                `UPDATE exec_committee 
                 SET is_current = 0, term_end = CURDATE() 
                 WHERE user_id = ? AND is_current = 1 AND role_name NOT IN (${placeholders})`,
                [userId, ...currentRoleNames]
            );

            // For each exec role they have, ensure an entry exists in exec_committee
            for (const role of execRoles as any[]) {
                const exists = await db.get(
                    'SELECT id FROM exec_committee WHERE user_id = ? AND role_name = ? AND is_current = 1',
                    [userId, role.name]
                );
                
                if (!exists) {
                    await db.run(
                        'INSERT INTO exec_committee (user_id, role_name, display_order, is_current, term_start) VALUES (?, ?, ?, 1, CURDATE())',
                        [userId, role.name, role.exec_ranking || 4]
                    );
                } else {
                    // Update ranking if it already exists?
                    await db.run(
                        'UPDATE exec_committee SET display_order = ? WHERE id = ?',
                        [role.exec_ranking || 4, exists.id]
                    );
                }
            }
            return new statusObject(200, 'Exec status synchronized.');
        });
    }

    /**
     * Get past executive committee members.
     */
    static async getPastExec(db: DatabaseWrapper): Promise<statusObject> {
        return this.wrap(async () => {
            const rows = await db.all(`
                SELECT ec.*, 
                       COALESCE(ec.first_name_override, u.first_name) as first_name, 
                       COALESCE(ec.last_name_override, u.last_name) as last_name, 
                       COALESCE(ec.email_override, u.email) as email,
                       u.email as username,
                       ec.votes_received,
                       COALESCE(ec.profile_picture_color_override, u.profile_picture_color) as profile_picture_color, 
                       COALESCE(ec.profile_picture_font_override, u.profile_picture_font) as profile_picture_font, 
                       COALESCE(ec.profile_picture_initials_override, u.profile_picture_initials) as profile_picture_initials,
                       ec.instagram_link,
                       ec.linkedin_link,
                       CASE 
                           WHEN f_override.id IS NOT NULL THEN CONCAT('/api/files/', f_override.id, '/download', CHAR(63), 'view=true')
                           ELSE NULL
                       END as profile_picture_path,
                       CASE 
                           WHEN f_manifesto.id IS NOT NULL THEN CONCAT('/api/files/', f_manifesto.id, '/download')
                           ELSE NULL
                       END as manifesto_path
                FROM exec_committee ec
                LEFT JOIN users u ON ec.user_id = u.id
                LEFT JOIN files f_override ON ec.profile_picture_override_id = f_override.id
                LEFT JOIN files f_user ON u.profile_picture_id = f_user.id
                LEFT JOIN files f_manifesto ON ec.manifesto_file_id = f_manifesto.id
                WHERE ec.is_current = 0
                ORDER BY ec.term_end DESC, ec.display_order ASC
            `);
            return new statusObject(200, null, rows);
        });
    }

    /**
     * Add a member to the executive committee.
     */
    static async addExecMember(db: DatabaseWrapper, { userId, roleName, displayOrder, votesReceived, termStart, termEnd, isCurrent = 1, firstNameOverride, lastNameOverride, emailOverride, profilePictureOverrideId, profilePictureColorOverride, profilePictureFontOverride, profilePictureInitialsOverride, instagramLink, linkedinLink, manifestoFileId }: ExecMemberData): Promise<statusObject> {
        return this.wrap(async () => {
            const result = await db.run(
                `INSERT INTO exec_committee (
                    user_id, role_name, display_order, votes_received, term_start, term_end, is_current, 
                    first_name_override, last_name_override, email_override, profile_picture_override_id,
                    profile_picture_color_override, profile_picture_font_override, profile_picture_initials_override,
                    manifesto_file_id, instagram_link, linkedin_link
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId || null, 
                    roleName, 
                    displayOrder || 0, 
                    votesReceived || 0,
                    termStart || new Date().toISOString().slice(0, 10), 
                    termEnd || null,
                    isCurrent,
                    firstNameOverride || null,
                    lastNameOverride || null,
                    emailOverride || null,
                    profilePictureOverrideId || null,
                    profilePictureColorOverride || null,
                    profilePictureFontOverride || null,
                    profilePictureInitialsOverride || null,
                    manifestoFileId || null,
                    instagramLink || null,
                    linkedinLink || null
                ]
            );
            return new statusObject(201, 'Exec member added.', { id: result.lastID });
        });
    }

    /**
     * Update an exec member's details.
     */
    static async updateExecMember(db: DatabaseWrapper, id: number, data: any): Promise<statusObject> {
        return this.wrap(async () => {
            const keys = Object.keys(data);
            if (keys.length === 0) return new statusObject(200);

            // Convert camelCase keys to snake_case for database columns
            const snakeCaseData: { [key: string]: any } = {};
            for (const key of keys) {
                const snakeCaseKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                snakeCaseData[snakeCaseKey] = data[key];
            }

            const sets = Object.keys(snakeCaseData).map(k => `${k} = ?`).join(', ');
            await db.run(`UPDATE exec_committee SET ${sets} WHERE id = ?`, [...Object.values(snakeCaseData), id]);
            return new statusObject(200, 'Exec member updated.');
        });
    }

    /**
     * Remove an exec member from the committee record.
     */
    static async deleteExecMember(db: DatabaseWrapper, id: number): Promise<statusObject> {
        return this.wrap(async () => {
            await db.run('DELETE FROM exec_committee WHERE id = ?', [id]);
            return new statusObject(200, 'Exec member removed.');
        });
    }

    /**
     * "Save" current committee: Mark current members as past and end their term.
     */
    static async archiveCurrentCommittee(db: DatabaseWrapper): Promise<statusObject> {
        const execute = async (conn: any) => {
            const today = new Date().toISOString().slice(0, 10);
            
            // Freeze current data for all members being archived
            await conn.run(`
                UPDATE exec_committee
                JOIN users u ON exec_committee.user_id = u.id
                SET exec_committee.profile_picture_override_id = COALESCE(exec_committee.profile_picture_override_id, u.profile_picture_id),
                    exec_committee.profile_picture_color_override = COALESCE(exec_committee.profile_picture_color_override, u.profile_picture_color),
                    exec_committee.profile_picture_font_override = COALESCE(exec_committee.profile_picture_font_override, u.profile_picture_font),
                    exec_committee.profile_picture_initials_override = COALESCE(exec_committee.profile_picture_initials_override, u.profile_picture_initials),
                    exec_committee.first_name_override = COALESCE(exec_committee.first_name_override, u.first_name),
                    exec_committee.last_name_override = COALESCE(exec_committee.last_name_override, u.last_name),
                    exec_committee.email_override = COALESCE(exec_committee.email_override, u.email),
                    exec_committee.manifesto_file_id = COALESCE(exec_committee.manifesto_file_id, NULL),
                    exec_committee.instagram_link = COALESCE(exec_committee.instagram_link, null),
                    exec_committee.linkedin_link = COALESCE(exec_committee.linkedin_link, null)
                WHERE exec_committee.is_current = 1
            `);

            await conn.run(
                'UPDATE exec_committee SET is_current = 0, term_end = ? WHERE is_current = 1',
                [today]
            );
            return new statusObject(200, 'Current committee archived.');
        };

        // If 'db' is already a transaction (doesn't have getConnection), use it directly.
        if (!(db.connection as any).getConnection) {
            return await execute(db);
        }

        return db.transaction(async (tx) => {
            return await execute(tx);
        });
    }
}
