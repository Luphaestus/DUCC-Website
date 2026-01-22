const EventRules = require('./EventRules.js');
const TagsDB = require('../db/tagsDB.js');
const UserDB = require('../db/userDB.js');
const Globals = require('../misc/globals.js');

class FileRules {
    /**
     * Determine if a user can access a file based on visibility.
     * @param {object} db - Database connection.
     * @param {object} file - File object.
     * @param {object} user - User object (can be null).
     * @param {string} userRole - 'public', 'member', or 'exec'.
     * @returns {Promise<boolean>}
     */
    static async canAccessFile(db, file, user, userRole) {
        if (file.visibility === 'public') return true;
        if (file.visibility === 'members' && (userRole === 'member' || userRole === 'exec')) return true;
        if (file.visibility === 'execs' && userRole === 'exec') return true;
        
        if (file.visibility === 'events') {
            if (userRole === 'exec') return true;

            const events = await db.all("SELECT * FROM events WHERE image_url LIKE '%/api/files/' || ? || '/download%'", [file.id]);
            
            if (events.length === 0) {
                return false;
            }

            let userObj = user;
            if (user && user.id && user.difficulty_level === undefined) {
                const userRes = await UserDB.getElementsById(db, user.id, 'difficulty_level');
                if (!userRes.isError()) {
                    userObj = userRes.getData();
                }
            }

            if (!userObj) {
                userObj = { difficulty_level: new Globals().getInt("Unauthorized_max_difficulty") };
            }

            for (const event of events) {
                event.tags = await TagsDB.getTagsForEvent(db, event.id);
                const canView = EventRules.canViewEvent(event, userObj);
                if (canView) return true;
            }
        }

        return false;
    }
}

module.exports = FileRules;