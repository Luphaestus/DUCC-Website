const TestWorld = require('../../utils/TestWorld');
const SwimsAPI = require('../../../server/api/users/SwimsAPI');

describe('api/users/SwimsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['swims.manage']);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('user', {});

        new SwimsAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('GET /api/user/swims/leaderboard', async () => {
        const res = await world.as('user').get('/api/user/swims/leaderboard');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('POST /api/user/:id/swims', async () => {
        const userId = world.data.users['user'];
        const res = await world.as('admin').post(`/api/user/${userId}/swims`).send({ count: 5 });
        expect(res.statusCode).toBe(200);
        
        const user = await world.db.get('SELECT swims FROM users WHERE id = ?', [userId]);
        expect(user.swims).toBe(5);
    });
});
