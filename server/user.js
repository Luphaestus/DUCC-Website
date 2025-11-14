class User {

    static async getDifficultyLevel(req, res) {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return false;
        }

        try {
            const user = await req.app.db.get(
                `SELECT difficulty_level FROM users WHERE id = ?`,
                [req.user.id]
            );
            if (!user) {
                return false;
            }
            return user.difficulty_level;
        } catch (error) {
            return null;
        }
    }
}

module.exports = User;