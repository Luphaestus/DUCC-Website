/**
 * FileRules.js
 * 
 * Defines logic for evaluating access rights to uploaded files.
 */

const EventRules = require('./EventRules.js');
const Globals = require('../misc/globals.js');

class FileRules {
    /**
     * Determine if a specific user is authorized to access a file.
     */
    static async canAccessFile(db, file, user, userRole) {
        if (userRole === 'exec') return true;

        if (file.visibility === 'public') return true;

        const isPublicAsset = await db.get(`
            SELECT 1 FROM users WHERE profile_picture_id = ? 
            UNION 
            SELECT 1 FROM slides WHERE file_id = ? 
            LIMIT 1
        `, [file.id, file.id]);
        if (isPublicAsset) return true;

        if (new Globals().get('DefaultEventImage').data.includes(`/api/files/${file.id}/download`)) {
            return true;
        }

        if (await EventRules.canViewImage(db, file.id, user)) return true;

        if (file.visibility === 'members' && userRole === 'member') return true;

        return false;
    }
}

module.exports = FileRules;