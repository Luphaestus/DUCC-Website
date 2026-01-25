/**
 * UserAPI.js
 * 
 * This file handles user profile management, membership status, and account settings.
 */

const { statusObject } = require('../../misc/status.js');
const UserDB = require('../../db/userDB.js');
const SwimsDB = require('../../db/swimsDB.js');
const transactionsDB = require('../../db/transactionDB.js');
const RolesDB = require('../../db/rolesDB.js');
const CollegesDB = require('../../db/collegesDB.js');
const Globals = require('../../misc/globals.js');
const AuthDB = require('../../db/authDB.js');
const check = require('../../misc/authentication.js');
const bcrypt = require('bcrypt');
const ValidationRules = require('../../rules/ValidationRules.js');

class User {
    /**
     * @param {object} app - Express app.
     * @param {object} db - SQLite database.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    static legalElements = [
        "date_of_birth", "college_id", "emergency_contact_name", "emergency_contact_phone",
        "home_address", "phone_number", "has_medical_conditions", "medical_conditions_details",
        "takes_medication", "medication_details", "agrees_to_fitness_statement",
        "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data"
    ];

    /**
     * Get authenticated user ID.
     */
    static getID(req) { return req.user ? req.user.id : null; }

    /**
     * Fetch whitelisted profile elements for current user.
     */
    static async getAccessibleElements(req, db, elements) {
        function isElementAccessibleByNormalUser(element) {
            const accessibleUserDB = [
                "email", "first_name", "last_name", "date_of_birth", "college_id",
                "emergency_contact_name", "emergency_contact_phone", "home_address",
                "phone_number", "has_medical_conditions", "medical_conditions_details",
                "takes_medication", "medication_details", "free_sessions", "is_member",
                "agrees_to_fitness_statement", "agrees_to_club_rules", "agrees_to_pay_debts",
                "agrees_to_data_storage", "agrees_to_keep_health_data", "filled_legal_info", "legal_filled_at",
                "is_instructor", "first_aid_expiry", "profile_picture_path", "profile_picture_id",
                "created_at", "swims", "swimmer_rank", "permissions", "roles"
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
            const needsPerms = userElements.includes('permissions');
            const needsRoles = userElements.includes('roles');
            const cleanElements = userElements.filter(e => !['swimmer_rank', 'permissions', 'roles'].includes(e));

            let userResult;
            if (cleanElements.length > 0) {
                userResult = await UserDB.getElements(db, req.user.id, cleanElements);
                if (userResult.isError()) return userResult;
                userResultData = userResult.getData();
            }

            if (needsRank) {
                const [allTimeRes, yearlyRes] = await Promise.all([
                    SwimsDB.getUserSwimmerRank(db, req.user.id, false),
                    SwimsDB.getUserSwimmerRank(db, req.user.id, true)
                ]);
                let allTimeData = allTimeRes.getData() || { rank: -1, swims: 0 };
                allTimeData.rank = allTimeData.swims === 0 ? -1 : allTimeData.rank;
                
                let yearlyData = yearlyRes.getData() || { rank: -1, swims: 0 };
                yearlyData.rank = yearlyData.swims === 0 ? -1 : yearlyData.rank;

                userResultData.swimmer_stats = { allTime: allTimeData, yearly: yearlyData };
                userResultData.swimmer_rank = allTimeData.rank;
            }

            if (needsPerms || needsRoles) {
                if (needsRoles) {
                    const rolesRes = await RolesDB.getUserRoles(db, req.user.id);
                    if (rolesRes.isError()) return rolesRes;
                    userResultData.roles = rolesRes.getData();
                }

                if (needsPerms) {
                    const permsRes = await RolesDB.getAllUserPermissions(db, req.user.id);
                    if (permsRes.isError()) return permsRes;
                    userResultData.permissions = permsRes.getData();
                }
            }
        }

        let transactionResultData = {};
        if (transactionElements.length > 0) {
            const transactionResult = await transactionsDB.getElements(db, req.user.id, transactionElements);
            if (transactionResult.isError()) return transactionResult;
            transactionResultData = transactionResult.getData();
        }

        return new statusObject(200, null, { ...userResultData, ...transactionResultData });
    }

    /**
     * Validate and write profile updates.
     */
    static async writeNormalElements(req, db, data) {
        async function getElement(element, data, db) {
            if (element in data) return new statusObject(200, null, data[element]);
            return await User.getAccessibleElements(req, db, element);
        }

        const errors = {};
        let legalUpdateNeeded = false;

        for (const element in data) {
            const value = data[element];
            let error = null;

            switch (element) {
                case "email":
                    error = ValidationRules.validate('email', value);
                    break;
                case "first_name":
                case "last_name":
                case "emergency_contact_name":
                    error = ValidationRules.validate('name', value);
                    break;
                case "date_of_birth":
                    error = ValidationRules.validate('date_of_birth', value);
                    break;
                case "college_id":
                    error = ValidationRules.validate('presence', value);
                    if (!error) {
                        const college = await CollegesDB.getCollegeById(db, value);
                        if (!college) error = "Invalid college.";
                    }
                    break;
                case "emergency_contact_phone":
                case "phone_number":
                    error = ValidationRules.validate('phone', value);
                    break;
                case "home_address":
                    error = ValidationRules.validate('presence', value);
                    break;
                case "has_medical_conditions":
                case "takes_medication":
                case "agrees_to_keep_health_data":
                case "is_instructor":
                    error = ValidationRules.validate('boolean', value);
                    break;
                case "medical_conditions_details":
                    if ((await getElement("has_medical_conditions", data, db)).getData()) {
                        error = ValidationRules.validate('presence', value);
                        if (error) error = "Description required if conditions exist.";
                    }
                    break;
                case "medication_details":
                    if ((await getElement("takes_medication", data, db)).getData()) {
                        error = ValidationRules.validate('presence', value);
                        if (error) error = "Description required if taking medication.";
                    }
                    break;
                case "agrees_to_fitness_statement":
                case "agrees_to_club_rules":
                case "agrees_to_pay_debts":
                case "agrees_to_data_storage":
                    if (value !== true) error = "Agreement required.";
                    break;
                case "first_aid_expiry":
                    if (value === null) break;
                    const expiry = new Date(value);
                    const now = new Date();
                    const limit = new Date(); limit.setFullYear(now.getFullYear() + 20);
                    if (expiry <= now || expiry > limit) error = "Expiry must be in the future (max 20 years).";
                    break;
            }

            if (error) {
                errors[element] = error;
            }

            if (User.legalElements.includes(element)) {
                legalUpdateNeeded = true;
            }
        }

        if (Object.keys(errors).length > 0) {
            return new statusObject(400, 'Validation failed', { errors });
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
            if (allFilled) {
                data["filled_legal_info"] = 1;
                data["legal_filled_at"] = new Date().toISOString();
            }
        }

        if (data.email) data.email = data.email.replace(/\s/g, '').toLowerCase();

        const writeStatus = await UserDB.writeElements(db, req.user.id, data);
        if (writeStatus.isError()) return writeStatus;
        return new statusObject(200);
    }

    /**
     * Internal helper to preprocess input data before database operations.
     */
    static preprocessData(data) {
        if (data.email) data.email = data.email.replace(/\s/g, '').toLowerCase();
    }

    /**
     * Register user-related Express routes.
     */
    registerRoutes() {
        /**
         * Fetch profile elements for current user.
         */
        this.app.get('/api/user/elements/:elements', check(), async (req, res) => {
            const elements = req.params.elements.split(',').map(e => e.trim());
            const status = await User.getAccessibleElements(req, this.db, elements);
            if (status.isError()) return status.getResponse(res);
            res.json(status.getData());
        });

        /**
         * Fetch profile elements for a specific user.
         */
        this.app.get('/api/user/:id/elements/:elements', check('perm:is_exec'), async (req, res) => {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });
            
            const elements = req.params.elements.split(',').map(e => e.trim());
            const targetReq = { ...req, user: { ...req.user, id: userId } };
            const status = await User.getAccessibleElements(targetReq, this.db, elements);
            if (status.isError()) return status.getResponse(res);
            res.json(status.getData());
        });

