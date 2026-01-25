/**
 * FileRules.js
 * 
 * Defines logic for evaluating access rights to uploaded files.
 */

const EventRules = require('./EventRules.js');
const TagsDB = require('../db/tagsDB.js');
const UserDB = require('../db/userDB.js');
const Globals = require('../misc/globals.js');

class FileRules {
    /**
     * Determine if a specific user is authorized to access a file.
     */
    static async canAccessFile(db, file, user, userRole) {
        if (file.visibility === 'public') return true;
        if (userRole === 'exec') return true;

        if (file.visibility === 'members') return userRole === 'member';
        if (file.visibility === 'execs') return false;

        if (file.visibility === 'events') {
            if (userRole === 'exec') return true;

            const defaultImage = new Globals().get('DefaultEventImage').data;
            if (defaultImage && defaultImage.includes(`/api/files/${file.id}/download`)) {
                return true;
            }

            const events = await db.all("SELECT * FROM events WHERE image_id = ?", [file.id]);
            
            const tags = await db.all("SELECT id FROM tags WHERE image_id = ?", [file.id]);
            if (tags.length > 0) {
                const tagIds = tags.map(t => t.id);
                const tagPlaceholders = tagIds.map(() => '?').join(',');
                const eventsWithTags = await db.all(`
                    SELECT e.* FROM events e
                    JOIN event_tags et ON e.id = et.event_id
                    WHERE et.tag_id IN (${tagPlaceholders})
                `, tagIds);
                events.push(...eventsWithTags);
            }

            if (events.length === 0) {
                return false;
            }

            let userObj = user;
            if (user && user.id && user.difficulty_level === undefined) {
                const userRes = await UserDB.getElementsById(db, user.id, ['difficulty_level', 'id']);
                if (!userRes.isError()) {
                    userObj = userRes.getData();
                }
            }

            if (!userObj) {
                userObj = { difficulty_level: new Globals().getInt("Unauthorized_max_difficulty") };
            }

            const seenEventIds = new Set();
            for (const event of events) {
                if (seenEventIds.has(event.id)) continue;
                seenEventIds.add(event.id);

                event.tags = await TagsDB.getTagsForEvent(db, event.id);
                const canView = await EventRules.canViewEvent(db, event, userObj);
                if (canView) return true;
            }
        }

        return false;
    }
}

module.exports = FileRules;