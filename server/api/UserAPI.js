const { statusObject } = require('../misc/status.js');
const UserDB = require('../db/userDB.js');
const transactionsDB = require('../db/transactionDB.js');
const Globals = require('../misc/globals.js');
const check = require('../misc/authentication');

/**
 * Routes:
 *   GET  /api/user/elements/:elements -> { ...elements }
 *   POST /api/user/elements           -> { success: boolean }
 *   POST /api/user/join               -> { success: boolean }
 *   POST /api/user/deleteAccount      -> { success: boolean }
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
     * Retrieves the current user's ID from the request object.
     * @param {object} req - The Express request object.
     * @returns {number|null} The user ID or null if not authenticated.
     */
    static getID(req) { return req.user ? req.user.id : null; }

    /**
     * Retrieves accessible elements for a user.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {string|string[]} elements - The elements to retrieve.
     * @returns {Promise<statusObject>} A promise resolving to a statusObject containing the retrieved data.
     */
    static async getAccessibleElements(req, db, elements) {
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

        let userResultData = {};
        if (userElements.length > 0) {
            const userResult = await UserDB.getElements(req, db, userElements);
            if (userResult.isError()) {
                return userResult;
            }
            userResultData = userResult.getData();
        }

        let transactionResultData = {};
        if (transactionElements.length > 0) {
            const transactionResult = await transactionsDB.getElements(req, db, transactionElements);
            if (transactionResult.isError()) {
                return transactionResult;
            }
            transactionResultData = transactionResult.getData();
        }

        const result = { ...userResultData, ...transactionResultData };
        return new statusObject(200, null, result);
    }

    /**
     * Writes updateable elements for the user, performing validation.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {object} data - Key-value pairs of elements to update.
     * @returns {Promise<statusObject>} A promise resolving to a statusObject indicating success or failure.
     */
    static async writeNormalElements(req, db, data) {
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
                    const maxDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
                    const minDate = new Date(today.getFullYear() - 90, today.getMonth(), today.getDate());
                    validated = dob >= minDate && dob <= maxDate;
                    errorMessage = "Date of birth must be between 17 and 90 years ago.";
                    break;
                case "college_id":
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

        for (const element in data) {
            const canWriteStatus = await isNormalWritableElement(element, data, db);
            if (canWriteStatus.isError()) {
                return canWriteStatus;
            }
            if (canWriteStatus.getMessage())
                legalUpdateNeeded = true;
        }

        if (legalUpdateNeeded) {
            let allLegalElementsFilled = true;
            for (const element of this.legalElements) {
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

        const writeStatus = await UserDB.writeElements(req, db, data);
        if (writeStatus.isError()) {
            return writeStatus;
        }
        return new statusObject(200, null);
    }

    registerRoutes() {
        this.app.get('/api/user/elements/:elements', check(), async (req, res) => {
            const elements = req.params.elements.split(',').map(e => e.trim());
            const status = await User.getAccessibleElements(req, this.db, elements);
            if (status.isError()) {
                return status.getResponse(res);
            }
            res.json(status.getData());
        });

        this.app.post('/api/user/elements', check(), async (req, res) => {
            const status = await User.writeNormalElements(req, this.db, req.body);
            if (status.isError()) {
                return status.getResponse(res);
            }
            res.json({ success: true });
        });

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

        this.app.post('/api/user/deleteAccount', check(), async (req, res) => {
            const balance = await transactionsDB.get_balance(req, this.db);
            if (balance.isError()) {
                return balance.getResponse(res);
            }

            if (balance.getData() < 0) {
                return res.status(400).json({ message: 'Cannot delete account with outstanding debts.' });
            }

            const deleteStatus = await UserDB.removeUser(req, this.db);
            if (deleteStatus.isError()) {
                return deleteStatus.getResponse(res);
            }

            req.logout((err) => {
                if (err) {
                    console.error('Error logging out after account deletion:', err);
                }
                res.json({ success: true });
            });
        });
    }
}

module.exports = User;