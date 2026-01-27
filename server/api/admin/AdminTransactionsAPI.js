/**
 * AdminTransactionsAPI.js
 * 
 * This file provides administrative access to user transactions.
 */

import transactionsDB from '../../db/transactionDB.js';
import check from '../../misc/authentication.js';

export default class AdminTransactions {
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
         */
        this.app.delete('/api/admin/transaction/:id', check('perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.delete_transaction(this.db, req.params.id);
            result.getResponse(res);
        });
    }
}
