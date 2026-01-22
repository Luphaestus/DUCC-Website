const { statusObject } = require('../misc/status.js');
const Globals = require('../misc/globals.js');
const AttendanceDB = require('../db/attendanceDB.js');
const TagsDB = require('../db/tagsDB.js');
const RolesDB = require('../db/rolesDB.js');
const TransactionsDB = require('../db/transactionDB.js');

class EventRules {
    /**
     * Determine if a user can view an event.
     * @param {object} event - Event object with tags.
     * @param {object} user - User object.
     * @returns {boolean}
     */
    static canViewEvent(event, user) {
        // Difficulty Check
        const userDiff = user ? user.difficulty_level : new Globals().getInt("Unauthorized_max_difficulty");
        if (event.difficulty_level > userDiff) return false;

        // Tag Visibility Policy
        if (event.tags) {
            for (const tag of event.tags) {
                if (tag.min_difficulty && tag.min_difficulty > userDiff) return false;
            }
        }

        return true;
    }

    /**
     * Determine if a user can join an event.
     * @param {object} db - Database connection.
     * @param {object} event - Event object.
     * @param {object} user - User object.
     * @returns {Promise<statusObject>} - 200 OK or Error status.
     */
    static async canJoinEvent(db, event, user) {
        if (!user) return new statusObject(401, 'User not authenticated');

        // Signup Required Check
        if (!event.signup_required) {
            return new statusObject(400, 'Signup is not required for this event');
        }

        // Event Status
        if (event.is_canceled) return new statusObject(400, 'Event is canceled');

        // Timing
        const now = new Date();
        if (now >= new Date(event.end)) return new statusObject(400, 'Event has ended');
        if (now >= new Date(event.start)) return new statusObject(400, 'Event has started');

        // Tag Policies (Whitelist/Role)
        if (event.tags) {
            for (const tag of event.tags) {
                if (tag.join_policy === 'whitelist') {
                    const whitelisted = await TagsDB.isWhitelisted(db, tag.id, user.id);
                    if (!whitelisted) return new statusObject(403, `Restricted access (${tag.name})`);
                } else if (tag.join_policy === 'role') {
                    // Check if user has a role that manages this tag
                    const hasRole = await RolesDB.hasRoleForTag(db, user.id, tag.id);
                    if (!hasRole) return new statusObject(403, `Role required for (${tag.name})`);
                }
            }
        }

        // Capacity
        const currentCountRes = await AttendanceDB.get_event_attendance_count(db, event.id);
        if (currentCountRes.isError()) return currentCountRes;
        const currentCount = currentCountRes.getData();

        if (event.max_attendees > 0 && currentCount >= event.max_attendees) {
            return new statusObject(400, 'Event is full');
        }

        // Coach Requirement
        if (!user.is_instructor) {
            const coachCount = await AttendanceDB.getCoachesAttendingCount(db, event.id);
            if (coachCount === 0) return new statusObject(403, 'No coach attending');
        }

        // User Constraints
        if (!user.filled_legal_info) return new statusObject(403, 'Legal info incomplete');

        // Debt Check
        const balanceRes = await TransactionsDB.get_balance(db, user.id);
        const balance = balanceRes.getData();
        const minMoney = new Globals().getFloat('MinMoney');
        if (balance < minMoney) {
            return new statusObject(403, 'Outstanding debts');
        }

        // Membership / Free Sessions
        if (!user.is_member) {
            if (user.free_sessions <= 0) return new statusObject(403, 'No free sessions remaining');
        }

        // Already Attending
        const attendingRes = await AttendanceDB.is_user_attending_event(db, user.id, event.id);
        if (attendingRes.getData()) return new statusObject(400, 'Already attending');

        return new statusObject(200, 'Allowed');
    }
}

module.exports = EventRules;