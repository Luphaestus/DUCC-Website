class eventsDB {
    /**
     * Retrieves all events from the database that have a difficulty level less than or equal to the specified maximum difficulty.
     * Events are ordered by their start time in ascending order.
     * @param {object} db - The database instance.
     * @param {number} max_difficulty - The maximum difficulty level of events to retrieve.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of event objects.
     */
    static async get_all_events(db, max_difficulty) {
        return db.all(
            'SELECT * FROM events WHERE difficulty_level <= ? ORDER BY start ASC',
            [max_difficulty]
        );
    }

    /**
     * Retrieves events for a specific week, based on a given date, that have a difficulty level less than or equal to the specified maximum difficulty.
     * The week starts on Monday and ends on Sunday. Events are ordered by their start time in ascending order.
     * @param {object} db - The database instance.
     * @param {number} max_difficulty - The maximum difficulty level of events to retrieve.
     * @param {Date} [date=new Date()] - The date within the target week. Defaults to the current date.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of event objects.
     */
    static async get_events_for_week(db, max_difficulty, date = new Date()) {
        const startOfWeek = date;
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return db.all(
            'SELECT * FROM events WHERE start BETWEEN ? AND ? AND difficulty_level <= ? ORDER BY start ASC',
            [startOfWeek.toISOString(), endOfWeek.toISOString(), max_difficulty]
        );
    }

    /**
     * Retrieves events for a week relative to the current week, based on an offset, that have a difficulty level less than or equal to the specified maximum difficulty.
     * An offset of 0 means the current week, 1 means next week, -1 means last week, and so on.
     * @param {object} db - The database instance.
     * @param {number} max_difficulty - The maximum difficulty level of events to retrieve.
     * @param {number} [offset=0] - The offset in weeks from the current week. Defaults to 0 (current week).
     * @returns {Promise<Array<object>>} A promise that resolves to an array of event objects.
     */
    static async get_events_relative_week(db, max_difficulty, offset = 0) {
        const now = new Date();
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + offset * 7);
        return this.get_events_for_week(db, max_difficulty, targetDate);
    }
}

module.exports = eventsDB;