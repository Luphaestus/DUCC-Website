const { statusObject } = require('../misc/status.js');
const UserDB = require('../db/userDB.js');
const transactionsDB = require('../db/transactionDB.js');
const EventsDB = require('../db/eventsDB.js');
const check = require('../misc/authentication.js');
const Globals = require('../misc/globals.js');

/**
 * Routes:
 *   GET  /api/admin/users             -> { users: User[] }
 *   GET  /api/admin/events            -> { events: Event[] }
 *   GET  /api/admin/event/:id         -> { event: Event }
 *   POST /api/admin/event             -> { id: number }
 *   PUT  /api/admin/event/:id         -> { message: string }
 *   DELETE /api/admin/event/:id       -> { message: string }
 *   GET  /api/admin/user/:id          -> { user: User, balance: number }
 *   POST /api/admin/user/:id/elements -> { message: string }
 *   GET  /api/admin/user/:id/transactions -> { transactions: Transaction[] }
 *   POST /api/admin/user/:id/transaction  -> { message: string }
 *   PUT  /api/admin/transaction/:id       -> { message: string }
 *   DELETE /api/admin/transaction/:id     -> { message: string }
 *
 * @module Admin
 */
/**
 * Admin API module.
 * Provides endpoints for administrative tasks such as managing users, events, and transactions.
 * Access to these routes is strictly controlled by permission checks.
 */
class Admin {
    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all admin-related routes with the Express application.
     */
    registerRoutes() {
        /**
         * GET /api/admin/users
         * Retrieves a paginated list of users.
         * Requires 'can_manage_users' or 'can_manage_transactions' permissions.
         */
        this.app.get('/api/admin/users', check('can_manage_users | can_manage_transactions'), async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const sort = req.query.sort || 'last_name';
            const order = req.query.order || 'asc';

            const result = await UserDB.getUsers(req, this.db, { page, limit, search, sort, order });
            if (result.isError()) {
                return result.getResponse(res);
            }
            res.json(result.getData());
        });

