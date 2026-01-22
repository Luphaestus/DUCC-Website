/**
 * transactionDB.js
 * 
 * This module handles all database operations related to user financial transactions.
 * It calculates balances, records event payments, and manages manual admin adjustments.
 */

const { statusObject } = require('../misc/status.js');
const { Permissions } = require('../misc/permissions.js');

/**
 * Database operations for user financial records and balances.
 */
class TransactionsDB {
    /**
     * Fetch requested transaction-related elements for a user.
     * @param {object} db - Database connection.
     * @param {number} userId - User ID.
     * @param {string[]} elements - List of requested keys ('balance', 'transactions').
     * @returns {Promise<statusObject>} - Data is a map of requested elements.
     */
    static async getElements(db, userId, elements) {
        const data = {};

        for (const element of elements) {
            switch (element) {
                case "balance":
                    var response = await this.get_balance(db, userId);
                    if (response.isError()) return response;
                    data[element] = response.getData();
                    break;
                case "transactions":
                    var response = await this.get_transactions(db, userId);
                    if (response.isError()) return response;
                    data[element] = response.getData();
                    break;
                default:
                    return new statusObject(400, 'Invalid element');
            }
        }
        return new statusObject(200, null, data);
    }

    /**
     * Calculate a user's current balance by summing all their transaction amounts.
     * @param {object} db - Database connection.
     * @param {number} userId - User ID.
     * @returns {Promise<statusObject>} - Data is the calculated numerical balance.
     */
    static async get_balance(db, userId) {
        const result = await db.get('SELECT SUM(amount) AS balance FROM transactions WHERE user_id = ?', [userId]);
        // If no transactions exist, result.balance is null; fallback to 0
        return new statusObject(200, null, result?.balance ?? 0);
    }

    /**
     * Internal method to insert a transaction record.
     * @private
     */
    static async _add_transaction_internal(db, userId, amount, description, eventId = null) {
        await db.run(
            'INSERT INTO transactions (user_id, amount, description, created_at, event_id) VALUES (?, ?, ?, ?, ?)',
            [userId, amount, description, new Date().toISOString(), eventId]
        );
        const transactionId = await db.get('SELECT last_insert_rowid() AS id');
        return new statusObject(200, 'Transaction added successfully', transactionId.id);
    }

    /**
     * Public method to add a transaction record.
     * @param {object} db - Database connection.
     * @param {number} userId - Target user ID.
     * @param {number} amount - Amount (negative for charges, positive for credits/refunds).
     * @param {string} description - Description of the transaction.
     * @param {number|null} [eventId=null] - Optional ID of the associated event.
     * @returns {Promise<statusObject>} - Data contains the new transaction's ID.
     */
    static async add_transaction(db, userId, amount, description, eventId = null) {
        return this._add_transaction_internal(db, userId, amount, description, eventId);
    }

    /**
     * Verify if a transaction ID exists in the database.
     */
    static async get_transaction_exists(db, transactionId) {
        const transaction = await db.get('SELECT id FROM transactions WHERE id = ?', [transactionId]);
        return transaction !== undefined;
    }

    /**
     * Fetch all transactions for a user, calculating a running balance for each point in history.
     * Returns results sorted newest first.
     * @param {object} db - Database connection.
     * @param {number} userId - User ID.
     * @returns {Promise<statusObject>} - Data is a list of transactions with 'after' (balance) field.
     */
    static async get_transactions(db, userId) {
        // Fetch all chronologically to calculate running balance
        const transactions = await db.all(
            'SELECT id, amount, description, created_at FROM transactions WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
        );

        let runningBalance = 0;
        const transactionsWithAfter = transactions.map(tx => {
            runningBalance += tx.amount;
            return { ...tx, after: runningBalance };
        });

        // Reverse to return newest first for the UI
        return new statusObject(200, null, transactionsWithAfter.reverse());
    }

    /**
     * Internal method to delete a transaction and clean up event references.
     * @private
     */
    static async _delete_transaction_internal(db, transactionId) {
        if (!await this.get_transaction_exists(db, transactionId)) {
            return new statusObject(404, 'Transaction not found');
        }

        // Physically delete the record
        await db.run('DELETE FROM transactions WHERE id = ?', [transactionId]);
        
        // Clear the foreign key in the event_attendees table to maintain referential integrity
        await db.run('UPDATE event_attendees SET payment_transaction_id = NULL WHERE payment_transaction_id = ?', [transactionId]);

        return new statusObject(200, 'Transaction deleted successfully');
    }

    /**
     * Public method to delete a transaction.
     */
    static async delete_transaction(db, transactionId) {
        return this._delete_transaction_internal(db, transactionId);
    }

    /**
     * Find the transaction ID associated with a specific user's attendance at an event.
     * @param {object} db - Database connection.
     * @param {number} eventId - ID of the event.
     * @param {number} userId - ID of the user.
     * @returns {Promise<statusObject>} - Data is the transaction ID.
     */
    static async get_transactionid_by_event(db, eventId, userId) {
        const transaction = await db.get('SELECT id FROM transactions WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');
        return new statusObject(200, null, transaction.id);
    }

    /**
     * Update the details of an existing transaction record.
     */
    static async edit_transaction(db, transactionId, amount, description) {
        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');

        await db.run('UPDATE transactions SET amount = ?, description = ? WHERE id = ?', [amount, description, transactionId]);
        return new statusObject(200, 'Transaction updated successfully');
    }

    /**
     * Retrieve a single transaction record by its ID.
     */
    static async get_transaction_by_id(db, transactionId) {
        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');
        return new statusObject(200, null, transaction);
    }
}

module.exports = TransactionsDB;