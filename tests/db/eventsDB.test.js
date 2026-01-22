/**
 * eventsDB.test.js
 * 
 * Database layer tests for event management.
 * Covers event creation, cancellation with automatic attendee refunds,
 * and business logic related to signup requirements and capacity.
 */

const TestWorld = require('../utils/TestWorld');
const EventsDB = require('../../server/db/eventsDB');
const TransactionsDB = require('../../server/db/transactionDB');
const EventRules = require('../../server/rules/EventRules');

describe('db/eventsDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('createEvent and getEventByIdAdmin lifecycle', async () => {
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

    /**
     * Critical functionality: canceling an event must restore user sessions and balances.
     */
    test('cancelEvent automatically refunds transactions and restores free sessions', async () => {
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

        // Simulate user enrollment and payment
        const txRes = await TransactionsDB.add_transaction(world.db, userId, -10.00, 'Payment', eventId);
        const transactionId = txRes.getData();
        await world.db.run('INSERT INTO event_attendees (event_id, user_id, payment_transaction_id) VALUES (?, ?, ?)', [eventId, userId, transactionId]);

        // Action: Cancel the event
        const result = await EventsDB.cancelEvent(world.db, eventId);
        expect(result.getStatus()).toBe(200);

        // Verification 1: Refund transaction exists and balance is back to zero
        const balanceRes = await TransactionsDB.get_balance(world.db, userId);
        expect(balanceRes.getData()).toBe(0);

        // Verification 2: Consumed session credit is restored to the non-member
        const user = await world.db.get('SELECT free_sessions FROM users WHERE id = ?', [userId]);
        expect(user.free_sessions).toBe(2);
    });

    describe('Business Logic: signup_required vs max_attendees', () => {
        /**
         * Rule: It doesn't make sense to have a capacity limit if signup is disabled.
         */
        test('cannot create event with max_attendees > 0 if signup_required is false', async () => {
            const eventData = {
                title: 'Invalid Logic Event',
                start: new Date().toISOString(),
                end: new Date().toISOString(),
                difficulty_level: 1,
                max_attendees: 10,
                signup_required: false,
                upfront_cost: 0
            };
            const result = await EventsDB.createEvent(world.db, eventData);
            expect(result.getStatus()).toBe(400);
            expect(result.getMessage()).toBe('Max attendees cannot be set if signup is not required');
        });

        test('can create event with max_attendees = 0 if signup_required is false', async () => {
            const eventData = {
                title: 'Public Drop-in Event',
                start: new Date().toISOString(),
                end: new Date().toISOString(),
                difficulty_level: 1,
                max_attendees: 0,
                signup_required: false,
                upfront_cost: 0
            };
            const result = await EventsDB.createEvent(world.db, eventData);
            expect(result.getStatus()).toBe(200);
        });

        test('cannot update existing event to state with max_attendees > 0 and no signup', async () => {
            const eventData = {
                title: 'Initial Event',
                start: new Date().toISOString(),
                end: new Date().toISOString(),
                difficulty_level: 1,
                max_attendees: 0,
                signup_required: true,
                upfront_cost: 0
            };
            const createRes = await EventsDB.createEvent(world.db, eventData);
            const eventId = createRes.getData().id;

            const updateData = {
                ...eventData,
                max_attendees: 10,
                signup_required: false
            };
            const result = await EventsDB.updateEvent(world.db, eventId, updateData);
            expect(result.getStatus()).toBe(400);
        });

        /**
         * Test how the rule layer handles events where signup is disabled.
         */
        test('EventRules.canJoinEvent correctly blocks joining if signup_required is false', async () => {
            const eventData = {
                title: 'No Signup Event',
                start: new Date(Date.now() + 10000).toISOString(),
                end: new Date(Date.now() + 20000).toISOString(),
                difficulty_level: 1,
                max_attendees: 0,
                signup_required: false,
                upfront_cost: 0
            };
            const createRes = await EventsDB.createEvent(world.db, eventData);
            const eventId = createRes.getData().id;
            const event = (await EventsDB.getEventByIdAdmin(world.db, eventId)).getData();

            await world.createUser('user', { filled_legal_info: 1 });
            const user = (await world.db.get('SELECT * FROM users WHERE id = ?', [world.data.users['user']]));

            const result = await EventRules.canJoinEvent(world.db, event, user);
            expect(result.getStatus()).toBe(400);
            expect(result.getMessage()).toBe('Signup is not required for this event');
        });
    });
});