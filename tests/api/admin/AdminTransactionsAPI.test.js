/**
 * AdminTransactionsAPI.test.js
 * 
 * Functional tests for the Admin Transaction Management API.
 * Verifies that administrators can view and manually adjust user balances.
 */

const TestWorld = require('../../utils/TestWorld');
const AdminTransactionsAPI = require('../../../server/api/admin/AdminTransactionsAPI');

describe('api/admin/AdminTransactionsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['transaction.read', 'transaction.manage', 'transaction.write']);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('user', {});

        new AdminTransactionsAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('Administrative Transaction Workflow', () => {
        /**
         * Verify the complete cycle of manual balance adjustment.
         */
        test('Full CRUD cycle for user transactions', async () => {
            const userId = world.data.users['user'];

            // 1. Create a transaction
            const res1 = await world.as('admin').post(`/api/admin/user/${userId}/transaction`).send({
                amount: 50, description: 'Initial adjustment'
            });
            expect(res1.statusCode).toBe(200);

            // 2. Fetch and verify
            const res2 = await world.as('admin').get(`/api/admin/user/${userId}/transactions`);
            expect(res2.statusCode).toBe(200);
            expect(res2.body).toHaveLength(1);
            const txId = res2.body[0].id;

            // 3. Edit existing transaction
            const res3 = await world.as('admin').put(`/api/admin/transaction/${txId}`).send({
                amount: 100, description: 'Corrected adjustment'
            });
            expect(res3.statusCode).toBe(200);

            // 4. Delete the transaction
            const res4 = await world.as('admin').delete(`/api/admin/transaction/${txId}`);
            expect(res4.statusCode).toBe(200);

            // 5. Final balance verification
            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(balance.b).toBe(0);
        });

        test('Transaction endpoints are forbidden for standard users', async () => {
            const res = await world.as('user').get(`/api/admin/user/${world.data.users['admin']}/transactions`);
            expect(res.statusCode).toBe(403);
        });
    });
});