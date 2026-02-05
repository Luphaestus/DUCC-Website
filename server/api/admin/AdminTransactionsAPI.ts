/**
 * AdminTransactionsAPI.ts
 * 
 * This file provides administrative access to user transactions.
 */

import transactionsDB from '../../db/transactionDB.js';
import check from '../../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminTransactions {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
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
        this.app.get('/api/admin/user/:id/transactions', { preHandler: [check('perm:transaction.read | perm:transaction.manage')] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const userId = parseInt(request.params.id);
            if (isNaN(userId)) {
                return reply.status(400).send({ message: 'Invalid user ID' });
            }
            const result = await transactionsDB.get_transactions(this.db, userId);
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        /**
         * Manually add a transaction to a user's account.
         */
        this.app.post('/api/admin/user/:id/transaction', { preHandler: [check('perm:transaction.write | perm:transaction.manage')] }, async (request: FastifyRequest<{ Params: { id: string }, Body: { amount: number, description: string } }>, reply: FastifyReply) => {
            const userId = parseInt(request.params.id);
            if (isNaN(userId)) {
                return reply.status(400).send({ message: 'Invalid user ID' });
            }
            const result = await transactionsDB.add_transaction(this.db, userId, request.body.amount, request.body.description);
            
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.sendToUser(userId, 'balance_update', { userId, amount: request.body.amount });
                EventHub.broadcast('admin_transaction_update', { userId });
            }

            return result.getResponse(reply);
        });

        /**
         * Update an existing transaction record.
         */
        this.app.put('/api/admin/transaction/:id', { preHandler: [check('perm:transaction.write | perm:transaction.manage')] }, async (request: FastifyRequest<{ Params: { id: string }, Body: { amount: number, description: string } }>, reply: FastifyReply) => {
            const transactionId = parseInt(request.params.id);
            if (isNaN(transactionId)) return reply.status(400).send({ message: 'Invalid transaction ID' });
            
            // Get user ID before edit
            const tx = await transactionsDB.get_transaction_by_id(this.db, transactionId);
            const userId = tx.getData()?.user_id;

            const result = await transactionsDB.edit_transaction(this.db, transactionId, request.body.amount, request.body.description);
            
            if (!result.isError() && userId) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.sendToUser(userId, 'balance_update', { userId });
                EventHub.broadcast('admin_transaction_update', { userId });
            }

            return result.getResponse(reply);
        });

        /**
         * Delete a transaction record.
         */
        this.app.delete('/api/admin/transaction/:id', { preHandler: [check('perm:transaction.manage')] }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
            const transactionId = parseInt(request.params.id);
            if (isNaN(transactionId)) return reply.status(400).send({ message: 'Invalid transaction ID' });
            
            // Get user ID before delete
            const tx = await transactionsDB.get_transaction_by_id(this.db, transactionId);
            const userId = tx.getData()?.user_id;

            const result = await transactionsDB.delete_transaction(this.db, transactionId);
            
            if (!result.isError() && userId) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.sendToUser(userId, 'balance_update', { userId });
                EventHub.broadcast('admin_transaction_update', { userId });
            }

            return result.getResponse(reply);
        });
    }
}