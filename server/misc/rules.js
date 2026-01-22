const { statusObject } = require('./status.js');
const Globals = require('./globals.js');
const AttendanceDB = require('../db/attendanceDB.js');
const TagsDB = require('../db/tagsDB.js');
const RolesDB = require('../db/rolesDB.js');
const TransactionsDB = require('../db/transactionDB.js');

class Rules {
    /**
     * Regex patterns and messages.
     */
    static validation = {
        email: {
            pattern: /^[^@]+\.[^@]+@durham\.ac\.uk$/i,
            message: 'Invalid email format. Must be a Durham University email (first.last@durham.ac.uk).'
        },
        name: {
            pattern: /^[a-zA-Z\s,.'-]{1,100}$/,
            message: 'Invalid name. Allowed characters: letters, spaces, hyphens, apostrophes, dots, and commas.'
        },
        phone: {
            pattern: /^\+?[0-9\s\-()]{7,15}$/,
            message: 'Invalid phone number. Must be 7-15 digits, optionally with +, -, or ().'
        }
    };

    /**
     * Validate an input against rules.
     * @param {string} type - 'email', 'name', 'phone', 'date_of_birth', 'boolean', 'presence'.
     * @param {any} value - Value to validate.
     * @param {boolean} [required=true] - Whether the field is required.
     * @returns {string|null} - Error message or null if valid.
     */
    static validate(type, value, required = true) {
        if (value === undefined || value === null || value === '') {
            if (required) return 'Field is required.';
            return null;
        }

        if (type === 'presence') return null; 

        if (type === 'boolean') {
            if (typeof value !== 'boolean') return 'Invalid value. Must be true or false.';
            return null;
        }

        if (type === 'date_of_birth') {
            const dob = new Date(value);
            if (isNaN(dob.getTime())) return 'Invalid date.';
            const today = new Date();
            const maxDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
            const minDate = new Date(today.getFullYear() - 90, today.getMonth(), today.getDate());
            if (dob < minDate || dob > maxDate) return 'Age must be between 17 and 90.';
            return null;
        }

        const rule = this.validation[type];
        if (!rule) return null;

        if (typeof value !== 'string') return 'Invalid format.';

        if (!rule.pattern.test(value)) {
            return rule.message;
        }
        return null;
    }

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

module.exports = Rules;
