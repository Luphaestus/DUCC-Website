const { statusObject } = require('../misc/status.js');

/**
 * TransactionsDB module.
 * Manages financial records for users, including balance calculations and transaction history.
 */
class TransactionsDB {
    /**
     * Retrieves specific transaction-related data for a user.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {string[]} elements - The data elements to retrieve ('balance' or 'transactions').
     * @param {number|null} id - The user ID (defaults to authenticated user).
     * @returns {Promise<statusObject>} A statusObject containing the requested data.
     */
    static async getElements(req, db, elements, id = null) {
        if (id == null) {
            id = req.user?.id;
        }

        const data = {};

        for (const element of elements) {
            switch (element) {
                case "balance":
                    var response = await this.get_balance(req, db, id);
                    if (response.isError()) {
                        return response;
                    }
                    data[element] = response.getData();
                    break;
                case "transactions":
                    var response = await this.get_transactions(req, db, id);
                    if (response.isError()) {
                        return response;
                    }
                    data[element] = response.getData();
                    break;
                default:
                    return new statusObject(400, 'Invalid element');
            }
        }

        return new statusObject(200, null, data);
    }

    /**
     * Calculates the current balance for a user by summing all their transactions.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number|null} userId - The user ID (defaults to authenticated user).
     * @returns {Promise<statusObject>} A statusObject containing the numerical balance.
     */
    static async get_balance(req, db, userId = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        if (userId == null) {
            userId = req.user.id;
        }

        // Authorization: User can see their own balance, or an admin with transaction permissions can see anyone's.
        if (req.user.id !== userId && !req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        const result = await db.get(
            'SELECT SUM(amount) AS balance FROM transactions WHERE user_id = ?',
            [userId]
        );

        if (!result || result.balance === null) {
            return new statusObject(200, 'Balance not found', 0);
        }

        return new statusObject(200, null, result.balance);
    }

    /**
     * Adds a transaction record (internal use).
     * @param {object} db - The database instance.
     * @param {number} userId - The ID of the user for whom the transaction is being added.
     * @param {number} amount - The amount (positive for credit, negative for debit).
     * @param {string} description - Description of the transaction.
     * @param {number|null} eventId - Optional ID of an event associated with this transaction.
     * @returns {Promise<statusObject>}
     */
    static async add_transaction_admin(db, userId, amount, description, eventId = null) {
        const createdAt = new Date().toISOString();

        await db.run(
            'INSERT INTO transactions (user_id, amount, description, created_at, event_id) VALUES (?, ?, ?, ?, ?)',
            [userId, amount, description, createdAt, eventId]
        );

        const transactionId = await db.get('SELECT last_insert_rowid() AS id');

        return new statusObject(200, 'Transaction added successfully', transactionId.id);
    }

    /**
     * Adds a transaction record with authorization checks.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} userId - The user ID.
     * @param {number} amount - The amount.
     * @param {string} description - The description.
     * @param {number|null} eventId - Optional event ID.
     * @returns {Promise<statusObject>}
     */
    static async add_transaction(req, db, userId, amount, description, eventId = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        if (req.user.id !== userId && !req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        return this.add_transaction_admin(db, userId, amount, description, eventId);
    }

    /**
     * Checks if a transaction ID exists in the database.
     * @param {object} db - The database instance.
     * @param {number} transactionId - The ID to check.
     * @returns {Promise<boolean>}
     */
    static async get_transaction_exists(db, transactionId) {
        const transaction = await db.get(
            'SELECT id FROM transactions WHERE id = ?',
            [transactionId]
        );

        return transaction !== undefined;
    }

    /**
     * Retrieves all transactions for a specific user.
     * Enhances each record with a "running balance" (after) calculation.
     * Returns records in reverse chronological order (newest first).
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} userId - The user ID.
     * @returns {Promise<statusObject>}
     */
    static async get_transactions(req, db, userId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (req.user.id !== userId && !req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        const transactions = await db.all(
            'SELECT id, amount, description, created_at FROM transactions WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
        );

        let runningBalance = 0;
        const transactionsWithAfter = transactions.map(transaction => {
            runningBalance += transaction.amount;
            return {
                ...transaction,
                after: runningBalance
            };
        });

        return new statusObject(200, null, transactionsWithAfter.reverse());
    }

    /**
     * Deletes a transaction record and cleans up associated attendance links.
     * @param {object} db - The database instance.
     * @param {number} transactionId - The ID of the transaction to delete.
     * @returns {Promise<statusObject>}
     */
    static async delete_transaction_admin(db, transactionId) {
        const transactionExists = await TransactionsDB.get_transaction_exists(db, transactionId);
        if (!transactionExists) {
            return new statusObject(404, 'Transaction not found');
        }

        await db.run(
            'DELETE FROM transactions WHERE id = ?',
            [transactionId]
        );

        // Clear references in event_attendees
        await db.run(
            'UPDATE event_attendees SET payment_transaction_id = NULL WHERE payment_transaction_id = ?',
            [transactionId]
        );

        return new statusObject(200, 'Transaction deleted successfully');
    }

    /**
     * Deletes a transaction record with authorization checks.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} transactionId - The ID to delete.
     * @returns {Promise<statusObject>}
     */
    static async delete_transaction(req, db, transactionId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (!req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        return this.delete_transaction_admin(db, transactionId);
    }

    /**
     * Retrieves the transaction ID associated with a specific event for a user.
     * Useful for processing refunds.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} eventId - The event ID.
     * @param {number} userId - The user ID.
     * @returns {Promise<statusObject>}
     */
    static async get_transactionid_by_event(req, db, eventId, userId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (req.user.id !== userId && !req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        const transaction = await db.get(
            'SELECT id FROM transactions WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );

        if (!transaction) {
            return new statusObject(404, 'Transaction not found');
        }

        return new statusObject(200, null, transaction.id);
    }

    /**
     * Updates the amount or description of an existing transaction.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} transactionId - The ID to update.
     * @param {number} amount - The new amount.
     * @param {string} description - The new description.
     * @returns {Promise<statusObject>}
     */
    static async edit_transaction(req, db, transactionId, amount, description) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (!req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
        if (!transaction) {
            return new statusObject(404, 'Transaction not found');
        }

        await db.run(
            'UPDATE transactions SET amount = ?, description = ? WHERE id = ?',
            [amount, description, transactionId]
        );

        return new statusObject(200, 'Transaction updated successfully');
    }

    /**
     * Retrieves a single transaction by its ID.
     * @param {object} req - The Express request object.
     * @param {object} db - The database instance.
     * @param {number} transactionId - The ID to retrieve.
     * @returns {Promise<statusObject>}
     */
    static async get_transaction_by_id(req, db, transactionId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (!req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        const transaction = await db.get(
            'SELECT * FROM transactions WHERE id = ?',
            [transactionId]
        );

        if (!transaction) {
            return new statusObject(404, 'Transaction not found');
        }

        return new statusObject(200, null, transaction);
    }
}

module.exports = TransactionsDB;