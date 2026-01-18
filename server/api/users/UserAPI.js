const { statusObject } = require('../../misc/status.js');
const UserDB = require('../../db/userDB.js');
const SwimsDB = require('../../db/swimsDB.js');
const transactionsDB = require('../../db/transactionDB.js');
const Globals = require('../../misc/globals.js');
const check = require('../../misc/authentication.js');
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
                "is_instructor", "first_aid_expiry", "profile_picture_path",
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
                const allTimeData = allTimeRes.getData() || { rank: -1, swims: 0 };
                const yearlyData = yearlyRes.getData() || { rank: -1, swims: 0 };
                userResultData.swimmer_stats = { allTime: allTimeData, yearly: yearlyData };
                userResultData.swimmer_rank = allTimeData.rank;
            }

            if (needsPerms || needsRoles) {
                // Fetch roles
                const roles = await db.all('SELECT r.id, r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [req.user.id]);
                if (needsRoles) userResultData.roles = roles;
                
                if (needsPerms) {
                    const Permissions = require('../../misc/permissions.js');
                    
                    const rolePerms = await db.all(`
                        SELECT DISTINCT p.slug 
                        FROM permissions p
                        JOIN role_permissions rp ON p.id = rp.permission_id
                        JOIN user_roles ur ON rp.role_id = ur.role_id
                        WHERE ur.user_id = ?
                    `, [req.user.id]);
                    
                    const directPerms = await db.all(`
                        SELECT DISTINCT p.slug 
                        FROM permissions p
                        JOIN user_permissions up ON p.id = up.permission_id
                        WHERE up.user_id = ?
                    `, [req.user.id]);

                    const allSlugs = new Set([
                        ...rolePerms.map(p => p.slug), 
                        ...directPerms.map(p => p.slug)
                    ]);
                    userResultData.permissions = Array.from(allSlugs);
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
                    errorMessage = "Invalid email format (must be first.last@durham.ac.uk)."
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

        if (data.email) data.email = data.email.replace(/\s/g, '').toLowerCase();

        const writeStatus = await UserDB.writeElements(db, req.user.id, data);
        if (writeStatus.isError()) return writeStatus;
        return new statusObject(200);
    }

    /**
     * Internal helper to preprocess input data before database operations.
     * @param {object} data
     */
    static preprocessData(data) {
        if (data.email) data.email = data.email.replace(/\s/g, '').toLowerCase();
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
            User.preprocessData(req.body);
            const status = await User.writeNormalElements(req, this.db, req.body);
            if (status.isError()) return status.getResponse(res);
            res.json({ success: true });
        });

        /**
         * Process membership joining and fee.
         */
        this.app.post('/api/user/join', check(), async (req, res) => {
            try {
                const status = await UserDB.getElements(this.db, req.user.id, 'is_member');
                if (status.isError()) return status.getResponse(res);
                if (status.getData().is_member) return res.status(400).json({ message: 'Already a member.' });

                const tx = await transactionsDB.add_transaction(this.db, User.getID(req), - new Globals().getFloat('MembershipCost'), 'Membership Fee');
                if (typeof tx === 'number' && tx >= 400) return res.status(tx).json({ message: 'Transaction failed' });

                const update = await UserDB.setMembershipStatus(this.db, req.user.id, true);
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