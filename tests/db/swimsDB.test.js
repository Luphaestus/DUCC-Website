/**
 * swimsDB.test.js
 * 
 * Swim DB tests.
 */

import TestWorld from '../utils/TestWorld.js';
import SwimsDB from '../../server/db/swimsDB.js';

describe('db/swimsDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /** Test swim addition and history. */
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

    /** Test leaderboard sorting. */
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

    test('markSwimsAsBooties marks selected swim records and syncs aggregate booties', async () => {
        await world.createUser('user', { swims: 10 });
        const userId = world.data.users['user'];

        await SwimsDB.addSwims(world.db, userId, 2, 1, 'Session A');
        await SwimsDB.addSwims(world.db, userId, 1, 1, 'Session B');

        const pending = await SwimsDB.getPendingBootieSwims(world.db, userId);
        const pendingRows = pending.getData();
        expect(pendingRows.length).toBe(2);

        const markRes = await SwimsDB.markSwimsAsBooties(world.db, userId, [pendingRows[0].id]);
        expect(markRes.status).toBe(200);

        const user = await world.db.get('SELECT booties FROM users WHERE id = ?', [userId]);
        expect(user.booties).toBe(pendingRows[0].count);

        const invalidRes = await SwimsDB.markSwimsAsBooties(world.db, userId, [999999]);
        expect(invalidRes.status).toBe(400);
    });

    test('all-time leaderboard booties are derived from marked swim history', async () => {
        await world.createUser('user', { first_name: 'A' });
        const userId = world.data.users['user'];

        await SwimsDB.addSwims(world.db, userId, 3, 1, 'Session A');
        await SwimsDB.addSwims(world.db, userId, 2, 1, 'Session B');

        const history = await world.db.all('SELECT id, count FROM swim_history WHERE user_id = ? ORDER BY id ASC', [userId]);
        await SwimsDB.markSwimsAsBooties(world.db, userId, [history[1].id]);

        const leaderboardRes = await SwimsDB.getSwimsLeaderboard(world.db, false, userId);
        const leaderboard = leaderboardRes.getData();
        expect(leaderboard[0].swims).toBe(5);
        expect(leaderboard[0].booties).toBe(2);
    });
});