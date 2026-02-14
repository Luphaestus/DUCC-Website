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

    test('POST /api/user/:id/booties - Success and validation', async () => {
        const userId = world.data.users['user'];
        // Setup some swims first
        await world.db.run('UPDATE users SET swims = 10 WHERE id = ?', [userId]);

        const res = await world.as('admin').post(`/api/user/${userId}/booties`, { count: 5 });
        expect(res.statusCode).toBe(200);

        const user = await world.db.get('SELECT booties FROM users WHERE id = ?', [userId]);
        expect(user.booties).toBe(5);

        // Fail validation
        const resFail = await world.as('admin').post(`/api/user/${userId}/booties`, { count: 6 });
        expect(resFail.statusCode).toBe(400);
    });
});
