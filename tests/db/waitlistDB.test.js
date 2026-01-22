/**
 * waitlistDB.test.js
 * 
 * Database layer tests for the event waitlist system.
 * Verifies joining, FIFO (First-In-First-Out) ordering, and position calculation.
 */

const TestWorld = require('../utils/TestWorld');
const WaitlistDB = require('../../server/db/waitlistDB');

describe('db/waitlistDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        await world.createUser('user1', {});
        await world.createUser('user2', {});
        await world.createEvent('Event1');
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('join_waiting_list and is_user_on_waiting_list workflow', async () => {
        const userId = world.data.users['user1'];
        const eventId = world.data.events['Event1'];

        // Initial state
        expect((await WaitlistDB.is_user_on_waiting_list(world.db, userId, eventId)).getData()).toBe(false);

        // Join
        await WaitlistDB.join_waiting_list(world.db, userId, eventId);
        
        // Verify
        expect((await WaitlistDB.is_user_on_waiting_list(world.db, userId, eventId)).getData()).toBe(true);
    });

    /**
     * Critical: promotions must be fair based on the time joined.
     */
    test('get_next_on_waiting_list correctly follows FIFO (First-In-First-Out) logic', async () => {
        const u1 = world.data.users['user1'];
        const u2 = world.data.users['user2'];
        const eventId = world.data.events['Event1'];

        // Manually insert with explicit timestamps to ensure ordering
        await world.db.run('INSERT INTO event_waiting_list (event_id, user_id, joined_at) VALUES (?, ?, ?)', [eventId, u1, '2025-01-01 10:00:00']);
        await world.db.run('INSERT INTO event_waiting_list (event_id, user_id, joined_at) VALUES (?, ?, ?)', [eventId, u2, '2025-01-01 11:00:00']);

        // U1 should be first
        expect((await WaitlistDB.get_next_on_waiting_list(world.db, eventId)).getData()).toBe(u1);
        
        // After U1 is removed, U2 should be first
        await WaitlistDB.remove_user_from_waiting_list(world.db, eventId, u1);
        expect((await WaitlistDB.get_next_on_waiting_list(world.db, eventId)).getData()).toBe(u2);
    });

    /**
     * Test calculation of numerical rank within the list.
     */
    test('get_waiting_list_position correctly calculates user rank', async () => {
        const u1 = world.data.users['user1'];
        const u2 = world.data.users['user2'];
        const eventId = world.data.events['Event1'];

        await world.db.run('INSERT INTO event_waiting_list (event_id, user_id, joined_at) VALUES (?, ?, ?)', [eventId, u1, '2025-01-01 10:00:00']);
        await world.db.run('INSERT INTO event_waiting_list (event_id, user_id, joined_at) VALUES (?, ?, ?)', [eventId, u2, '2025-01-01 11:00:00']);

        expect((await WaitlistDB.get_waiting_list_position(world.db, eventId, u1)).getData()).toBe(1);
        expect((await WaitlistDB.get_waiting_list_position(world.db, eventId, u2)).getData()).toBe(2);
    });
});