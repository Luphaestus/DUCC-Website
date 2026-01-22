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

    test('join_waiting_list and is_user_on_waiting_list', async () => {
        const userId = world.data.users['user1'];
        const eventId = world.data.events['Event1'];

        expect((await WaitlistDB.is_user_on_waiting_list(world.db, userId, eventId)).getData()).toBe(false);

        await WaitlistDB.join_waiting_list(world.db, userId, eventId);
        expect((await WaitlistDB.is_user_on_waiting_list(world.db, userId, eventId)).getData()).toBe(true);
    });

    test('get_next_on_waiting_list follows FIFO', async () => {
        const u1 = world.data.users['user1'];
        const u2 = world.data.users['user2'];
        const eventId = world.data.events['Event1'];

        await world.db.run('INSERT INTO event_waiting_list (event_id, user_id, joined_at) VALUES (?, ?, ?)', [eventId, u1, '2025-01-01 10:00:00']);
        await world.db.run('INSERT INTO event_waiting_list (event_id, user_id, joined_at) VALUES (?, ?, ?)', [eventId, u2, '2025-01-01 11:00:00']);

        expect((await WaitlistDB.get_next_on_waiting_list(world.db, eventId)).getData()).toBe(u1);
        
        await WaitlistDB.remove_user_from_waiting_list(world.db, eventId, u1);
        expect((await WaitlistDB.get_next_on_waiting_list(world.db, eventId)).getData()).toBe(u2);
    });

    test('get_waiting_list_position', async () => {
        const u1 = world.data.users['user1'];
        const u2 = world.data.users['user2'];
        const eventId = world.data.events['Event1'];

        await world.db.run('INSERT INTO event_waiting_list (event_id, user_id, joined_at) VALUES (?, ?, ?)', [eventId, u1, '2025-01-01 10:00:00']);
        await world.db.run('INSERT INTO event_waiting_list (event_id, user_id, joined_at) VALUES (?, ?, ?)', [eventId, u2, '2025-01-01 11:00:00']);

        expect((await WaitlistDB.get_waiting_list_position(world.db, eventId, u1)).getData()).toBe(1);
        expect((await WaitlistDB.get_waiting_list_position(world.db, eventId, u2)).getData()).toBe(2);
    });
});
