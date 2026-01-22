const TestWorld = require('../../utils/TestWorld');
const EventsAPI = require('../../../server/api/events/EventsAPI');

describe('api/events/EventsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        world.mockGlobalInt('Unauthorized_max_difficulty', 1);

        new EventsAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /**
     * Helper to test authentication requirements.
     */
    const itRequiresAuth = (method, pathTemplate) => {
        test(`${method.toUpperCase()} ${pathTemplate} - Fail if not logged in`, async () => {
            const res = await world.request[method](pathTemplate.replace(':id', '1').replace(':offset', '0'));
            expect(res.statusCode).toBe(401);
        });
    };

    describe('Security', () => {
        itRequiresAuth('get', '/api/event/:id/canManage');
    });

    describe('GET /api/events/rweek/:offset', () => {
        test('Returns events for valid offset', async () => {
            await world.createEvent('E1');
            await world.createUser('user', { difficulty_level: 5 });
            
            const res = await world.as('user').get('/api/events/rweek/0');
            expect(res.statusCode).toBe(200);
            expect(res.body.events).toBeDefined();
        });

        test('Guest sees limited events based on Unauthorized_max_difficulty', async () => {
            world.mockGlobalInt('Unauthorized_max_difficulty', 1);
            await world.createEvent('HardEvent', { difficulty_level: 5 });
            await world.createEvent('EasyEvent', { difficulty_level: 1 });

            const res = await world.request.get('/api/events/rweek/0');
            expect(res.statusCode).toBe(200);
            const titles = res.body.events.map(e => e.title);
            expect(titles).toContain('EasyEvent');
            expect(titles).not.toContain('HardEvent');
        });
    });

    describe('GET /api/event/:id', () => {
        test('Returns event details when no restrictions', async () => {
            await world.createEvent('PublicEvent', { difficulty_level: 1 });
            const eventId = world.data.events['PublicEvent'];

            const res = await world.request.get(`/api/event/${eventId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.event.title).toBe('PublicEvent');
        });

        test('Fails for guest if event difficulty > Unauthorized_max_difficulty', async () => {
            world.mockGlobalInt('Unauthorized_max_difficulty', 1);
            await world.createEvent('HardEvent', { difficulty_level: 2 });
            const eventId = world.data.events['HardEvent'];

            const res = await world.request.get(`/api/event/${eventId}`);
            expect(res.statusCode).toBe(401);
        });

        test('Fails for user if event difficulty > user difficulty', async () => {
            await world.createUser('beginner', { difficulty_level: 1 });
            await world.createEvent('ProEvent', { difficulty_level: 3 });
            const eventId = world.data.events['ProEvent'];

            const res = await world.as('beginner').get(`/api/event/${eventId}`);
            expect(res.statusCode).toBe(401);
        });

        test('Fails if a tag has min_difficulty > user difficulty', async () => {
            await world.createUser('beginner', { difficulty_level: 1 });
            await world.createEvent('TaggedEvent', { difficulty_level: 1 });
            const eventId = world.data.events['TaggedEvent'];

            await world.createTag('HardTag', { min_difficulty: 3 });
            await world.assignTag('event', 'TaggedEvent', 'HardTag');

            const res = await world.as('beginner').get(`/api/event/${eventId}`);
            expect(res.statusCode).toBe(401);
        });

        test('Success if user meets both event and tag difficulty', async () => {
            await world.createUser('expert', { difficulty_level: 5 });
            await world.createEvent('HardTaggedEvent', { difficulty_level: 3 });
            const eventId = world.data.events['HardTaggedEvent'];

            await world.createTag('MidTag', { min_difficulty: 3 });
            await world.assignTag('event', 'HardTaggedEvent', 'MidTag');

            const res = await world.as('expert').get(`/api/event/${eventId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.event.title).toBe('HardTaggedEvent');
        });

        test('Returns 404 for missing event', async () => {
            const res = await world.request.get('/api/event/999999');
            expect(res.statusCode).toBe(404);
        });
    });

    describe('GET /api/event/:id/canManage', () => {
        let eventId;

        beforeEach(async () => {
            await world.createEvent('ManageTestEvent');
            eventId = world.data.events['ManageTestEvent'];
        });

        test('True if user has event.manage.all', async () => {
            await world.createRole('Admin', ['event.manage.all']);
            await world.createUser('admin', {}, ['Admin']);

            const res = await world.as('admin').get(`/api/event/${eventId}/canManage`);
            expect(res.statusCode).toBe(200);
            expect(res.body.canManage).toBe(true);
        });

        test('True if user has event.manage.scoped and manages event tag', async () => {
            await world.createRole('ScopedRole', ['event.manage.scoped']);
            await world.createUser('scoped_user', {}, ['ScopedRole']);
            
            await world.createTag('T1');
            await world.assignTag('user_managed', 'scoped_user', 'T1');
            await world.assignTag('event', 'ManageTestEvent', 'T1');

            const res = await world.as('scoped_user').get(`/api/event/${eventId}/canManage`);
            expect(res.statusCode).toBe(200);
            expect(res.body.canManage).toBe(true);
        });

        test('False if user has event.manage.scoped but NOT the event tag', async () => {
            await world.createRole('ScopedRole', ['event.manage.scoped']);
            await world.createUser('scoped_user_wrong', {}, ['ScopedRole']);
            
            await world.createTag('OtherTag');
            await world.assignTag('user_managed', 'scoped_user_wrong', 'OtherTag');

            const res = await world.as('scoped_user_wrong').get(`/api/event/${eventId}/canManage`);
            expect(res.statusCode).toBe(200);
            expect(res.body.canManage).toBe(false);
        });

        test('False if user has no permissions', async () => {
            await world.createUser('plain_user', {});

            const res = await world.as('plain_user').get(`/api/event/${eventId}/canManage`);
            expect(res.statusCode).toBe(200);
            expect(res.body.canManage).toBe(false);
        });
    });
});