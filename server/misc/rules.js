const { statusObject } = require('./status.js');
const Globals = require('./globals.js');

class Rules {
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

        // Event Status
        if (event.status === 'canceled') return new statusObject(400, 'Event is canceled');

        // Timing
        const now = new Date();
        if (now >= new Date(event.end)) return new statusObject(400, 'Event has ended');
        if (now >= new Date(event.start)) return new statusObject(400, 'Event has started');

        // Tag Policies (Whitelist/Role)
        if (event.tags) {
            for (const tag of event.tags) {
                if (tag.join_policy === 'whitelist') {
                    const whitelisted = await db.get(
                        'SELECT 1 FROM tag_whitelists WHERE tag_id = ? AND user_id = ?',
                        [tag.id, user.id]
                    );
                    if (!whitelisted) return new statusObject(403, `Restricted access (${tag.name})`);
                } else if (tag.join_policy === 'role') {
                    // Check if user has a role that manages this tag
                    const hasRole = await db.get(
                        `SELECT 1 FROM user_roles ur
                         JOIN role_managed_tags rmt ON ur.role_id = rmt.role_id
                         WHERE ur.user_id = ? AND rmt.tag_id = ?`,
                        [user.id, tag.id]
                    );
                    if (!hasRole) return new statusObject(403, `Role required for (${tag.name})`);
                }
            }
        }

        // Capacity (Handled by caller often, but logic here)
        // We need current attendee count.
        const countRes = await db.get('SELECT COUNT(*) as c FROM event_attendees WHERE event_id = ? AND is_attending = 1', [event.id]);
        const currentCount = countRes.c;
        if (event.max_attendees > 0 && currentCount >= event.max_attendees) {
            return new statusObject(400, 'Event is full');
        }

        // Coach Requirement
        // If user is not instructor, check if coach attending
        if (!user.is_instructor) {
            const coachCount = await db.get(
                `SELECT COUNT(*) as c FROM event_attendees ea 
                 JOIN users u ON ea.user_id = u.id 
                 WHERE ea.event_id = ? AND ea.is_attending = 1 AND u.is_instructor = 1`,
                [event.id]
            );
            if (coachCount.c === 0) return new statusObject(403, 'No coach attending');
        }

        // User Constraints (Legal, Membership, Debt)
        if (!user.filled_legal_info) return new statusObject(403, 'Legal info incomplete');

        // Debt Check
        const balanceRes = await db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [user.id]);
        const balance = balanceRes.b;
        const minMoney = new Globals().getFloat('MinMoney');
        if (event.upfront_cost === 0 && balance < minMoney) {
            return new statusObject(403, 'Outstanding debts');
        }

        // Membership / Free Sessions
        if (!user.is_member) {
            if (user.free_sessions <= 0) return new statusObject(403, 'No free sessions remaining');
        }

        // Already Attending
        const attending = await db.get('SELECT 1 FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1', [event.id, user.id]);
        if (attending) return new statusObject(400, 'Already attending');

        return new statusObject(200, 'Allowed');
    }
}

module.exports = Rules;
