/**
 * transactionDB.test.js
 * 
 * Database layer tests for user transactions and balances.
 * Verifies balance calculation and history generation with running balances.
 */

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

    /**
     * Test aggregate balance calculation.
     */
    test('add_transaction successfully updates the user\'s total balance', async () => {
        await world.createUser('user', {});
        const userId = world.data.users['user'];

        await TransactionsDB.add_transaction(world.db, userId, 50, 'Credit');
        await TransactionsDB.add_transaction(world.db, userId, -20, 'Debit');

        const balanceRes = await TransactionsDB.get_balance(world.db, userId);
        expect(balanceRes.getData()).toBe(30);
    });

    /**
     * Test chronological history with running balance.
     */
    test('get_transactions returns full history with correctly calculated running balance', async () => {
        await world.createUser('user', {});
        const userId = world.data.users['user'];

        await TransactionsDB.add_transaction(world.db, userId, 100, 'Initial Deposit');
        await TransactionsDB.add_transaction(world.db, userId, -30, 'Gear Purchase');

        const historyRes = await TransactionsDB.get_transactions(world.db, userId);
        const history = historyRes.getData();
        
        // Results are sorted newest first by the DB handler
        expect(history.length).toBe(2);
        
        // Most recent: Gear purchase
        expect(history[0].amount).toBe(-30);
        expect(history[0].after).toBe(70); // 100 - 30 = 70
        
        // Oldest: Initial deposit
        expect(history[1].amount).toBe(100);
        expect(history[1].after).toBe(100);
    });
});
