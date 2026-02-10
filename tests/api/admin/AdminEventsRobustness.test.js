/**
 * AdminEventsRobustness.test.js
 * 
 * Robustness and edge-case tests for Admin Events API.
 */

import TestWorld from '../../utils/TestWorld.js';
import AdminEventsAPI from '../../../server/api/admin/AdminEventsAPI.js';

describe('api/admin/AdminEventsRobustness', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        await world.createRole('Admin', ['event.manage.all', 'event.read.all', 'event.write.all']);
        await world.createUser('admin', {}, ['Admin']);
        new AdminEventsAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('Invalid Inputs', () => {
        test('GET /api/admin/events with negative page/limit', async () => {
            const res = await world.as('admin').get('/api/admin/events?page=-1&limit=-10');
            expect(res.statusCode).toBe(200); // Should handle gracefully
            const body = JSON.parse(res.body);
            expect(body.currentPage).toBeGreaterThanOrEqual(1);
        });

        test('POST /api/admin/event with invalid dates', async () => {
            const res = await world.as('admin').post('/api/admin/event', {
                title: 'Bad Date Event',
                start: 'not-a-date',
                end: 'definitely-not-a-date',
                difficulty_level: 1,
                upfront_cost: 0
            });
            // This might fail at DB level or validation level depending on implementation
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
        });

        test('GET /api/admin/event/:id with non-existent numeric ID', async () => {
            const res = await world.as('admin').get('/api/admin/event/999999');
            expect(res.statusCode).toBe(404);
        });

        test('GET /api/admin/event/:id with non-numeric string ID', async () => {
            const res = await world.as('admin').get('/api/admin/event/abc-123');
            expect(res.statusCode).toBe(404);
        });
    });

    describe('Unauthorized Access to Specific Endpoints', () => {
        test('Normal user cannot duplicate event', async () => {
            await world.createUser('user', {});
            const eventId = await world.createEvent('Test Event');
            const res = await world.as('user').post(`/api/admin/event/${eventId}/duplicate`);
            expect(res.statusCode).toBe(403);
        });

        test('Normal user cannot publish staged events', async () => {
            await world.createUser('user', {});
            const res = await world.as('user').post('/api/admin/events/publish-staged');
            expect(res.statusCode).toBe(403);
        });
    });
});
