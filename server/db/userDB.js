class UserDB {
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