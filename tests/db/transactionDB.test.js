const { setupTestDb } = require('../utils/db');
const TransactionsDB = require('../../server/db/transactionDB');

describe('TransactionsDB', () => {
    let db;
    let userId;

    beforeEach(async () => {
        db = await setupTestDb();
        const res = await db.run(`INSERT INTO users (email, first_name, last_name) VALUES ('u@d.ac.uk', 'U', 'S')`);
        userId = res.lastID;

        // Setup Permissions
        await db.run("INSERT INTO permissions (slug) VALUES ('transaction.manage')");
        const permId = (await db.get("SELECT id FROM permissions WHERE slug = 'transaction.manage'")).id;
        await db.run("INSERT INTO roles (name) VALUES ('Treasurer')");
        const roleId = (await db.get("SELECT id FROM roles WHERE name = 'Treasurer'")).id;
        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [roleId, permId]);
        
        // Assign role to user for managed tests
        // We will assign it dynamically in tests if needed, or create a separate admin user
    });

    afterEach(async () => {
        await db.close();
    });

    test('add_transaction updates balance', async () => {
        // Assign role
        const roleId = (await db.get("SELECT id FROM roles WHERE name = 'Treasurer'")).id;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);

        await TransactionsDB.add_transaction(db, userId, 50, 'Credit');
        await TransactionsDB.add_transaction(db, userId, -20, 'Debit');

        const balanceRes = await TransactionsDB.get_balance(db, userId);
        expect(balanceRes.getStatus()).toBe(200);
        expect(balanceRes.getData()).toBe(30);
    });

    test('get_transactions returns history', async () => {
        // Assign role
        const roleId = (await db.get("SELECT id FROM roles WHERE name = 'Treasurer'")).id;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, roleId]);

        await TransactionsDB.add_transaction(db, userId, 100, 'Init');

        const historyRes = await TransactionsDB.get_transactions(db, userId);
        expect(historyRes.getStatus()).toBe(200);
        const history = historyRes.getData();
        expect(history.length).toBe(1);
        expect(history[0].amount).toBe(100);
        expect(history[0].after).toBe(100);
    });
});
