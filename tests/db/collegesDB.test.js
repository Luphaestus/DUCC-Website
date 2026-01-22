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

    test('getAll returns colleges', async () => {
        const res = await CollegesDB.getAll(world.db);
        expect(res.getStatus()).toBe(200);
        expect(res.getData().length).toBeGreaterThan(0);
    });

    test('getCollegeByName', async () => {
        const college = await CollegesDB.getCollegeById(world.db, '1');
        expect(college).toBeDefined();
        expect(college.name).toBe('castle');

        const nonExistent = await CollegesDB.getCollegeById(world.db, '12343');
        expect(nonExistent).toBeUndefined();
    });
});
