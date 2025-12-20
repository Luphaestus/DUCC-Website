const { statusObject } = require('../misc/status.js');

class transactionsDB {
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

    static async get_balance(req, db, userId = null) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        if (userId == null) {
            userId = req.user.id;
        }

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

    static async add_transaction(req, db, userId, amount, description) {
        if (!req.isAuthenticated()) return new statusObject(401, 'User not authenticated');

        if (req.user.id !== userId && !req.user.can_manage_transactions) {
            return new statusObject(403, 'User not authorized');
        }

        const createdAt = new Date().toISOString();

        await db.run(
            'INSERT INTO transactions (user_id, amount, description, created_at) VALUES (?, ?, ?, ?)',
            [userId, amount, description, createdAt]
        );

        return new statusObject(200, 'Transaction added successfully');
    }

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

    static async delete_transaction(req, db, transactionId) {
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

        await db.run(
            'DELETE FROM transactions WHERE id = ?',
            [transactionId]
        );

        return new statusObject(200, 'Transaction deleted successfully');
    }

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
}

module.exports = transactionsDB;