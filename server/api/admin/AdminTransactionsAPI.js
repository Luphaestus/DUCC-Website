const transactionsDB = require('../../db/transactionDB.js');
const check = require('../../misc/authentication.js');

/**
 * Admin API for managing transactions.
 * @module AdminTransactions
 */
class AdminTransactions {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers admin transaction routes.
     */
    registerRoutes() {
        /**
         * Fetch user transactions.
         */
        this.app.get('/api/admin/user/:id/transactions', check('perm:transaction.read | perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.get_transactions(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Add user transaction.
         */
        this.app.post('/api/admin/user/:id/transaction', check('perm:transaction.write | perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.add_transaction(this.db, req.params.id, req.body.amount, req.body.description);
            result.getResponse(res);
        });

        /**
         * Update transaction.
         */
        this.app.put('/api/admin/transaction/:id', check('perm:transaction.write | perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.edit_transaction(this.db, req.params.id, req.body.amount, req.body.description);
            result.getResponse(res);
        });

        /**
         * Delete transaction.
         */
        this.app.delete('/api/admin/transaction/:id', check('perm:transaction.manage'), async (req, res) => {
            const result = await transactionsDB.delete_transaction(this.db, req.params.id);
            result.getResponse(res);
        });
    }
}

module.exports = AdminTransactions;