const TestWorld = require('../utils/TestWorld');
const CollegesAPI = require('../../server/api/CollegesAPI');

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

    test('GET /api/colleges works for everyone', async () => {
        const res1 = await world.as('user').get('/api/colleges');
        expect(res1.statusCode).toBe(200);
        expect(res1.body.length).toBeGreaterThan(0);

        const res2 = await world.request.get('/api/colleges');
        expect(res2.statusCode).toBe(200);
        expect(res2.body.length).toBeGreaterThan(0);
    });
});