        /**
         * GET /api/admin/events
         * Retrieves a paginated list of events for administrative view.
         * Requires 'can_manage_events' permission.
         */
        this.app.get('/api/admin/events', check('can_manage_events'), async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const sort = req.query.sort || 'start';
            const order = req.query.order || 'asc';
            const showPast = req.query.showPast === 'true';

            const result = await EventsDB.getEventsAdmin(this.db, { page, limit, search, sort, order, showPast });
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * GET /api/admin/event/:id
         * Retrieves detailed information about a specific event for editing.
         * Requires 'can_manage_events' permission.
         */
        this.app.get('/api/admin/event/:id', check('can_manage_events'), async (req, res) => {
            const result = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * POST /api/admin/event
         * Creates a new event.
         * Requires 'can_manage_events' permission.
         */
        this.app.post('/api/admin/event', check('can_manage_events'), async (req, res) => {
            const result = await EventsDB.createEvent(this.db, req.body);
            result.getResponse(res);
        });

        /**
         * PUT /api/admin/event/:id
         * Updates an existing event.
         * Requires 'can_manage_events' permission.
         */
        this.app.put('/api/admin/event/:id', check('can_manage_events'), async (req, res) => {
            const result = await EventsDB.updateEvent(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        /**
         * DELETE /api/admin/event/:id
         * Deletes an event if it hasn't started yet.
         * Requires 'can_manage_events' permission.
         */
        this.app.delete('/api/admin/event/:id', check('can_manage_events'), async (req, res) => {
            const eventRes = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (eventRes.isError()) return eventRes.getResponse(res);

            const event = eventRes.getData();
            const now = new Date();
            // Prevent deletion of past events for historical record integrity
            if (new Date(event.start) < now) return res.status(400).json({ message: 'Cannot delete past events' });

            const result = await EventsDB.deleteEvent(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * GET /api/admin/user/:id
         * Retrieves detailed information and balance for a specific user.
         * The returned fields depend on whether the admin has user management or transaction management permissions.
         */
        this.app.get('/api/admin/user/:id', check('can_manage_users | can_manage_transactions'), async (req, res) => {
            const userId = req.params.id;
            const canManageUsers = req.user.can_manage_users;

            let elements;
            if (canManageUsers) {
                // Full set of fields for user managers
                elements = [
                    "id", "email", "first_name", "last_name", "date_of_birth", "college_id",
                    "emergency_contact_name", "emergency_contact_phone", "home_address", "phone_number",
                    "has_medical_conditions", "medical_conditions_details", "takes_medication", "medication_details",
                    "free_sessions", "is_member", "filled_legal_info", "is_instructor", "first_aid_expiry",
                    "agrees_to_fitness_statement", "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data",
                    "difficulty_level", "can_manage_users", "can_manage_events", "can_manage_transactions", "is_exec"
                ];
            } else {
                // Restricted view for transaction managers
                elements = [
                    "id", "first_name", "last_name",
                    "free_sessions", "is_member", "is_instructor",
                    "difficulty_level"
                ];
            }

            // Direct DB access is used here to bypass strict permission checks in UserDB.getElements
            // since we have already validated authorization at the route level.
            try {
                const user = await this.db.get(
                    `SELECT ${elements.join(', ')} FROM users WHERE id = ?`,
                    userId
                );
                if (!user) {
                    return new statusObject(404, 'User not found').getResponse(res);
                }

                // Append user's current balance
                const balanceResult = await transactionsDB.get_balance(req, this.db, userId);
                user.balance = balanceResult.getData() || 0;

                res.json(user);
            } catch (error) {
                console.error(`Database error in getElements:`, error);
                return new statusObject(500, 'Database error').getResponse(res);
            }
        });

        /**
         * POST /api/admin/user/:id/elements
         * Updates specific fields for a user.
         * Permissions management (can_manage_*) is restricted to the President.
         */
        this.app.post('/api/admin/user/:id/elements', check('can_manage_users'), async (req, res) => {
            const restrictedFields = ['can_manage_users', 'can_manage_events', 'can_manage_transactions', 'is_exec'];
            const hasRestricted = restrictedFields.some(field => req.body[field] !== undefined);

            if (hasRestricted) {
                const presidentId = new Globals().getInt('President');
                if (req.user.id !== presidentId) {
                    return res.status(403).json({ message: 'Only the president can manage permissions' });
                }
            }

            const result = await UserDB.writeElements(req, this.db, req.body, req.params.id);
            result.getResponse(res);
        });

        /**
         * GET /api/admin/user/:id/transactions
         * Retrieves transaction history for a user.
         * Requires 'can_manage_transactions' permission.
         */
        this.app.get('/api/admin/user/:id/transactions', check('can_manage_transactions'), async (req, res) => {
            const result = await transactionsDB.get_transactions(req, this.db, req.params.id);
            if (result.isError()) {
                return result.getResponse(res);
            }
            res.json(result.getData());
        });

        /**
         * POST /api/admin/user/:id/transaction
         * Adds a new transaction for a user.
         * Requires 'can_manage_transactions' permission.
         */
        this.app.post('/api/admin/user/:id/transaction', check('can_manage_transactions'), async (req, res) => {
            const { amount, description } = req.body;
            const result = await transactionsDB.add_transaction(req, this.db, req.params.id, amount, description);
            result.getResponse(res);
        });

        /**
         * PUT /api/admin/transaction/:id
         * Updates an existing transaction.
         * Requires 'can_manage_transactions' permission.
         */
        this.app.put('/api/admin/transaction/:id', check('can_manage_transactions'), async (req, res) => {
            const { amount, description } = req.body;
            const result = await transactionsDB.edit_transaction(req, this.db, req.params.id, amount, description);
            result.getResponse(res);
        });

        /**
         * DELETE /api/admin/transaction/:id
         * Deletes a transaction record.
         * Requires 'can_manage_transactions' permission.
         */
        this.app.delete('/api/admin/transaction/:id', check('can_manage_transactions'), async (req, res) => {
            const result = await transactionsDB.delete_transaction(req, this.db, req.params.id);
            result.getResponse(res);
        });
    }
}

module.exports = Admin;