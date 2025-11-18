class UserDB {
    /**
     * Retrieves the first name of the authenticated user.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @returns {Promise<string|number>} A promise that resolves to the user's first name or an error code.
     */
    static async getFirstName(req, db) {
        if (!req.isAuthenticated()) {
            return 401;
        }

        try {
            const user = await db.get(
                `SELECT first_name FROM users WHERE id = ?`,
                req.user.id
            );
            if (!user) {
                return 404;
            }
            return user.first_name;
        } catch (error) {
            console.error('Database error in getFirstName:', error);
            return 500;
        }
    }

    /**
     * Retrieves the difficulty level of the authenticated user.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @returns {Promise<number>} A promise that resolves to the user's difficulty level or an error code.
     */
    static async getDifficultyLevel(req, db) {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return 401;
        }

        try {
            const user = await db.get(
                `SELECT difficulty_level FROM users WHERE id = ?`,
                [req.user.id]
            );
            if (!user) {
                return 404;
            }
            if (user.difficulty_level === null || user.difficulty_level === undefined) {
                return 204;
            }
            return user.difficulty_level;
        } catch (error) {
            return 500;
        }
    }
}

module.exports = UserDB;