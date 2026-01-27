/**
 * CollegesAPI.test.js
 * 
 * Functional tests for the Colleges API.
 * Verifies that the system returns the correct list of colleges.
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
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /**
     * Test that anyone (public or member) can fetch the college list.
     */
    test('GET /api/colleges works for everyone', async () => {
        // As authenticated user
        const res1 = await world.as('user').get('/api/colleges');
        expect(res1.statusCode).toBe(200);
        expect(res1.body.length).toBeGreaterThan(0);

        // As guest
        const res2 = await world.request.get('/api/colleges');
        expect(res2.statusCode).toBe(200);
        expect(res2.body.length).toBeGreaterThan(0);
    });
});
