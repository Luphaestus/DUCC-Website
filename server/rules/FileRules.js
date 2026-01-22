/**
 * FileRules.js
 * 
 * Defines logic for evaluating access rights to uploaded files.
 * Enforces Role-Based Access Control (RBAC) and event-linked visibility.
 */

const EventRules = require('./EventRules.js');
const TagsDB = require('../db/tagsDB.js');
const UserDB = require('../db/userDB.js');
const Globals = require('../misc/globals.js');

class FileRules {
    /**
     * Determine if a specific user is authorized to access a file.
     * 
     * Logic Priority:
     * 1. Public visibility: allowed for everyone.
     * 2. Member visibility: allowed for logged-in members and execs.
     * 3. Exec visibility: allowed only for execs.
     * 4. Event visibility: allowed if user has permission to view at least one event that uses this file as its banner.
     * 
     * @param {object} db - Database connection.
     * @param {object} file - Target file object (must include visibility and id).
     * @param {object|null} user - Requesting user object.
     * @param {string} userRole - Current RBAC role ('public', 'member', or 'exec').
     * @returns {Promise<boolean>} - True if access is granted.
     */
    static async canAccessFile(db, file, user, userRole) {
        // Simple RBAC checks
        if (file.visibility === 'public') return true;
        if (userRole === 'exec') return true;

        if (file.visibility === 'members') return userRole === 'member';
        if (file.visibility === 'execs') return false; // exec already handled

        // Dynamic Event-based visibility
        if (file.visibility === 'events') {
            // Execs bypass the difficulty/tag checks for event images
            if (userRole === 'exec') return true;

            // Identify all events using this file as their banner image
            const events = await db.all("SELECT * FROM events WHERE image_url LIKE '%/api/files/' || ? || '/download%'", [file.id]);
            
            // Also check if this file is a default image for any tags
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

            // If the file isn't linked to any events (directly or via tags), access is denied
            if (events.length === 0) {
                return false;
            }

            // Prepare the user object for visibility evaluation
            let userObj = user;
            if (user && user.id && user.difficulty_level === undefined) {
                // Ensure difficulty level is populated from the DB if missing from the request object
                const userRes = await UserDB.getElementsById(db, user.id, 'difficulty_level');
                if (!userRes.isError()) {
                    userObj = userRes.getData();
                }
            }

            // Fallback for Guests
            if (!userObj) {
                userObj = { difficulty_level: new Globals().getInt("Unauthorized_max_difficulty") };
            }

            // Iterate through events; grant access if the user can view at least one of them
            // Use a Set to avoid checking the same event multiple times if it was added twice
            const seenEventIds = new Set();
            for (const event of events) {
                if (seenEventIds.has(event.id)) continue;
                seenEventIds.add(event.id);

                // Load tags for precise rule evaluation
                event.tags = await TagsDB.getTagsForEvent(db, event.id);
                const canView = EventRules.canViewEvent(event, userObj);
                if (canView) return true;
            }
        }

        // Default: deny access
        return false;
    }
}

module.exports = FileRules;