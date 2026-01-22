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

    describe('Transaction Management', () => {
        test('Full CRUD workflow', async () => {
            const userId = world.data.users['user'];

            const res1 = await world.as('admin').post(`/api/admin/user/${userId}/transaction`).send({
                amount: 50, description: 'Init'
            });
            expect(res1.statusCode).toBe(200);

            const res2 = await world.as('admin').get(`/api/admin/user/${userId}/transactions`);
            expect(res2.statusCode).toBe(200);
            expect(res2.body).toHaveLength(1);
            const txId = res2.body[0].id;

            const res3 = await world.as('admin').put(`/api/admin/transaction/${txId}`).send({
                amount: 100, description: 'Corrected'
            });
            expect(res3.statusCode).toBe(200);

            const res4 = await world.as('admin').delete(`/api/admin/transaction/${txId}`);
            expect(res4.statusCode).toBe(200);

            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(balance.b).toBe(0);
        });

        test('Forbidden for regular user', async () => {
            const res = await world.as('user').get(`/api/admin/user/${world.data.users['admin']}/transactions`);
            expect(res.statusCode).toBe(403);
        });
    });
});