/**
 * FileRules.ts
 * 
 * Defines logic for evaluating access rights to uploaded files.
 */

import EventRules from './EventRules.js';
import Globals from '../misc/globals.js';
import { DatabaseWrapper } from '../db/db.js';

export default class FileRules {
    /**
     * Determine if a specific user is authorized to access a file.
     */
    static async canAccessFile(db: DatabaseWrapper, file: any, user: any, userRole: string): Promise<boolean> {
        if (userRole === 'exec') return true;

        if (file.visibility === 'public') return true;

        const isPublicAsset = await db.get(`
            SELECT 1 FROM users WHERE profile_picture_id = ? 
            UNION 
            SELECT 1 FROM slides WHERE file_id = ? 
            LIMIT 1
        `, [file.id, file.id]);
        if (isPublicAsset) return true;

        // Check if file is referenced in ANY global setting
        const globals = new Globals();
        const allGlobals = globals.getAll();
        const fileUrl = `/api/files/${file.id}/download`;
        
        for (const key in allGlobals) {
            const val = allGlobals[key]?.data;
            if (typeof val === 'string' && val.includes(fileUrl)) {
                return true;
            }
        }

        if (await EventRules.canViewImage(db, file.id, user)) return true;

        if (file.visibility === 'members' && userRole === 'member') return true;

        return false;
    }
}
