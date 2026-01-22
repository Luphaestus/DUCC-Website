const TestWorld = require('../utils/TestWorld');
const Rules = require('../../server/misc/rules');

describe('misc/rules', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('validate', () => {
        test('Email validation', () => {
            expect(Rules.validate('email', 'test.user@durham.ac.uk')).toBeNull();
            expect(Rules.validate('email', 'test@gmail.com')).toBeDefined();
        });

        test('Name validation', () => {
            expect(Rules.validate('name', 'John Doe')).toBeNull();
            expect(Rules.validate('name', 'John123')).toBeDefined();
        });
    });

    describe('canViewEvent', () => {
        test('Difficulty limit for guest', () => {
            world.mockGlobalInt('Unauthorized_max_difficulty', 1);
            const event = { difficulty_level: 2 };
            expect(Rules.canViewEvent(event, null)).toBe(false);
            
            const eventEasy = { difficulty_level: 1 };
            expect(Rules.canViewEvent(eventEasy, null)).toBe(true);
        });

        test('Difficulty limit for user', () => {
            const user = { difficulty_level: 2 };
            const eventHard = { difficulty_level: 3 };
            expect(Rules.canViewEvent(eventHard, user)).toBe(false);
            
            const eventOk = { difficulty_level: 2 };
            expect(Rules.canViewEvent(eventOk, user)).toBe(true);
        });
    });

    describe('canJoinEvent', () => {
        let event, user;

        beforeEach(async () => {
            await world.createEvent('Event1', { max_attendees: 10, upfront_cost: 0 });
            event = await world.db.get('SELECT * FROM events WHERE title = "Event1"');
            
            await world.createUser('user', { filled_legal_info: 1, is_member: 1 });
            user = await world.db.get('SELECT * FROM users WHERE first_name = "user"');

            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'Event1');
        });

        test('Allow valid member', async () => {
            const res = await Rules.canJoinEvent(world.db, event, user);
            expect(res.isError()).toBe(false);
        });

        test('Fail if debt exceeded', async () => {
            world.mockGlobalFloat('MinMoney', -10.0);
            await world.addTransaction('user', -15.0);
            
            const res = await Rules.canJoinEvent(world.db, event, user);
            expect(res.isError()).toBe(true);
            expect(res.getMessage()).toBe('Outstanding debts');
        });

        test('Fail if event full', async () => {
            await world.db.run('UPDATE events SET max_attendees = 1 WHERE id = ?', [event.id]);
            const updatedEvent = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            const res = await Rules.canJoinEvent(world.db, updatedEvent, user);
            expect(res.isError()).toBe(true);
            expect(res.getMessage()).toBe('Event is full');
        });

        test('Fail if no coach', async () => {
            await world.db.run('DELETE FROM event_attendees');
            const res = await Rules.canJoinEvent(world.db, event, user);
            expect(res.isError()).toBe(true);
            expect(res.getMessage()).toBe('No coach attending');
        });
    });
});