        /**
         * Update current user's profile elements.
         */
        this.app.post('/api/user/elements', check(), async (req, res) => {
            User.preprocessData(req.body);
            const status = await User.writeNormalElements(req, this.db, req.body);
            if (status.isError()) {
                if (status.status === 400 && status.data && status.data.errors) {
                    return res.status(400).json({ message: status.message, errors: status.data.errors });
                }
                return status.getResponse(res);
            }
            res.json({ success: true });
        });

        /**
         * Process membership joining.
         */
        this.app.post('/api/user/join', check(), async (req, res) => {
            try {
                const status = await UserDB.getElements(this.db, req.user.id, 'is_member');
                if (status.isError()) return status.getResponse(res);
                if (status.getData().is_member) return res.status(400).json({ message: 'Already a member.' });

                const globals = new Globals();
                const cost = globals.getFloat('MembershipCost') || 50;

                const tx = await transactionsDB.add_transaction(this.db, User.getID(req), -cost, 'Membership Fee');
                if (typeof tx === 'number' && tx >= 400) return res.status(tx).json({ message: 'Transaction failed' });

                const update = await UserDB.setMembershipStatus(this.db, req.user.id, true);
                if (update.isError()) return update.getResponse(res);
                res.json({ success: true });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Internal error' });
            }
        });

        /**
         * Permanently delete current user account.
         */
        this.app.post('/api/user/deleteAccount', check(), async (req, res) => {
            const { password } = req.body;
            if (!password) return res.status(400).json({ message: 'Password is required to delete account.' });

            try {
                const user = await AuthDB.getUserById(this.db, req.user.id);
                if (!user || !user.hashed_password) return res.status(400).json({ message: 'User not found or invalid state.' });

                const isMatch = await bcrypt.compare(password, user.hashed_password);
                if (!isMatch) return res.status(403).json({ message: 'Incorrect password.' });

                const balance = await transactionsDB.get_balance(this.db, req.user.id);
                if (balance.isError()) return balance.getResponse(res);
                if (balance.getData() !== 0) return res.status(400).json({ message: 'Balance must be zero to delete account.' });

                const status = await UserDB.removeUser(this.db, req.user.id);
                if (status.isError()) return status.getResponse(res);

                req.logout((err) => { res.json({ success: true }); });
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Internal server error.' });
            }
        });
    }
}

module.exports = User;