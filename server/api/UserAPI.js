const { statusObject } = require('../misc/status.js');
const UserDB = require('../db/userDB.js');
const transactionsDB = require('../db/transactionDB.js');
const Globals = require('../misc/globals.js');
const check = require('../misc/authentication');
const bcrypt = require('bcrypt');

/**
 * API for user profiles, validation, membership, and account management.
 * @module User
 */
class User {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Required fields for complete legal/medical information.
     */
    static legalElements = [
        "date_of_birth", "college_id", "emergency_contact_name", "emergency_contact_phone",
        "home_address", "phone_number", "has_medical_conditions", "medical_conditions_details",
        "takes_medication", "medication_details", "agrees_to_fitness_statement",
        "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data"
    ];

    /**
     * Get authenticated user ID.
     * @param {object} req
     * @returns {number|null}
     */
    static getID(req) { return req.user ? req.user.id : null; }

    /**
     * Fetch whitelisted profile elements for current user.
     * @param {object} req
     * @param {object} db
     * @param {string|string[]} elements
     * @returns {Promise<statusObject>}
     */
    static async getAccessibleElements(req, db, elements) {
        /**
         * Check element access permissions.
         */
        function isElementAccessibleByNormalUser(element) {
            const accessibleUserDB = [
                "email", "first_name", "last_name", "date_of_birth", "college_id",
                "emergency_contact_name", "emergency_contact_phone", "home_address",
                "phone_number", "has_medical_conditions", "medical_conditions_details",
                "takes_medication", "medication_details", "free_sessions", "is_member",
                "agrees_to_fitness_statement", "agrees_to_club_rules", "agrees_to_pay_debts",
                "agrees_to_data_storage", "agrees_to_keep_health_data", "filled_legal_info",
                "can_manage_events", "can_manage_users", "can_manage_transactions",
                "is_instructor", "is_exec", "first_aid_expiry", "profile_picture_path",
                "created_at", "swims", "swimmer_rank"
            ];
            const accessibleTransactionsDB = ['balance', 'transactions'];
            return [accessibleUserDB.includes(element), accessibleTransactionsDB.includes(element)];
        }

        if (typeof elements === 'string') elements = [elements];

        const userElements = [];
        const transactionElements = [];

        for (const element of elements) {
            const [accessibleUserDB, accessibleTransactionsDB] = isElementAccessibleByNormalUser(element);
            if (!accessibleUserDB && !accessibleTransactionsDB) return new statusObject(403, 'Forbidden element: ' + element);
            if (accessibleUserDB) userElements.push(element);
            if (accessibleTransactionsDB) transactionElements.push(element);
        }

        let userResultData = {};
        if (userElements.length > 0) {
            const needsRank = userElements.includes('swimmer_rank');
            const cleanElements = userElements.filter(e => e !== 'swimmer_rank');
            
            const userResult = await UserDB.getElements(req, db, cleanElements);
            if (userResult.isError()) return userResult;
            userResultData = userResult.getData();

            if (needsRank) {
                const [allTimeRes, yearlyRes] = await Promise.all([
                    UserDB.getUserSwimmerRank(db, req.user.id, false),
                    UserDB.getUserSwimmerRank(db, req.user.id, true)
                ]);
                const allTimeData = allTimeRes.getData() || { rank: -1, swims: 0 };
                const yearlyData = yearlyRes.getData() || { rank: -1, swims: 0 };
                userResultData.swimmer_stats = { allTime: allTimeData, yearly: yearlyData };
                userResultData.swimmer_rank = allTimeData.rank;
            }
        }

        let transactionResultData = {};
        if (transactionElements.length > 0) {
            const transactionResult = await transactionsDB.getElements(req, db, transactionElements);
            if (transactionResult.isError()) return transactionResult;
            transactionResultData = transactionResult.getData();
        }

        return new statusObject(200, null, { ...userResultData, ...transactionResultData });
    }

