const TestWorld = require('../utils/TestWorld');
const EventsDB = require('../../server/db/eventsDB');
const TransactionsDB = require('../../server/db/transactionDB');

describe('db/eventsDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('createEvent and getEventByIdAdmin', async () => {
        const eventData = {
            title: 'Test Event',
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            difficulty_level: 1,
            upfront_cost: 0
        };
        const result = await EventsDB.createEvent(world.db, eventData);
        expect(result.getStatus()).toBe(200);

        const eventRes = await EventsDB.getEventByIdAdmin(world.db, result.getData().id);
        expect(eventRes.getData().title).toBe('Test Event');
    });

    test('cancelEvent refunds transaction and free sessions', async () => {
        await world.createUser('user', { is_member: 0, free_sessions: 1 });
        const userId = world.data.users['user'];

        const eventRes = await EventsDB.createEvent(world.db, {
            title: 'Paid Event',
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            difficulty_level: 1,
            upfront_cost: 10.00
        });
        const eventId = eventRes.getData().id;

        // User pays
        const txRes = await TransactionsDB.add_transaction(world.db, userId, -10.00, 'Payment', eventId);
        const transactionId = txRes.getData();
        
        // Add attendee
        await world.db.run('INSERT INTO event_attendees (event_id, user_id, payment_transaction_id) VALUES (?, ?, ?)', [eventId, userId, transactionId]);

        // Cancel event
        const result = await EventsDB.cancelEvent(world.db, eventId);
        expect(result.getStatus()).toBe(200);

        // Verify refund
        const balanceRes = await TransactionsDB.get_balance(world.db, userId);
        expect(balanceRes.getData()).toBe(0); // -10 + 10 = 0

        // Verify session restored
        const user = await world.db.get('SELECT free_sessions FROM users WHERE id = ?', [userId]);
        expect(user.free_sessions).toBe(2);
    });
});