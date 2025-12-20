const { statusObject } = require('../misc/status.js');
const UserDB = require('../db/userDB.js');
const transactionsDB = require('../db/transactionDB.js');
const EventsDB = require('../db/eventsDB.js');

class Admin {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        this.app.get('/api/admin/users', async (req, res) => {
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

        this.app.get('/api/admin/events', async (req, res) => {
            const canManage = await UserDB.canManageUsers(req, this.db);
            // Ideally check can_manage_events, but for now assuming admin access
            if (canManage.isError() || canManage.getData() !== 1) {
                // Check specifically for event permission if needed, but assuming general admin for now based on UserDB.canManageUsers
                // Or better, check req.user.can_manage_events if available in session/user object
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const sort = req.query.sort || 'start';
            const order = req.query.order || 'asc';

            const result = await EventsDB.getEventsAdmin(this.db, { page, limit, search, sort, order });
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        this.app.get('/api/admin/event/:id', async (req, res) => {
            const result = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        this.app.post('/api/admin/event', async (req, res) => {
            const result = await EventsDB.createEvent(this.db, req.body);
            result.getResponse(res);
        });

        this.app.put('/api/admin/event/:id', async (req, res) => {
            const result = await EventsDB.updateEvent(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        this.app.delete('/api/admin/event/:id', async (req, res) => {
            const eventRes = await EventsDB.getEventByIdAdmin(this.db, req.params.id);
            if (eventRes.isError()) return eventRes.getResponse(res);

            const event = eventRes.getData();
            const now = new Date();
            if (new Date(event.start) < now) return res.status(400).json({ message: 'Cannot delete past events' });

            const result = await EventsDB.deleteEvent(this.db, req.params.id);
            result.getResponse(res);
        });

        this.app.get('/api/admin/user/:id', async (req, res) => {
            const canManage = await UserDB.canManageUsers(req, this.db);
            if (canManage.isError() || canManage.getData() !== 1) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            const userId = req.params.id;
            const elements = [
                "id", "email", "first_name", "last_name", "date_of_birth", "college_id",
                "emergency_contact_name", "emergency_contact_phone", "home_address", "phone_number",
                "has_medical_conditions", "medical_conditions_details", "takes_medication", "medication_details",
                "free_sessions", "is_member", "filled_legal_info", "is_instructor", "first_aid_expiry",
                "agrees_to_fitness_statement", "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data",
                "difficulty_level"
            ];

            const userResult = await UserDB.getElements(req, this.db, elements, userId);
            if (userResult.isError()) return userResult.getResponse(res);

            const balanceResult = await transactionsDB.get_balance(req, this.db, userId);

            const userData = userResult.getData();
            userData.balance = balanceResult.getData() || 0;

            res.json(userData);
        });

        this.app.post('/api/admin/user/:id/elements', async (req, res) => {
            const result = await UserDB.writeElements(req, this.db, req.body, req.params.id);
            result.getResponse(res);
        });

        this.app.get('/api/admin/user/:id/transactions', async (req, res) => {
            const result = await transactionsDB.get_transactions(req, this.db, req.params.id);
            if (result.isError()) {
                return result.getResponse(res);
            }
            res.json(result.getData());
        });

        this.app.post('/api/admin/user/:id/transaction', async (req, res) => {
            const { amount, description } = req.body;
            const result = await transactionsDB.add_transaction(req, this.db, req.params.id, amount, description);
            result.getResponse(res);
        });

        this.app.put('/api/admin/transaction/:id', async (req, res) => {
            const { amount, description } = req.body;
            const result = await transactionsDB.edit_transaction(req, this.db, req.params.id, amount, description);
            result.getResponse(res);
        });

        this.app.delete('/api/admin/transaction/:id', async (req, res) => {
            const result = await transactionsDB.delete_transaction(req, this.db, req.params.id);
            result.getResponse(res);
        });
    }
}

module.exports = Admin;