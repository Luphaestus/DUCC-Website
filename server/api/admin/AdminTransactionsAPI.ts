/**
 * AdminTransactionsAPI.ts
 * 
 * This file provides administrative access to user transactions.
 */

import transactionsDB from '../../db/transactionDB.js';
import check from '../../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import { EmailManager } from '../../emails/EmailManager.js';
import UserDB from '../../db/userDB.js';
import Logger from '../../misc/Logger.js';

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
        this.app.get<{ Params: { id: string } }>('/api/admin/user/:id/transactions', { preHandler: [check('perm:transaction.read | perm:transaction.manage')] }, async (request, reply) => {
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
        this.app.post<{ Params: { id: string }, Body: { amount: number, description: string } }>('/api/admin/user/:id/transaction', { preHandler: [check('perm:transaction.write | perm:transaction.manage')] }, async (request, reply) => {
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
        this.app.put<{ Params: { id: string }, Body: { amount: number, description: string } }>('/api/admin/transaction/:id', { preHandler: [check('perm:transaction.write | perm:transaction.manage')] }, async (request, reply) => {
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
         * Confirm a pending transaction.
         */
        this.app.post<{ Params: { id: string }, Body: { amount?: number, description?: string } }>('/api/admin/transaction/:id/confirm', { preHandler: [check('perm:transaction.manage')] }, async (request, reply) => {
            const transactionId = parseInt(request.params.id);
            if (isNaN(transactionId)) return reply.status(400).send({ message: 'Invalid transaction ID' });

            const txRes = await transactionsDB.get_transaction_by_id(this.db, transactionId);
            if (txRes.isError()) return txRes.getResponse(reply);
            const tx = txRes.getData();

            const result = await transactionsDB.confirm_transaction(this.db, transactionId, request.body);
            
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.sendToUser(tx.user_id, 'balance_update', { userId: tx.user_id });
                EventHub.broadcast('admin_transaction_update', { userId: tx.user_id });

                // Send Email Receipt
                try {
                    const userRes = await UserDB.getElements(this.db, tx.user_id, ['email', 'first_name', 'last_name']);
                    if (!userRes.isError()) {
                        const user = userRes.getData();
                        const emailManager = EmailManager.getInstance();
                        const finalAmount = request.body?.amount !== undefined ? request.body.amount : tx.amount;
                        const finalDesc = request.body?.description !== undefined ? request.body.description : tx.description;

                        await emailManager.sendTemplatedEmail(
                            user.email,
                            `Top-Up Receipt: ${finalDesc} - DUCC`,
                            'payment_notification',
                            {
                                name: user.first_name,
                                amount: Math.abs(finalAmount).toFixed(2),
                                description: finalDesc
                            }
                        );
                    }
                } catch (emailErr) {
                    Logger.error('Failed to send top-up receipt email', emailErr);
                }
            }

            return result.getResponse(reply);
        });

        /**
         * Delete a transaction record.
         */
        this.app.delete<{ Params: { id: string } }>('/api/admin/transaction/:id', { preHandler: [check('perm:transaction.manage')] }, async (request, reply) => {
            const transactionId = parseInt(request.params.id);
            if (isNaN(transactionId)) return reply.status(400).send({ message: 'Invalid transaction ID' });
            
            // Get data before delete
            const txRes = await transactionsDB.get_transaction_by_id(this.db, transactionId);
            if (txRes.isError()) return txRes.getResponse(reply);
            const tx = txRes.getData();
            const userId = tx.user_id;
            const isPending = tx.status === 'pending';

            const result = await transactionsDB.delete_transaction(this.db, transactionId);
            
            if (!result.isError()) {
                const EventHub = (await import('../../misc/EventHub.js')).default;
                EventHub.sendToUser(userId, 'balance_update', { userId });
                EventHub.broadcast('admin_transaction_update', { userId });

                if (isPending) {
                    // Send Discard Email
                    try {
                        const userRes = await UserDB.getElements(this.db, userId, ['email', 'first_name', 'last_name']);
                        if (!userRes.isError()) {
                            const user = userRes.getData();
                            const emailManager = EmailManager.getInstance();
                            await emailManager.sendTemplatedEmail(
                                user.email,
                                `Top-Up Request Removed: ${tx.description} - DUCC`,
                                'topup_discarded',
                                {
                                    name: user.first_name,
                                    amount: Math.abs(tx.amount).toFixed(2),
                                    description: tx.description
                                }
                            );
                        }
                    } catch (emailErr) {
                        Logger.error('Failed to send top-up discard email', emailErr);
                    }
                }
            }

            return result.getResponse(reply);
        });
    }
}