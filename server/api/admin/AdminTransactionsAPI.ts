/**
 * AdminTransactionsAPI.ts
 * 
 * This file provides administrative access to user transactions.
 */

import transactionsDB from '../../db/transactionDB.js';
import check from '../../misc/authentication.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminTransactions {
    app: Express;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app: Express, db: DatabaseWrapper) {
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
        this.app.get('/api/admin/user/:id/transactions', check('perm:transaction.read | perm:transaction.manage'), async (req: Request, res: Response) => {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }
            const result = await transactionsDB.get_transactions(this.db, userId);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Manually add a transaction to a user's account.
         */
        this.app.post('/api/admin/user/:id/transaction', check('perm:transaction.write | perm:transaction.manage'), async (req: Request, res: Response) => {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }
            const result = await transactionsDB.add_transaction(this.db, userId, req.body.amount, req.body.description);
            
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.sendToUser(userId, 'balance_update', { userId, amount: req.body.amount });
                EventHub.broadcast('admin_transaction_update', { userId });
            }

            result.getResponse(res);
        });

        /**
         * Update an existing transaction record.
         */
        this.app.put('/api/admin/transaction/:id', check('perm:transaction.write | perm:transaction.manage'), async (req: Request, res: Response) => {
            const transactionId = parseInt(req.params.id);
            if (isNaN(transactionId)) return res.status(400).json({ message: 'Invalid transaction ID' });
            
            // Get user ID before edit
            const tx = await transactionsDB.get_transaction_by_id(this.db, transactionId);
            const userId = tx.getData()?.user_id;

            const result = await transactionsDB.edit_transaction(this.db, transactionId, req.body.amount, req.body.description);
            
            if (!result.isError() && userId) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.sendToUser(userId, 'balance_update', { userId });
                EventHub.broadcast('admin_transaction_update', { userId });
            }

            result.getResponse(res);
        });

        /**
         * Delete a transaction record.
         */
        this.app.delete('/api/admin/transaction/:id', check('perm:transaction.manage'), async (req: Request, res: Response) => {
            const transactionId = parseInt(req.params.id);
            if (isNaN(transactionId)) return res.status(400).json({ message: 'Invalid transaction ID' });
            
            // Get user ID before delete
            const tx = await transactionsDB.get_transaction_by_id(this.db, transactionId);
            const userId = tx.getData()?.user_id;

            const result = await transactionsDB.delete_transaction(this.db, transactionId);
            
            if (!result.isError() && userId) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.sendToUser(userId, 'balance_update', { userId });
                EventHub.broadcast('admin_transaction_update', { userId });
            }

            result.getResponse(res);
        });
    }
}
