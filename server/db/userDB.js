class UserDB {
    /**
     * Retrieves the first name of the authenticated user.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @returns {Promise<string|number>} A promise that resolves to the user's first name or an error code.
     */
    static async getName(req, db, id = null) {
        if (!req.isAuthenticated()) {
            return 401;
        }

        if (id && (await this.canManageUsers(req, db) !== 1)) {
            return 403;
        }

        try {
            const user = await db.get(
                `SELECT first_name, last_name FROM users WHERE id = ?`,
                id || req.user.id
            );
            if (!user) {
                return 404;
            }
            return {
                first_name: user.first_name,
                last_name: user.last_name,
            };
        } catch (error) {
            console.or('Database error in getName:', error);
            return 500;
        }
    }

    static async getProfile(req, db, id = null) {
        if (!req.isAuthenticated()) {
            return 401;
        }

        if (id && (await this.canManageUsers(req, db) !== 1)) {
            return 403;
        }

        try {
            const user = await db.get(
                `SELECT id, email, first_name, last_name, can_manage_users FROM users WHERE id = ?`,
                id || req.user.id
            );
            if (!user) {
                return 404;
            }
            return user;
        } catch (error) {
            console.error('Database error in getProfile:', error);
            return 500;
        }
    }

    static async getUsers(req, db) {
        if (!req.isAuthenticated() || (await this.canManageUsers(req, db) !== 1)) {
            return 401;
        }

        try {
            const users = await db.all(
                `SELECT id, email, first_name, last_name, can_manage_users FROM users`
            );
            return users;
        } catch (error) {
            console.error('Database error in getUsers:', error);
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
            return 1;
        }

        try {
            const user = await db.get(
                `SELECT difficulty_level FROM users WHERE id = ?`,
                [req.user.id]
            );
            if (!user) {
                return 1;
            }
            if (user.difficulty_level === null || user.difficulty_level === undefined) {
                return 1;
            }
            return user.difficulty_level;
        } catch (error) {
            return 1;
        }
    }

    static async canManageUsers(req, db) {
        if (!req.isAuthenticated()) {
            return 401;
        }

        try {
            const user = await db.get(
                `SELECT can_manage_users FROM users WHERE id = ?`,
                [req.user.id]
            );
            if (!user) {
                return 401;
            }
            return user.can_manage_users;
        } catch (error) {
            return 401;
        }
    }

    static async getLegalInfo(req, db, id = null) {
        if (!req.isAuthenticated()) {
            return 401;
        }

        if (id && (await this.canManageUsers(req, db) !== 1)) {
            return 403;
        }

        try {
            const user = await db.get(
                `SELECT
                    date_of_birth,
                    college_id,
                    emergency_contact_name,
                    emergency_contact_phone,
                    home_address,
                    phone_number,
                    has_medical_conditions,
                    medical_conditions_details,
                    takes_medication,
                    medication_details,
                    agrees_to_fitness_statement,
                    agrees_to_club_rules,
                    agrees_to_pay_debts,
                    agrees_to_data_storage,
                    agrees_to_keep_health_data,
                    filled_legal_info
                FROM users WHERE id = ?`,
                id || req.user.id
            );
            if (!user) {
                return 404;
            }
            if (user.college_id) {
                const college = await db.get(
                    `SELECT name FROM colleges WHERE id = ?`,
                    [user.college_id]
                );
                user.college = college ? college.name : null;
            } else {
                user.college = null;
            }
            return user;
        } catch (error) {
            console.error('Database error in getLegalInfo:', error);
            return 500;
        }
    }

    static async setLegalInfo(req, db) {
        if (!req.isAuthenticated()) {
            return 401;
        }

        var {
            date_of_birth,
            college_id,
            college,
            emergency_contact_name,
            emergency_contact_phone,
            home_address,
            phone_number,
            has_medical_conditions,
            medical_conditions_details,
            takes_medication,
            medication_details,
            agrees_to_fitness_statement,
            agrees_to_club_rules,
            agrees_to_pay_debts,
            agrees_to_data_storage,
            agrees_to_keep_health_data,
        } = req.body;

        if (!agrees_to_fitness_statement || !agrees_to_club_rules || !agrees_to_pay_debts || !agrees_to_data_storage) {
            return 400;
        }

        if (date_of_birth === undefined || emergency_contact_name === undefined ||
            emergency_contact_phone === undefined || home_address === undefined || phone_number === undefined ||
            has_medical_conditions === undefined || medical_conditions_details === undefined ||
            takes_medication === undefined || medication_details === undefined) {
            return 400;
        }

        if (college_id === undefined && college === undefined) {
            return 400;
        }

        if (college_id === undefined) {
            try {
                const collegeRow = await db.get(
                    `SELECT id FROM colleges WHERE name = ?`,
                    [college]
                );
                if (!collegeRow) {
                    return 400;
                }
                college_id = collegeRow.id;
            } catch (error) {
                console.error('Database error in setLegalInfo:', error);
                return 500;
            }
        }

        try {
            await db.run(
                `UPDATE users SET
                    date_of_birth = ?,
                    college_id = ?,
                    emergency_contact_name = ?,
                    emergency_contact_phone = ?,
                    home_address = ?,
                    phone_number = ?,
                    has_medical_conditions = ?,
                    medical_conditions_details = ?,
                    takes_medication = ?,
                    medication_details = ?,
                    agrees_to_fitness_statement = ?,
                    agrees_to_club_rules = ?,
                    agrees_to_pay_debts = ?,
                    agrees_to_data_storage = ?,
                    agrees_to_keep_health_data = ?,
                    filled_legal_info = 1
                WHERE id = ?`,
                [
                    date_of_birth,
                    college_id,
                    emergency_contact_name,
                    emergency_contact_phone,
                    home_address,
                    phone_number,
                    has_medical_conditions,
                    medical_conditions_details,
                    takes_medication,
                    medication_details,
                    agrees_to_fitness_statement,
                    agrees_to_club_rules,
                    agrees_to_pay_debts,
                    agrees_to_data_storage,
                    agrees_to_keep_health_data,
                    req.user.id
                ]
            );
            return 200;
        } catch (error) {
            return 500;
        }
    }
}

module.exports = UserDB;