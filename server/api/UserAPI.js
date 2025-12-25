const { statusObject } = require('../misc/status.js');
const UserDB = require('../db/userDB.js');
const transactionsDB = require('../db/transactionDB.js');
const Globals = require('../misc/globals.js');
const check = require('../misc/authentication');

/**
 * User API module.
 * Handles user profile data, validation, membership joining, and account deletion.
 * Includes complex validation logic for various user profile fields (the "elements").
 * 
 * Routes:
 *   GET  /api/user/elements/:elements -> Retrieves specific profile elements for the current user.
 *   POST /api/user/elements           -> Updates profile elements with validation.
 *   POST /api/user/join               -> Handles membership joining and fee deduction.
 *   POST /api/user/deleteAccount      -> Handles account deletion with debt checks.
 *
 * @module User
 */
class User {
    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * List of elements that constitute "legal information".
     * These must all be filled for the user to be considered "legal info complete".
     */
    static legalElements = [
        "date_of_birth",
        "college_id",
        "emergency_contact_name",
        "emergency_contact_phone",
        "home_address",
        "phone_number",
        "has_medical_conditions",
        "medical_conditions_details",
        "takes_medication",
        "medication_details",
        "agrees_to_fitness_statement",
        "agrees_to_club_rules",
        "agrees_to_pay_debts",
        "agrees_to_data_storage",
        "agrees_to_keep_health_data"
    ];

    /**
     * Helper to get the authenticated user ID.
     * @param {object} req - Express request.
     * @returns {number|null}
     */
    static getID(req) { return req.user ? req.user.id : null; }

    /**
     * Retrieves specific data elements for the current user, ensuring they are accessible.
     * Combines data from both users and transactions tables.
     * @param {object} req - Express request.
     * @param {object} db - Database instance.
     * @param {string|string[]} elements - The elements to retrieve.
     * @returns {Promise<statusObject>}
     */
    static async getAccessibleElements(req, db, elements) {
        /**
         * Determines if an element is allowed to be read by a normal user.
         * @param {string} element
         * @returns {[boolean, boolean]} [isInUserDB, isInTransactionDB]
         */
        function isElementAccessibleByNormalUser(element) {
            const accessibleUserDB = [
                "email",
                "first_name",
                "last_name",
                "date_of_birth",
                "college_id",
                "emergency_contact_name",
                "emergency_contact_phone",
                "home_address",
                "phone_number",
                "has_medical_conditions",
                "medical_conditions_details",
                "takes_medication",
                "medication_details",
                "free_sessions",
                "is_member",
                "agrees_to_fitness_statement",
                "agrees_to_club_rules",
                "agrees_to_pay_debts",
                "agrees_to_data_storage",
                "agrees_to_keep_health_data",
                "filled_legal_info",
                "can_manage_events",
                "can_manage_users",
                "can_manage_transactions",
                "is_instructor",
                "is_exec",
                "first_aid_expiry",
                "profile_picture_path",
                "created_at",
                "swims",
                "swimmer_rank"
            ];

            const accessibleTransactionsDB = [
                'balance',
                'transactions'
            ];

            return [accessibleUserDB.includes(element), accessibleTransactionsDB.includes(element)];
        }


        if (typeof elements === 'string') {
            elements = [elements];
        }

        const userElements = [];
        const transactionElements = [];

        // Categorize elements by their source database/module
        for (const element of elements) {
            const [accessibleUserDB, accessibleTransactionsDB] = isElementAccessibleByNormalUser(element);
            if (!accessibleUserDB && !accessibleTransactionsDB) {
                return new statusObject(403, 'User can not access element: ' + element);
            }

            if (accessibleUserDB) {
                userElements.push(element);
            }

            if (accessibleTransactionsDB) {
                transactionElements.push(element);
            }
        }

        // Fetch from UserDB
        let userResultData = {};
        if (userElements.length > 0) {
            const needsRank = userElements.includes('swimmer_rank');
            const cleanElements = userElements.filter(e => e !== 'swimmer_rank');
            
            const userResult = await UserDB.getElements(req, db, cleanElements);
            if (userResult.isError()) {
                return userResult;
            }
            userResultData = userResult.getData();

            if (needsRank) {
                const rankRes = await UserDB.getUserSwimmerRank(db, req.user.id);
                if (!rankRes.isError()) {
                    userResultData.swimmer_rank = rankRes.getData().rank;
                }
            }
        }

        // Fetch from transactionsDB
        let transactionResultData = {};
        if (transactionElements.length > 0) {
            const transactionResult = await transactionsDB.getElements(req, db, transactionElements);
            if (transactionResult.isError()) {
                return transactionResult;
            }
            transactionResultData = transactionResult.getData();
        }

        // Merge results
        const result = { ...userResultData, ...transactionResultData };
        return new statusObject(200, null, result);
    }

