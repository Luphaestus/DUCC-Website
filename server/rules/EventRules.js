/**
 * EventRules.js
 * 
 * Defines the core business logic for event interaction.
 * Enforces visibility (viewing) and participation (joining) requirements.
 */

const { statusObject } = require('../misc/status.js');
const Globals = require('../misc/globals.js');
const AttendanceDB = require('../db/attendanceDB.js');
const TagsDB = require('../db/tagsDB.js');
const RolesDB = require('../db/rolesDB.js');
const TransactionsDB = require('../db/transactionDB.js');

class EventRules {
    /**
     * Determine if a user is authorized to view an event.
     * Checks based on event difficulty, individual tag difficulty restrictions, and view policies.
     * @param {object} db - Database connection.
     * @param {object} event - Event object (must have tags attached).
     * @param {object|null} user - User object (null for guests).
     * @returns {Promise<boolean>} - True if viewable.
     */
    static async canViewEvent(db, event, user) {
        // Difficulty Evaluation
        // Guests use the 'Unauthorized_max_difficulty' global setting
        const userDiff = user ? user.difficulty_level : new Globals().getInt("Unauthorized_max_difficulty");
        
        // Block if the main event difficulty exceeds user's level
        if (event.difficulty_level > userDiff) return false;

        // Tag Visibility Policy
        if (event.tags) {
            for (const tag of event.tags) {
                // Block if ANY tag assigned to the event has a minimum difficulty higher than the user's level
                if (tag.min_difficulty && tag.min_difficulty > userDiff) return false;

                // Whitelist enforcement for viewing
                if (tag.view_policy === 'whitelist') {
                    if (!user) return false;
                    const whitelisted = await TagsDB.isWhitelisted(db, tag.id, user.id);
                    if (!whitelisted) return false;
                }
            }
        }

        return true;
    }

    /**
     * Determine if a user satisfies all requirements to join an event.
     * Evaluates status, timing, capacity, coach presence, legal info, debt, and membership.
     * @param {object} db - Database connection.
     * @param {object} event - Target event object.
     * @param {object} user - Requesting user object.
     * @returns {Promise<statusObject>} - 200 OK or 403 Forbidden with reason.
     */
    static async canJoinEvent(db, event, user) {
        if (!user) return new statusObject(401, 'User not authenticated');

        // Signup Logic
        if (!event.signup_required) {
            return new statusObject(400, 'Signup is not required for this event');
        }

        // Cancellation Status
        if (event.is_canceled) return new statusObject(400, 'Event is canceled');

        // Temporal Validation
        const now = new Date();
        if (now >= new Date(event.end)) return new statusObject(400, 'Event has ended');
        if (now >= new Date(event.start)) return new statusObject(400, 'Event has started');

        // Tag Joining Policies (Whitelist vs Role-based)
        if (event.tags) {
            for (const tag of event.tags) {
                if (tag.join_policy === 'whitelist') {
                    const whitelisted = await TagsDB.isWhitelisted(db, tag.id, user.id);
                    if (!whitelisted) return new statusObject(403, `Restricted access (${tag.name})`);
                } else if (tag.join_policy === 'role') {
                    // Check if user has a role that explicitly manages this tag
                    const hasRole = await RolesDB.hasRoleForTag(db, user.id, tag.id);
                    if (!hasRole) return new statusObject(403, `Role required for (${tag.name})`);
                }
            }
        }

        // Capacity Enforcement
        const currentCountRes = await AttendanceDB.get_event_attendance_count(db, event.id);
        if (currentCountRes.isError()) return currentCountRes;
        const currentCount = currentCountRes.getData();

        if (event.max_attendees > 0 && currentCount >= event.max_attendees) {
            return new statusObject(400, 'Event is full');
        }

        // Instructor/Coach Safety Check
        // Non-instructors can only join if at least one instructor is already attending
        if (!user.is_instructor) {
            const coachCount = await AttendanceDB.getCoachesAttendingCount(db, event.id);
            if (coachCount === 0) return new statusObject(403, 'No coach attending');
        }

        // GDPR and Legal Compliance
        if (!user.filled_legal_info) return new statusObject(403, 'Legal info incomplete');

        // Financial Standing Check
        const balanceRes = await TransactionsDB.get_balance(db, user.id);
        const balance = balanceRes.getData();
        const minMoney = new Globals().getFloat('MinMoney');
        if (balance < minMoney) {
            return new statusObject(403, 'Outstanding debts');
        }

        // Membership Standing / Session Credits
        if (!user.is_member) {
            if (user.free_sessions <= 0) return new statusObject(403, 'No free sessions remaining');
        }

        // Duplicate Check
        const attendingRes = await AttendanceDB.is_user_attending_event(db, user.id, event.id);
        if (attendingRes.getData()) return new statusObject(400, 'Already attending');

        return new statusObject(200, 'Allowed');
    }
}

module.exports = EventRules;