/**
 * swimsDB.test.js
 * 
 * Database layer tests for swim records.
 * Covers swim addition with historical logging and leaderboard generation.
 */

const TestWorld = require('../utils/TestWorld');
const SwimsDB = require('../../server/db/swimsDB');

describe('db/swimsDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /**
     * Test swim addition and the side-effect of creating a history log.
     */
    test('addSwims updates aggregate count and creates individual history entry', async () => {
        await world.createUser('user', {});
        const userId = world.data.users['user'];
        
        await SwimsDB.addSwims(world.db, userId, 5, 1);
        
        // Check aggregate count on user profile
        const user = await world.db.get('SELECT swims FROM users WHERE id = ?', [userId]);
        expect(user.swims).toBe(5);

        // Check history table log
        const history = await world.db.all('SELECT * FROM swim_history WHERE user_id = ?', [userId]);
        expect(history.length).toBe(1);
        expect(history[0].count).toBe(5);
    });

    /**
     * Test leaderboard sorting and 'is_me' flagging.
     */
    test('getSwimsLeaderboard correctly sorts and flags the requesting user', async () => {
        await world.createUser('user1', { first_name: 'A' });
        await SwimsDB.addSwims(world.db, world.data.users['user1'], 10, 1);

        await world.createUser('user2', { first_name: 'B' });
        await SwimsDB.addSwims(world.db, world.data.users['user2'], 20, 1);

        // Fetch leaderboard from user1 perspective
        const res = await SwimsDB.getSwimsLeaderboard(world.db, false, world.data.users['user1']);
        const leaderboard = res.getData();
        
        expect(leaderboard[0].swims).toBe(20); // user2 should be first
        expect(leaderboard[1].swims).toBe(10); // user1 should be second
        expect(leaderboard[1].is_me).toBe(true);
    });

    test('addBooties updates count and enforces swim limit', async () => {
        await world.createUser('user', { swims: 10 });
        const userId = world.data.users['user'];

        // Success
        const res1 = await SwimsDB.addBooties(world.db, userId, 5);
        expect(res1.status).toBe(200);
        const user1 = await world.db.get('SELECT booties FROM users WHERE id = ?', [userId]);
        expect(user1.booties).toBe(5);

        // Fail: exceeding swims
        const res2 = await SwimsDB.addBooties(world.db, userId, 6);
        expect(res2.status).toBe(400);
        expect(res2.message).toMatch(/cannot exceed swims/i);

        // Fail: user not found
        const res3 = await SwimsDB.addBooties(world.db, 9999, 1);
        expect(res3.status).toBe(404);
    });
});