    /**
     * Writes profile updates for the current user after validating them.
     * Automatically updates 'filled_legal_info' status if all required fields are now present.
     * @param {object} req - Express request.
     * @param {object} db - Database instance.
     * @param {object} data - Key-value pairs to update.
     * @returns {Promise<statusObject>}
     */
    static async writeNormalElements(req, db, data) {
        /**
         * Validates a single element update.
         * Includes regex checks, range checks for dates, and logic dependencies.
         */
        async function isNormalWritableElement(element, data, db) {
            async function getElement(element, data, db) {
                if (element in data) {
                    return new statusObject(200, "Retrieved from data", data[element]);
                } else {
                    const dataValue = await getAccessibleElement(element, db);
                    return dataValue;
                }
            }

            const phonePattern = /^\+?[0-9\s\-()]{7,15}$/;
            const namePattern = /^[a-zA-Z\s ,.'-]+$/;

            const value = data[element];

            var validated = false;
            var errorMessage = "";


            switch (element) {
                case "email":
                    validated = /^[^@]+\.[^@]+@durham\.ac\.uk$/i.test(value);
                    errorMessage = "Invalid email format. You must use your first.last@durham.ac.uk email."
                    break;
                case "first_name":
                    validated = namePattern.test(value);
                    errorMessage = "Invalid first name format."
                    break;
                case "last_name":
                    validated = namePattern.test(value);
                    errorMessage = "Invalid last name format.";
                    break;
                case "date_of_birth":
                    const dob = new Date(value);
                    const today = new Date();
                    // Age must be between 17 and 90
                    const maxDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
                    const minDate = new Date(today.getFullYear() - 90, today.getMonth(), today.getDate());
                    validated = dob >= minDate && dob <= maxDate;
                    errorMessage = "Date of birth must be between 17 and 90 years ago.";
                    break;
                case "college_id":
                    // Verify college exists
                    const row = await db.get('SELECT id FROM colleges WHERE name = ?', [value]);
                    validated = !!row;
                    errorMessage = "Invalid college ID.";
                    break;
                case "emergency_contact_name":
                    validated = namePattern.test(value);
                    errorMessage = "Invalid emergency contact name format.";
                    break;
                case "emergency_contact_phone":
                    validated = phonePattern.test(value);
                    errorMessage = "Invalid emergency contact phone number format.";
                    break;
                case "home_address":
                    validated = value.trim() !== '';
                    errorMessage = "Home address cannot be empty.";
                    break;
                case "phone_number":
                    validated = phonePattern.test(value);
                    errorMessage = "Invalid phone number format.";
                    break;
                case "has_medical_conditions":
                    validated = typeof value === 'boolean';
                    errorMessage = "Invalid value for has_medical_conditions.";
                    break;
                case "medical_conditions_details":
                    // Required if has_medical_conditions is true
                    if ((await getElement("has_medical_conditions", data, db)).getData()) {
                        validated = value.trim() !== '';
                        errorMessage = "Medical conditions details cannot be empty if medical conditions are present.";
                        break;
                    }
                    validated = true;
                    break;
                case "takes_medication":
                    validated = typeof value === 'boolean';
                    errorMessage = "Invalid value for takes_medication.";
                    break;
                case "medication_details":
                    // Required if takes_medication is true
                    if ((await getElement("takes_medication", data, db)).getData()) {
                        validated = value.trim() !== '';
                        errorMessage = "Medication details cannot be empty if medication is taken.";
                        break;
                    }
                    validated = true;
                    break;
                case "agrees_to_fitness_statement":
                    validated = value === true;
                    errorMessage = "Must agree to fitness statement.";
                    break;
                case "agrees_to_club_rules":
                    validated = value === true;
                    errorMessage = "Must agree to club rules.";
                    break;
                case "agrees_to_pay_debts":
                    validated = value === true;
                    errorMessage = "Must agree to pay debts.";
                    break;
                case "agrees_to_data_storage":
                    validated = value === true;
                    errorMessage = "Must agree to data storage.";
                    break;
                case "agrees_to_keep_health_data":
                    validated = typeof value === 'boolean';
                    errorMessage = "Invalid value for agrees_to_keep_health_data.";
                    break;
                case "is_instructor":
                    validated = typeof value === 'boolean';
                    errorMessage = "Invalid value for is_instructor.";
                    break;
                case "first_aid_expiry":
                    if (value === null) {
                        validated = true;
                        break;
                    }
                    const expiryDate = new Date(value);
                    const now = new Date();
                    // Must be in future, capped at 20 years
                    validated = expiryDate > now;
                    if (validated) {
                        const twentyYearsFromNow = new Date();
                        twentyYearsFromNow.setFullYear(now.getFullYear() + 20);
                        validated = expiryDate <= twentyYearsFromNow;
                    }
                    errorMessage = "First aid expiry date must be in the future, but not more than 20 years ahead.";
                    break;
                default:
                    return undefined;
            }

            if (!validated) {
                return new statusObject(400, errorMessage);
            }

            // Return whether this element is part of the legal information set
            return new statusObject(200, User.legalElements.includes(element));
        }

        async function getElement(element, data, db) {
            if (element in data) {
                return new statusObject(200, null, data[element]);
            } else {
                const dataValue = await User.getAccessibleElements(req, db, element);
                return dataValue;
            }
        }

        var legalUpdateNeeded = false;

        // Validate all incoming elements
        for (const element in data) {
            const canWriteStatus = await isNormalWritableElement(element, data, db);
            if (canWriteStatus.isError()) {
                return canWriteStatus;
            }
            if (canWriteStatus.getMessage())
                legalUpdateNeeded = true;
        }

        // If any legal elements were updated, check if the whole set is now complete
        if (legalUpdateNeeded) {
            let allLegalElementsFilled = true;
            for (const element of User.legalElements) {
                const dataValue = await getElement(element, data, db);
                if (dataValue.isError()) {
                    allLegalElementsFilled = false;
                    break;
                }
                if (dataValue.getData() === null || dataValue.getData() === undefined) {
                    allLegalElementsFilled = false;
                    break;
                }
            }
            if (allLegalElementsFilled) {
                data["filled_legal_info"] = 1;
            }
        }

        // Commit updates to database
        const writeStatus = await UserDB.writeElements(req, db, data);
        if (writeStatus.isError()) {
            return writeStatus;
        }
        return new statusObject(200, null);
    }

    /**
     * Registers Express routes for the User API.
     */
    registerRoutes() {
        /**
         * GET /api/user/elements/:elements
         * Retrieves a list of profile elements for the current user.
         */
        this.app.get('/api/user/elements/:elements', check(), async (req, res) => {
            const elements = req.params.elements.split(',').map(e => e.trim());
            const status = await User.getAccessibleElements(req, this.db, elements);
            if (status.isError()) {
                return status.getResponse(res);
            }
            res.json(status.getData());
        });

        /**
         * POST /api/user/elements
         * Updates profile elements for the current user.
         */
        this.app.post('/api/user/elements', check(), async (req, res) => {
            const status = await User.writeNormalElements(req, this.db, req.body);
            if (status.isError()) {
                return status.getResponse(res);
            }
            res.json({ success: true });
        });

        /**
         * POST /api/user/join
         * Handles the logic for a user joining as a member.
         * Checks if already a member, deducts fee, and updates status.
         */
        this.app.post('/api/user/join', check(), async (req, res) => {
            try {
                const membershipStatus = await UserDB.getElements(req, this.db, 'is_member');
                if (membershipStatus.isError()) {
                    return membershipStatus.getResponse(res);
                }

                const membershipInfo = membershipStatus.getData();
                if (membershipInfo.is_member) {
                    return res.status(400).json({ message: 'User is already a member.' });
                }

                // Add a transaction for the membership fee
                const transactionCode = await transactionsDB.add_transaction(
                    req,
                    this.db,
                    User.getID(req),
                    - new Globals().getFloat('MembershipCost'),
                    'Membership Fee'
                );

                if (typeof transactionCode === 'number' && transactionCode >= 400) {
                    return res.status(transactionCode).json({ message: 'Transaction failed' });
                }

                // Update membership status in UserDB
                const status = await UserDB.setMembershipStatus(req, this.db, true);
                if (status.isError()) {
                    return status.getResponse(res);
                }

                res.json({ success: true });
            } catch (err) {
                console.error('Error in /api/user/join:', err);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        /**
         * POST /api/user/deleteAccount
         * Deletes the user's account.
         * Only allowed if the user has no outstanding debts (balance >= 0).
         */
        this.app.post('/api/user/deleteAccount', check(), async (req, res) => {
            const balance = await transactionsDB.get_balance(req, this.db);
            if (balance.isError()) {
                return balance.getResponse(res);
            }

            // Prevent deletion if there is debt
            if (balance.getData() < 0) {
                return res.status(400).json({ message: 'Cannot delete account with outstanding debts.' });
            }

            const deleteStatus = await UserDB.removeUser(req, this.db);
            if (deleteStatus.isError()) {
                return deleteStatus.getResponse(res);
            }

            // Log out the user after successful deletion
            req.logout((err) => {
                if (err) {
                    console.error('Error logging out after account deletion:', err);
                }
                res.json({ success: true });
            });
        });

        /**
         * GET /api/user/swims/leaderboard
         * Fetches the swim leaderboard.
         */
        this.app.get('/api/user/swims/leaderboard', check(), async (req, res) => {
            const status = await UserDB.getSwimsLeaderboard(this.db);
            return status.getResponse(res);
        });

        /**
         * POST /api/user/:id/swims
         * Adds swims to a user. Restricted to execs.
         */
        this.app.post('/api/user/:id/swims', check('is_exec'), async (req, res) => {
            const userId = parseInt(req.params.id, 10);
            const count = parseInt(req.body.count, 10);

            if (isNaN(userId) || isNaN(count)) {
                return res.status(400).json({ message: 'Invalid User ID or count' });
            }

            const status = await UserDB.addSwims(req, this.db, userId, count);
            return status.getResponse(res);
        });
    }
}

module.exports = User;