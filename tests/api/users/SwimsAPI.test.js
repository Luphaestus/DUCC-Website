/**
 * SwimsAPI.test.js
 * 
 * Swim Management API tests.
 */

import TestWorld from '../../utils/TestWorld.js';
import SwimsAPI from '../../../server/api/users/SwimsAPI.js';

describe('api/users/SwimsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();

        await world.createRole('Admin', ['swims.manage']);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('user', {});

        new SwimsAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /** Test leaderboard access. */
    test('GET /api/user/swims/leaderboard', async () => {
        const res = await world.as('user').get('/api/user/swims/leaderboard');
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(Array.isArray(body.data)).toBe(true);
    });

    /** Test admin swim addition. */
    test('POST /api/user/:id/swims - Success for authorized Exec', async () => {
        const userId = world.data.users['user'];
        const res = await world.as('admin').post(`/api/user/${userId}/swims`, { count: 5, message: 'Test swim' });
        expect(res.statusCode).toBe(200);

        // Verify update in DB
        const user = await world.db.get('SELECT swims FROM users WHERE id = ?', [userId]);
        expect(user.swims).toBe(5);
    });

    test('POST /api/user/:id/booties - marks selected swim records', async () => {
        const userId = world.data.users['user'];
        await world.as('admin').post(`/api/user/${userId}/swims`, { count: 2, message: 'Session one' });
        await world.as('admin').post(`/api/user/${userId}/swims`, { count: 1, message: 'Session two' });

        const history = await world.db.all('SELECT id, count FROM swim_history WHERE user_id = ? ORDER BY id ASC', [userId]);

        const res = await world.as('admin').post(`/api/user/${userId}/booties`, { swimIds: [history[0].id] });
        expect(res.statusCode).toBe(200);

        const user = await world.db.get('SELECT booties FROM users WHERE id = ?', [userId]);
        expect(user.booties).toBe(2);

        const resFail = await world.as('admin').post(`/api/user/${userId}/booties`, { swimIds: [] });
        expect(resFail.statusCode).toBe(400);
    });

    test('GET /api/user/swims/users and pending booties endpoints', async () => {
        const userId = world.data.users['user'];
        await world.as('admin').post(`/api/user/${userId}/swims`, { count: 1, message: 'Needs bootie' });

        const usersRes = await world.as('admin').get('/api/user/swims/users?search=us');
        expect(usersRes.statusCode).toBe(200);
        const usersBody = JSON.parse(usersRes.body);
        expect(Array.isArray(usersBody.data)).toBe(true);

        const pendingRes = await world.as('admin').get(`/api/user/${userId}/swims/pending-booties`);
        expect(pendingRes.statusCode).toBe(200);
        const pendingBody = JSON.parse(pendingRes.body);
        expect(Array.isArray(pendingBody.data)).toBe(true);
        expect(pendingBody.data.length).toBe(1);
    });
});
