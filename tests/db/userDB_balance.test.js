const { setupTestDb } = require('../../tests/utils/db');
const UserDB = require('../../server/db/userDB');
const bcrypt = require('bcrypt');

describe('UserDB Balance', () => {
    let db;
    let userId;

    beforeEach(async () => {
        db = await setupTestDb();
        const hashedPassword = await bcrypt.hash('password', 10);

        // Create user
        const res = await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, college_id)
             VALUES (?, ?, ?, ?, ?)`,
            ['test_balance@durham.ac.uk', hashedPassword, 'Balance', 'Test', 1]
        );
        userId = res.lastID;

        // Add transactions to create a balance
        await db.run(
            `INSERT INTO transactions (user_id, amount, description) VALUES (?, ?, ?)`,
            [userId, 10.50, 'Credit']
        );
        await db.run(
            `INSERT INTO transactions (user_id, amount, description) VALUES (?, ?, ?)`,
            [userId, -5.00, 'Debit']
        );
    });

    afterEach(async () => {
        await db.close();
    });

    test('getElementsById retrieves calculated balance', async () => {
        const result = await UserDB.getElementsById(db, userId, ['id', 'balance']);
        expect(result.getStatus()).toBe(200);
        expect(result.getData()).toEqual({ id: userId, balance: 5.50 });
    });

    test('getElements retrieves calculated balance for self', async () => {
        const req = {
            isAuthenticated: () => true,
            user: { id: userId }
        };
        const result = await UserDB.getElementsById(db, userId, ['id', 'balance']);
        expect(result.getStatus()).toBe(200);
        expect(result.getData()).toEqual({ id: userId, balance: 5.50 });
    });

    test('getElements retrieves 0 balance for user with no transactions', async () => {
         const hashedPassword = await bcrypt.hash('password', 10);
         const res = await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, college_id)
             VALUES (?, ?, ?, ?, ?)`,
            ['no_trans@durham.ac.uk', hashedPassword, 'No', 'Trans', 1]
        );
        const noTransUserId = res.lastID;

        const req = {
            isAuthenticated: () => true,
            user: { id: noTransUserId }
        };
        const result = await UserDB.getElementsById(db, userId, ['id', 'balance']);
        expect(result.getStatus()).toBe(200);
        expect(result.getData()).toEqual({ id: noTransUserId, balance: 0 });
    });
});
