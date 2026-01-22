const TestWorld = require('../utils/TestWorld');
const TransactionsDB = require('../../server/db/transactionDB');

describe('db/transactionDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('add_transaction updates balance', async () => {
        await world.createUser('user', {});
        const userId = world.data.users['user'];

        await TransactionsDB.add_transaction(world.db, userId, 50, 'Credit');
        await TransactionsDB.add_transaction(world.db, userId, -20, 'Debit');

        const balanceRes = await TransactionsDB.get_balance(world.db, userId);
        expect(balanceRes.getData()).toBe(30);
    });

    test('get_transactions returns history with running balance', async () => {
        await world.createUser('user', {});
        const userId = world.data.users['user'];

        await TransactionsDB.add_transaction(world.db, userId, 100, 'Init');
        await TransactionsDB.add_transaction(world.db, userId, -30, 'Buy');

        const historyRes = await TransactionsDB.get_transactions(world.db, userId);
        const history = historyRes.getData();
        
        expect(history.length).toBe(2);
        expect(history[0].amount).toBe(-30);
        expect(history[0].after).toBe(70);
        expect(history[1].amount).toBe(100);
        expect(history[1].after).toBe(100);
    });
});