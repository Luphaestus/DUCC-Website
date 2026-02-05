/**
 * CollegesAPI.test.js
 * 
 * Colleges API tests.
 */

import TestWorld from '../utils/TestWorld.js';
import CollegesAPI from '../../server/api/CollegesAPI.js';

describe('api/CollegesAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        await world.createUser('user', {});

        new CollegesAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /** Test that anyone can fetch the college list. */
    test('GET /api/colleges works for everyone', async () => {
        // As authenticated user
        const res1 = await world.as('user').get('/api/colleges');
        expect(res1.statusCode).toBe(200);
        expect(JSON.parse(res1.body).length).toBeGreaterThan(0);

        // As guest
        const res2 = await world.request.get('/api/colleges');
        expect(res2.statusCode).toBe(200);
        expect(JSON.parse(res2.body).length).toBeGreaterThan(0);
    });
});