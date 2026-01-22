/**
 * collegesDB.test.js
 * 
 * Database layer tests for Durham college data.
 * Verifies retrieval of college metadata and lookup by ID.
 */

const TestWorld = require('../utils/TestWorld');
const CollegesDB = require('../../server/db/collegesDB');

describe('db/collegesDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /**
     * Test that all pre-seeded colleges are returned.
     */
    test('getAll returns the canonical list of colleges', async () => {
        const res = await CollegesDB.getAll(world.db);
        expect(res.getStatus()).toBe(200);
        expect(res.getData().length).toBeGreaterThan(0);
    });

    /**
     * Test direct lookup by unique ID.
     */
    test('getCollegeById retrieves correct metadata or undefined if missing', async () => {
        // ID 1 should always be 'castle' based on seeding order
        const college = await CollegesDB.getCollegeById(world.db, '1');
        expect(college).toBeDefined();
        expect(college.name).toBe('castle');

        const nonExistent = await CollegesDB.getCollegeById(world.db, '999999');
        expect(nonExistent).toBeUndefined();
    });
});