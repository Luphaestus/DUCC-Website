/**
 * AdminTransactionsAPI.js
 * 
 * This file provides administrative access to user transactions.
 * It allows admins to view, add, edit, and delete transactions for any user.
 * 
 * Routes:
 * - GET /api/admin/user/:id/transactions: Fetch all transactions for a specific user.
 * - POST /api/admin/user/:id/transaction: Add a manual transaction record for a user.
 * - PUT /api/admin/transaction/:id: Modify an existing transaction's details.
 * - DELETE /api/admin/transaction/:id: Permanently remove a transaction record.
 */

const transactionsDB = require('../../db/transactionDB.js');
const check = require('../../misc/authentication.js');

/**
 * Admin API for managing transactions.
 * @module AdminTransactions
 */
class AdminTransactions {
    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all admin routes for transaction auditing and management.
     */
    registerRoutes() {
        /**
         * Fetch full transaction history for a specific user.
         */
        this.app.get('/api/admin/user/:id/transactions', check('perm:transaction.read | perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.get_transactions(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Manually add a transaction to a user's account.
         * Useful for membership fees, gear purchases, or corrections.
         */
        this.app.post('/api/admin/user/:id/transaction', check('perm:transaction.write | perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.add_transaction(this.db, req.params.id, req.body.amount, req.body.description);
            result.getResponse(res);
        });

        /**
         * Update an existing transaction record.
         */
        this.app.put('/api/admin/transaction/:id', check('perm:transaction.write | perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.edit_transaction(this.db, req.params.id, req.body.amount, req.body.description);
            result.getResponse(res);
        });

        /**
         * Delete a transaction record.
         * Warning: This physically removes the record and affects the user's calculated balance.
         */
        this.app.delete('/api/admin/transaction/:id', check('perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.delete_transaction(this.db, req.params.id);
            result.getResponse(res);
        });
    }
}

module.exports = AdminTransactions;