const { statusObject } = require('../misc/status.js');

/**
 * Database operations for user financial records and balances.
 */
class TransactionsDB {
    /**
     * Fetch user transaction data (balance or transactions).
     * @param {object} req
     * @param {object} db
     * @param {string[]} elements
     * @param {number|null} id
     * @returns {Promise<statusObject>}
     */
    static async getElements(req, db, elements, id = null) {
        if (id == null) id = req.user?.id;
        const data = {};

        for (const element of elements) {
            switch (element) {
                case "balance":
                    var response = await this.get_balance(req, db, id);
                    if (response.isError()) return response;
                    data[element] = response.getData();
                    break;
                case "transactions":
                    var response = await this.get_transactions(req, db, id);
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
     * Calculate user balance by summing transactions.
     * @param {object} req
     * @param {object} db
     * @param {number|null} userId
     * @returns {Promise<statusObject>}
     */
    static async get_balance(req, db, userId = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (userId == null) userId = req.user.id;

        if (req.user.id !== userId && !req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        const result = await db.get('SELECT SUM(amount) AS balance FROM transactions WHERE user_id = ?', [userId]);
        return new statusObject(200, null, result?.balance ?? 0);
    }

    /**
     * Add transaction record (internal).
     * @param {object} db
     * @param {number} userId
     * @param {number} amount
     * @param {string} description
     * @param {number|null} eventId
     * @returns {Promise<statusObject>}
     */
    static async add_transaction_admin(db, userId, amount, description, eventId = null) {
        await db.run(
            'INSERT INTO transactions (user_id, amount, description, created_at, event_id) VALUES (?, ?, ?, ?, ?)',
            [userId, amount, description, new Date().toISOString(), eventId]
        );
        const transactionId = await db.get('SELECT last_insert_rowid() AS id');
        return new statusObject(200, 'Transaction added successfully', transactionId.id);
    }

    /**
     * Add transaction record with auth checks.
     * @param {object} req
     * @param {object} db
     * @param {number} userId
     * @param {number} amount
     * @param {string} description
     * @param {number|null} eventId
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
     * Check if transaction ID exists.
     * @param {object} db
     * @param {number} transactionId
     * @returns {Promise<boolean>}
     */
    static async get_transaction_exists(db, transactionId) {
        const transaction = await db.get('SELECT id FROM transactions WHERE id = ?', [transactionId]);
        return transaction !== undefined;
    }

    /**
     * Fetch all transactions for a user with running balance, newest first.
     * @param {object} req
     * @param {object} db
     * @param {number} userId
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
        const transactionsWithAfter = transactions.map(tx => {
            runningBalance += tx.amount;
            return { ...tx, after: runningBalance };
        });

        return new statusObject(200, null, transactionsWithAfter.reverse());
    }

    /**
     * Delete transaction and clear event links (internal).
     * @param {object} db
     * @param {number} transactionId
     * @returns {Promise<statusObject>}
     */
    static async delete_transaction_admin(db, transactionId) {
        if (!await this.get_transaction_exists(db, transactionId)) {
            return new statusObject(404, 'Transaction not found');
        }

        await db.run('DELETE FROM transactions WHERE id = ?', [transactionId]);
        await db.run('UPDATE event_attendees SET payment_transaction_id = NULL WHERE payment_transaction_id = ?', [transactionId]);

        return new statusObject(200, 'Transaction deleted successfully');
    }

    /**
     * Delete transaction with auth checks.
     * @param {object} req
     * @param {object} db
     * @param {number} transactionId
     * @returns {Promise<statusObject>}
     */
    static async delete_transaction(req, db, transactionId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (!req.user.can_manage_transactions) return new statusObject(403, 'User not authorized');
        return this.delete_transaction_admin(db, transactionId);
    }

    /**
     * Fetch transaction ID for a specific event/user.
     * @param {object} req
     * @param {object} db
     * @param {number} eventId
     * @param {number} userId
     * @returns {Promise<statusObject>}
     */
    static async get_transactionid_by_event(req, db, eventId, userId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (req.user.id !== userId && !req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        const transaction = await db.get('SELECT id FROM transactions WHERE event_id = ? AND user_id = ?', [eventId, userId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');
        return new statusObject(200, null, transaction.id);
    }

    /**
     * Update transaction details.
     * @param {object} req
     * @param {object} db
     * @param {number} transactionId
     * @param {number} amount
     * @param {string} description
     * @returns {Promise<statusObject>}
     */
    static async edit_transaction(req, db, transactionId, amount, description) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (!req.user.can_manage_transactions) return new statusObject(403, 'User not authorized');

        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');

        await db.run('UPDATE transactions SET amount = ?, description = ? WHERE id = ?', [amount, description, transactionId]);
        return new statusObject(200, 'Transaction updated successfully');
    }

    /**
     * Fetch a single transaction by ID.
     * @param {object} req
     * @param {object} db
     * @param {number} transactionId
     * @returns {Promise<statusObject>}
     */
    static async get_transaction_by_id(req, db, transactionId) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');
        if (!req.user.can_manage_transactions) return new statusObject(403, 'User not authorized');

        const transaction = await db.get('SELECT * FROM transactions WHERE id = ?', [transactionId]);
        if (!transaction) return new statusObject(404, 'Transaction not found');
        return new statusObject(200, null, transaction);
    }
}

module.exports = TransactionsDB;