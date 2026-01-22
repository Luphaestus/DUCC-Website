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
    static async canAccessFile(db, file, user) {
        // Simple RBAC checks
        if (file.visibility === 'public') return true;
        if (!user) return false;
        if (file.visibility === 'members') return true;
        if (file.visibility === 'execs') return !!user.is_exec;

        // Dynamic Event-based visibility
        if (file.visibility === 'events') {
            // Execs bypass the difficulty/tag checks for event images
            if (userRole === 'exec') return true;

            // Identify all events using this file as their banner image
            const events = await db.all("SELECT * FROM events WHERE image_url LIKE '%/api/files/' || ? || '/download%'", [file.id]);
            
            // If the file isn't linked to any events, access is denied
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
            for (const event of events) {
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