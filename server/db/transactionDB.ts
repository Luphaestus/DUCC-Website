/**
 * transactionDB.ts
 * 
 * This module handles database operations related to user financial transactions.
 */

import { statusObject } from '../misc/status.js';
import { DatabaseWrapper } from './db.js';
import Logger from '../misc/Logger.js';
import NotificationsAPI, { NotificationType } from '../api/NotificationsAPI.js';

export default class TransactionsDB {
    /**
     * Fetch requested transaction-related elements for a user.
     */
    static async getElements(db: DatabaseWrapper, userId: number, elements: string[]): Promise<statusObject> {
        const data: any = {};

        for (const element of elements) {
            switch (element) {
                case "balance":
                    const balanceResponse = await this.get_balance(db, userId);
                    if (balanceResponse.isError()) return balanceResponse;
                    data[element] = balanceResponse.getData();
                    break;
                case "transactions":
                    const transactionsResponse = await this.get_transactions(db, userId);
                    if (transactionsResponse.isError()) return transactionsResponse;
                    data[element] = transactionsResponse.getData();
                    break;
                default:
                    return new statusObject(400, 'Invalid element');
            }
        }
        return new statusObject(200, null, data);
    }

    /**
     * Calculate a user's current balance.
     */
    static async get_balance(db: DatabaseWrapper, userId: number): Promise<statusObject> {
        const result = await db.get('SELECT SUM(amount) AS balance FROM transactions WHERE user_id = ?', [userId]);
        return new statusObject(200, null, result?.balance ?? 0);
    }

    /**
     * Internal method to insert a transaction record.
     */
    static async _add_transaction_internal(db: DatabaseWrapper, userId: number, amount: number, description: string, eventId: number | null = null): Promise<statusObject> {
        const result = await db.run(
            'INSERT INTO transactions (user_id, amount, description, created_at, event_id) VALUES (?, ?, ?, ?, ?)',
            [userId, amount, description, new Date().toISOString(), eventId]
        );

        // Send notification
        const title = 'New Payment Added';
        const body = `A payment of £${Math.abs(amount).toFixed(2)} has been added to your account for ${description}.`;
        
        NotificationsAPI.sendNotificationToUser(
            db, 
            userId, 
            title, 
            body, 
            '/profile?tab=balance', 
            NotificationType.PAYMENTS,
            'payment_notification',
            {
                amount: Math.abs(amount).toFixed(2),
                description: description
            }
        ).catch(err => Logger.error('Failed to send payment notification', err));

        return new statusObject(201, 'Transaction added successfully', result.lastID);
    }

    /**
     * Public method to add a transaction record.
     */
    static async add_transaction(db: DatabaseWrapper, userId: number, amount: number, description: string, eventId: number | null = null): Promise<statusObject> {
        return this._add_transaction_internal(db, userId, amount, description, eventId);
    }

    /**
     * Verify if a transaction ID exists in the database.
     */
    static async get_transaction_exists(db: DatabaseWrapper, transactionId: number): Promise<boolean> {
        const transaction = await db.get('SELECT id FROM transactions WHERE id = ?', [transactionId]);
        return transaction !== undefined;
    }

    /**
     * Fetch all transactions for a user, calculating a running balance using a window function.
     */
    static async get_transactions(db: DatabaseWrapper, userId: number): Promise<statusObject> {
        try {
            // Using SUM() OVER () to calculate the running balance in SQL
            const sql = `
                SELECT 
                    id, amount, description, created_at,
                    SUM(amount) OVER (ORDER BY created_at ASC, id ASC) as after
                FROM transactions 
                WHERE user_id = ? 
                ORDER BY created_at DESC, id DESC
            `;
            const transactions = await db.all(sql, [userId]);
            return new statusObject(200, null, transactions);
        } catch (error) {
            Logger.error('Database error in get_transactions:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Internal method to delete a transaction and clean up event references.
     */
    static async _delete_transaction_internal(db: DatabaseWrapper, transactionId: number): Promise<statusObject> {
        if (!await this.get_transaction_exists(db, transactionId)) {
            return new statusObject(404, 'Transaction not found');
        }

        await db.run('DELETE FROM transactions WHERE id = ?', [transactionId]);
        await db.run('UPDATE event_attendees SET payment_transaction_id = NULL WHERE payment_transaction_id = ?', [transactionId]);

        return new statusObject(200, 'Transaction deleted successfully');
    }

    /**
     * Public method to delete a transaction.
     */
    static async delete_transaction(db: DatabaseWrapper, transactionId: number): Promise<statusObject> {
        return this._delete_transaction_internal(db, transactionId);
    }

    /**
     * Find the transaction ID associated with a specific user's attendance at an event.
     */
    static async get_transactionid_by_event(db: DatabaseWrapper, eventId: number, userId: number): Promise<statusObject> {
        const transaction = await db.get('SELECT id FROM transactions WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');
        return new statusObject(200, null, transaction.id);
    }

    /**
     * Update the details of an existing transaction record.
     */
    static async edit_transaction(db: DatabaseWrapper, transactionId: number, amount: number, description: string): Promise<statusObject> {
        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');

        await db.run('UPDATE transactions SET amount = ?, description = ? WHERE id = ?', [amount, description, transactionId]);
        return new statusObject(200, 'Transaction updated successfully');
    }

    /**
     * Retrieve a single transaction record by its ID.
     */
    static async get_transaction_by_id(db: DatabaseWrapper, transactionId: number): Promise<statusObject> {
        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');
        return new statusObject(200, null, transaction);
    }
}
