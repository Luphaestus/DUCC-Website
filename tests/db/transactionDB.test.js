const { setupTestDb } = require('/js/utils/db');
const TransactionsDB = require('../../server/db/transactionDB');

describe('TransactionsDB', () => {
    let db;
    let userId;

    beforeEach(async () => {
        db = await setupTestDb();
        const res = await db.run(`INSERT INTO users (email, first_name, last_name) VALUES ('u@d.ac.uk', 'U', 'S')`);
        userId = res.lastID;
    });

    afterEach(async () => {
        await db.close();
    });

    test('add_transaction updates balance', async () => {
        const req = {
            isAuthenticated: () => true,
            user: { id: userId, can_manage_transactions: true }
        };

        await TransactionsDB.add_transaction(req, db, userId, 50, 'Credit');
        await TransactionsDB.add_transaction(req, db, userId, -20, 'Debit');

        const balanceRes = await TransactionsDB.get_balance(req, db, userId);
        expect(balanceRes.getStatus()).toBe(200);
        expect(balanceRes.getData()).toBe(30);
    });

    test('get_transactions returns history', async () => {
        const req = {
            isAuthenticated: () => true,
            user: { id: userId, can_manage_transactions: true }
        };

        await TransactionsDB.add_transaction(req, db, userId, 100, 'Init');

        const historyRes = await TransactionsDB.get_transactions(req, db, userId);
        expect(historyRes.getStatus()).toBe(200);
        const history = historyRes.getData();
        expect(history.length).toBe(1);
        expect(history[0].amount).toBe(100);
        expect(history[0].after).toBe(100);
    });
});
