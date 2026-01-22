/**
 * WaitlistAPI.test.js
 * 
 * Functional tests for the Event Waitlist system.
 * Verifies eligibility checks for joining, leaving, and administrative visibility.
 */

const TestWorld = require('../../utils/TestWorld');
const WaitlistAPI = require('../../../server/api/events/WaitlistAPI');
const AttendanceAPI = require('../../../server/api/events/AttendanceAPI');
const EventsAPI = require('../../../server/api/events/EventsAPI');

describe('api/events/WaitlistAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        world.mockGlobalInt('Unauthorized_max_difficulty', 1);

        new WaitlistAPI(world.app, world.db).registerRoutes();
        new AttendanceAPI(world.app, world.db).registerRoutes();
        new EventsAPI(world.app, world.db).registerRoutes();

        await world.createUser('user', { filled_legal_info: 1, difficulty_level: 5 });
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('POST /api/event/:id/waitlist/join (Joining Logic)', () => {
        test('Success: user joins waitlist for a full event', async () => {
            // Setup a full event
            await world.createEvent('FullEvent', { max_attendees: 1, enable_waitlist: 1 });
            const eventId = world.data.events['FullEvent'];
            await world.createUser('other', {});
            await world.joinEvent('other', 'FullEvent');

            const res = await world.as('user').post(`/api/event/${eventId}/waitlist/join`);
            expect(res.statusCode).toBe(200);
        });

        test('Blocked: legal info must be complete to join waitlist', async () => {
            await world.createEvent('FullEvent', { max_attendees: 1, enable_waitlist: 1 });
            const eventId = world.data.events['FullEvent'];
            await world.createUser('illegal_user', { filled_legal_info: 0 });
            
            const res = await world.as('illegal_user').post(`/api/event/${eventId}/waitlist/join`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/legal/i);
        });

        test('Blocked: cannot join waitlist for events restricted by difficulty', async () => {
            // User cannot see the event, so they shouldn't be able to join its waitlist
            await world.createEvent('HardEvent', { difficulty_level: 5, max_attendees: 1, enable_waitlist: 1 });
            const eventId = world.data.events['HardEvent'];
            await world.createUser('beginner', { difficulty_level: 1, filled_legal_info: 1 });
            
            const res = await world.as('beginner').post(`/api/event/${eventId}/waitlist/join`);
            expect(res.statusCode).toBe(401); 
        });

        test('Blocked: cannot join waitlist for events with disabled waitlist', async () => {
            await world.createEvent('NoWaitlistEvent', { max_attendees: 1, enable_waitlist: 0 });
            const eventId = world.data.events['NoWaitlistEvent'];
            await world.createUser('other', {});
            await world.joinEvent('other', 'NoWaitlistEvent');

            const res = await world.as('user').post(`/api/event/${eventId}/waitlist/join`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/disabled/i);
        });
    });

    describe('POST /api/event/:id/waitlist/leave (Exit Logic)', () => {
        test('User successfully removes themselves from the waitlist', async () => {
            await world.createEvent('FullEvent', { max_attendees: 1, enable_waitlist: 1 });
            const eventId = world.data.events['FullEvent'];
            // Manually insert into waitlist
            await world.db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [eventId, world.data.users['user']]);

            const res = await world.as('user').post(`/api/event/${eventId}/waitlist/leave`);
            expect(res.statusCode).toBe(200);
            
            // Verify removal
            const onList = await world.db.get('SELECT 1 FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, world.data.users['user']]);
            expect(onList).toBeUndefined();
        });
    });

    describe('GET /api/event/:id/waitlist (Visibility)', () => {
        test('Success: count is visible to all authorized viewers', async () => {
            await world.createEvent('PublicEvent', { difficulty_level: 1 });
            const eventId = world.data.events['PublicEvent'];
            
            const res = await world.request.get(`/api/event/${eventId}/waitlist`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('count');
            // Full list should NOT be visible to public
            expect(res.body.waitlist).toBeUndefined();
        });

        test('Blocked: guests cannot fetch waitlist data for restricted events', async () => {
            await world.createEvent('HardEvent', { difficulty_level: 5 });
            const eventId = world.data.events['HardEvent'];

            const res = await world.request.get(`/api/event/${eventId}/waitlist`);
            expect(res.statusCode).toBe(401);
        });

        test('Success: Execs see detailed waitlist information', async () => {
            await world.createRole('Admin', []);
            await world.createUser('admin', {}, ['Admin']);
            
            await world.createEvent('E1', { difficulty_level: 1 });
            const eventId = world.data.events['E1'];

            const res = await world.as('admin').get(`/api/event/${eventId}/waitlist`);
            expect(res.statusCode).toBe(200);
            expect(res.body.waitlist).toBeDefined();
        });
    });
});