    /**
     * Validate and write profile updates.
     * @param {object} req
     * @param {object} db
     * @param {object} data
     * @returns {Promise<statusObject>}
     */
    static async writeNormalElements(req, db, data) {
        /**
         * Internal validation for profile fields.
         */
        async function isNormalWritableElement(element, data, db) {
            async function getElement(element, data, db) {
                if (element in data) return new statusObject(200, null, data[element]);
                return await User.getAccessibleElements(req, db, element);
            }

            const phonePattern = /^\+?[0-9\s\-()]{7,15}$/;
            const namePattern = /^[a-zA-Z\s ,.'-]+$/;
            const value = data[element];
            let validated = false;
            let errorMessage = "";

            switch (element) {
                case "email":
                    validated = /^[^@]+\.[^@]+@durham\.ac\.uk$/i.test(value);
                    errorMessage = "Invalid email format (must be @durham.ac.uk)."
                    break;
                case "first_name":
                case "last_name":
                case "emergency_contact_name":
                    validated = namePattern.test(value);
                    errorMessage = "Invalid name format.";
                    break;
                case "date_of_birth":
                    const dob = new Date(value);
                    const today = new Date();
                    const maxDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
                    const minDate = new Date(today.getFullYear() - 90, today.getMonth(), today.getDate());
                    validated = dob >= minDate && dob <= maxDate;
                    errorMessage = "Age must be between 17 and 90.";
                    break;
                case "college_id":
                    const row = await db.get('SELECT id FROM colleges WHERE name = ?', [value]);
                    validated = !!row;
                    errorMessage = "Invalid college.";
                    break;
                case "emergency_contact_phone":
                case "phone_number":
                    validated = phonePattern.test(value);
                    errorMessage = "Invalid phone format.";
                    break;
                case "home_address":
                    validated = value.trim() !== '';
                    errorMessage = "Address required.";
                    break;
                case "has_medical_conditions":
                case "takes_medication":
                case "agrees_to_keep_health_data":
                case "is_instructor":
                    validated = typeof value === 'boolean';
                    errorMessage = "Invalid boolean value.";
                    break;
                case "medical_conditions_details":
                    if ((await getElement("has_medical_conditions", data, db)).getData()) {
                        validated = value.trim() !== '';
                        errorMessage = "Description required if conditions exist.";
                        break;
                    }
                    validated = true;
                    break;
                case "medication_details":
                    if ((await getElement("takes_medication", data, db)).getData()) {
                        validated = value.trim() !== '';
                        errorMessage = "Description required if taking medication.";
                        break;
                    }
                    validated = true;
                    break;
                case "agrees_to_fitness_statement":
                case "agrees_to_club_rules":
                case "agrees_to_pay_debts":
                case "agrees_to_data_storage":
                    validated = value === true;
                    errorMessage = "Agreement required.";
                    break;
                case "first_aid_expiry":
                    if (value === null) { validated = true; break; }
                    const expiry = new Date(value);
                    const now = new Date();
                    const limit = new Date(); limit.setFullYear(now.getFullYear() + 20);
                    validated = expiry > now && expiry <= limit;
                    errorMessage = "Expiry must be in the future (max 20 years).";
                    break;
                default:
                    return undefined;
            }

            if (!validated) return new statusObject(400, errorMessage);
            return new statusObject(200, User.legalElements.includes(element));
        }

        async function getElement(element, data, db) {
            if (element in data) return new statusObject(200, null, data[element]);
            return await User.getAccessibleElements(req, db, element);
        }

        let legalUpdateNeeded = false;
        for (const element in data) {
            const status = await isNormalWritableElement(element, data, db);
            if (status.isError()) return status;
            if (status.getMessage()) legalUpdateNeeded = true;
        }

        if (legalUpdateNeeded) {
            let allFilled = true;
            for (const element of User.legalElements) {
                const val = await getElement(element, data, db);
                if (val.isError() || val.getData() === null || val.getData() === undefined) {
                    allFilled = false;
                    break;
                }
            }
            if (allFilled) data["filled_legal_info"] = 1;
        }

        const writeStatus = await UserDB.writeElements(req, db, data);
        if (writeStatus.isError()) return writeStatus;
        return new statusObject(200);
    }

    /**
     * Register user routes.
     */
    registerRoutes() {
        /**
         * Fetch profile elements.
         */
        this.app.get('/api/user/elements/:elements', check(), async (req, res) => {
            const elements = req.params.elements.split(',').map(e => e.trim());
            const status = await User.getAccessibleElements(req, this.db, elements);
            if (status.isError()) return status.getResponse(res);
            res.json(status.getData());
        });

        /**
         * Update profile elements.
         */
        this.app.post('/api/user/elements', check(), async (req, res) => {
            const status = await User.writeNormalElements(req, this.db, req.body);
            if (status.isError()) return status.getResponse(res);
            res.json({ success: true });
        });

        /**
         * Process membership joining and fee.
         */
        this.app.post('/api/user/join', check(), async (req, res) => {
            try {
                const status = await UserDB.getElements(req, this.db, 'is_member');
                if (status.isError()) return status.getResponse(res);
                if (status.getData().is_member) return res.status(400).json({ message: 'Already a member.' });

                const tx = await transactionsDB.add_transaction(req, this.db, User.getID(req), - new Globals().getFloat('MembershipCost'), 'Membership Fee');
                if (typeof tx === 'number' && tx >= 400) return res.status(tx).json({ message: 'Transaction failed' });

                const update = await UserDB.setMembershipStatus(req, this.db, true);
                if (update.isError()) return update.getResponse(res);
                res.json({ success: true });
            } catch (err) {
                res.status(500).json({ message: 'Internal error' });
            }
        });

        /**
         * Delete account (denied if in debt).
         */
        this.app.post('/api/user/deleteAccount', check(), async (req, res) => {
            const { password } = req.body;
            if (!password) return res.status(400).json({ message: 'Password is required to delete account.' });

            try {
                // Verify password
                const user = await this.db.get('SELECT hashed_password FROM users WHERE id = ?', [req.user.id]);
                if (!user || !user.hashed_password) return res.status(400).json({ message: 'User not found or invalid state.' });

                const isMatch = await bcrypt.compare(password, user.hashed_password);
                if (!isMatch) return res.status(403).json({ message: 'Incorrect password.' });

                const balance = await transactionsDB.get_balance(req, this.db);
                if (balance.isError()) return balance.getResponse(res);
                if (balance.getData() < 0) return res.status(400).json({ message: 'Outstanding debts exist.' });

                const status = await UserDB.removeUser(req, this.db);
                if (status.isError()) return status.getResponse(res);

                req.logout((err) => { res.json({ success: true }); });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Internal server error.' });
            }
        });

        /**
         * Fetch swim leaderboard (all-time or yearly).
         */
        this.app.get('/api/user/swims/leaderboard', check(), async (req, res) => {
            const yearly = req.query.yearly === 'true';
            const status = await UserDB.getSwimsLeaderboard(this.db, yearly);
            return status.getResponse(res);
        });

        /**
         * Add swims to a user (Exec only).
         */
        this.app.post('/api/user/:id/swims', check('is_exec'), async (req, res) => {
            const userId = parseInt(req.params.id, 10);
            const count = parseInt(req.body.count, 10);
            if (isNaN(userId) || isNaN(count)) return res.status(400).json({ message: 'Invalid data' });
            const status = await UserDB.addSwims(req, this.db, userId, count);
            return status.getResponse(res);
        });
    }
}

module.exports = User;