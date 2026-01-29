/**
 * collegesDB.test.js
 * 
 * College DB tests.
 */

import TestWorld from '../utils/TestWorld.js';
import CollegesDB from '../../server/db/collegesDB.js';

describe('db/collegesDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /** Test getAll colleges. */
    test('getAll returns the canonical list of colleges', async () => {
        const res = await CollegesDB.getAll(world.db);
        expect(res.getStatus()).toBe(200);
        expect(res.getData().length).toBeGreaterThan(0);
    });

    /** Test getCollegeById. */
    test('getCollegeById retrieves correct metadata or undefined if missing', async () => {
        // ID 1 should always be 'castle' based on seeding order
        const college = await CollegesDB.getCollegeById(world.db, '1');
        expect(college).toBeDefined();
        expect(college.name).toBe('castle');

        const nonExistent = await CollegesDB.getCollegeById(world.db, '999999');
        expect(nonExistent).toBeUndefined();
    });
});