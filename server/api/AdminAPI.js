const { statusObject } = require('../misc/status.js');
const UserDB = require('../db/userDB.js');
const transactionsDB = require('../db/transactionDB.js');
const EventsDB = require('../db/eventsDB.js');
const check = require('../misc/authentication.js');
const Globals = require('../misc/globals.js');

/**
 * Admin API for managing users, events, and transactions.
 * @module Admin
 */
class Admin {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers admin routes.
     */
    registerRoutes() {
        /**
         * Fetch paginated users list (Admin/Exec).
         */
        this.app.get('/api/admin/users', check('can_manage_users | can_manage_transactions | is_exec'), async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const sort = req.query.sort || 'last_name';
            const order = req.query.order || 'asc';

            const result = await UserDB.getUsers(req, this.db, { page, limit, search, sort, order });
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Fetch paginated events list (Admin).
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
         * Fetch event details for editing (Admin).
         */
        this.app.get('/api/admin/event/:id', check('can_manage_events'), async (req, res) => {
            const result = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Create new event (Admin).
         */
        this.app.post('/api/admin/event', check('can_manage_events'), async (req, res) => {
            const result = await EventsDB.createEvent(this.db, req.body);
            result.getResponse(res);
        });

        /**
         * Update event (Admin).
         */
        this.app.put('/api/admin/event/:id', check('can_manage_events'), async (req, res) => {
            const result = await EventsDB.updateEvent(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        /**
         * Delete event (Admin, future only).
         */
        this.app.delete('/api/admin/event/:id', check('can_manage_events'), async (req, res) => {
            const eventRes = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (eventRes.isError()) return eventRes.getResponse(res);

            if (new Date(eventRes.getData().start) < new Date()) {
                return res.status(400).json({ message: 'Cannot delete past events' });
            }

            const result = await EventsDB.deleteEvent(this.db, req.params.id);
            result.getResponse(res);
        });

        /**
         * Fetch user profile and balance (Admin/Exec, filtered).
         */
        this.app.get('/api/admin/user/:id', check('can_manage_users | can_manage_transactions | is_exec'), async (req, res) => {
            const userId = req.params.id;
            const canManageUsers = req.user.can_manage_users;
            const canManageTransactions = req.user.can_manage_transactions;

            let elements;
            if (canManageUsers) {
                elements = [
                    "id", "email", "first_name", "last_name", "date_of_birth", "college_id",
                    "emergency_contact_name", "emergency_contact_phone", "home_address", "phone_number",
                    "has_medical_conditions", "medical_conditions_details", "takes_medication", "medication_details",
                    "free_sessions", "is_member", "filled_legal_info", "is_instructor", "first_aid_expiry",
                    "agrees_to_fitness_statement", "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data",
                    "difficulty_level", "can_manage_users", "can_manage_events", "can_manage_transactions", "is_exec", "swims"
                ];
            } else if (canManageTransactions) {
                elements = ["id", "first_name", "last_name", "free_sessions", "is_member", "is_instructor", "difficulty_level", "swims"];
            } else {
                elements = ["id", "first_name", "last_name", "swims"];
            }

            try {
                const user = await this.db.get(`SELECT ${elements.join(', ')} FROM users WHERE id = ?`, userId);
                if (!user) return new statusObject(404, 'User not found').getResponse(res);

                if (canManageUsers || canManageTransactions) {
                    const balanceResult = await transactionsDB.get_balance(req, this.db, userId);
                    user.balance = balanceResult.getData() || 0;
                }
                res.json(user);
            } catch (error) {
                return new statusObject(500, 'Database error').getResponse(res);
            }
        });

        /**
         * Update user profile elements (Admin, permissions President only).
         */
        this.app.post('/api/admin/user/:id/elements', check('can_manage_users'), async (req, res) => {
            const restricted = ['can_manage_users', 'can_manage_events', 'can_manage_transactions', 'is_exec'];
            if (restricted.some(f => req.body[f] !== undefined)) {
                if (req.user.id !== new Globals().getInt('President')) {
                    return res.status(403).json({ message: 'President only' });
                }
            }
            const result = await UserDB.writeElements(req, this.db, req.body, req.params.id);
            result.getResponse(res);
        });

        /**
         * Fetch user transactions (Admin).
         */
        this.app.get('/api/admin/user/:id/transactions', check('can_manage_transactions'), async (req, res) => {
            const result = await transactionsDB.get_transactions(req, this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Add user transaction (Admin).
         */
        this.app.post('/api/admin/user/:id/transaction', check('can_manage_transactions'), async (req, res) => {
            const result = await transactionsDB.add_transaction(req, this.db, req.params.id, req.body.amount, req.body.description);
            result.getResponse(res);
        });

        /**
         * Update transaction (Admin).
         */
        this.app.put('/api/admin/transaction/:id', check('can_manage_transactions'), async (req, res) => {
            const result = await transactionsDB.edit_transaction(req, this.db, req.params.id, req.body.amount, req.body.description);
            result.getResponse(res);
        });

        /**
         * Delete transaction (Admin).
         */
        this.app.delete('/api/admin/transaction/:id', check('can_manage_transactions'), async (req, res) => {
            const result = await transactionsDB.delete_transaction(req, this.db, req.params.id);
            result.getResponse(res);
        });
    }
}

module.exports = Admin;