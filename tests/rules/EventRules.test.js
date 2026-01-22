const TestWorld = require('../utils/TestWorld');
const EventRules = require('../../server/rules/EventRules');

describe('rules/EventRules', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('canViewEvent', () => {
        test('Guest visibility vs Unauthorized_max_difficulty', () => {
            world.mockGlobalInt('Unauthorized_max_difficulty', 2);
            
            expect(EventRules.canViewEvent({ difficulty_level: 2 }, null)).toBe(true);
            expect(EventRules.canViewEvent({ difficulty_level: 3 }, null)).toBe(false);
        });

        test('User visibility vs difficulty_level', () => {
            const user = { difficulty_level: 3 };
            expect(EventRules.canViewEvent({ difficulty_level: 3 }, user)).toBe(true);
            expect(EventRules.canViewEvent({ difficulty_level: 4 }, user)).toBe(false);
        });

        test('Tag visibility constraints', () => {
            const user = { difficulty_level: 2 };
            const event = { 
                difficulty_level: 1, 
                tags: [{ min_difficulty: 3 }] 
            };
            expect(EventRules.canViewEvent(event, user)).toBe(false);

            const eventOk = { 
                difficulty_level: 1, 
                tags: [{ min_difficulty: 2 }, { min_difficulty: 1 }] 
            };
            expect(EventRules.canViewEvent(eventOk, user)).toBe(true);
        });
    });

    describe('canJoinEvent', () => {
        let event, user;

        beforeEach(async () => {
            await world.createEvent('Joinable', { 
                signup_required: 1, 
                max_attendees: 10,
                start: new Date(Date.now() + 86400000).toISOString(),
                end: new Date(Date.now() + 172800000).toISOString()
            });
            event = await world.db.get('SELECT * FROM events WHERE title = "Joinable"');
            
            await world.createUser('member', { filled_legal_info: 1, is_member: 1 });
            user = await world.db.get('SELECT * FROM users WHERE first_name = "member"');

            // Default coach attending
            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'Joinable');
        });

        test('Basic successful join', async () => {
            const status = await EventRules.canJoinEvent(world.db, event, user);
            expect(status.isError()).toBe(false);
        });

        test('Fail if not logged in', async () => {
            const status = await EventRules.canJoinEvent(world.db, event, null);
            expect(status.getStatus()).toBe(401);
        });

        test('Fail if signup not required', async () => {
            await world.db.run('UPDATE events SET signup_required = 0 WHERE id = ?', [event.id]);
            const updated = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            const status = await EventRules.canJoinEvent(world.db, updated, user);
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/not required/i);
        });

        test('Fail if canceled', async () => {
            await world.db.run('UPDATE events SET is_canceled = 1 WHERE id = ?', [event.id]);
            const updated = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            const status = await EventRules.canJoinEvent(world.db, updated, user);
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/canceled/i);
        });

        test('Timing checks (started/ended)', async () => {
            // Started
            await world.db.run('UPDATE events SET start = ? WHERE id = ?', [new Date(Date.now() - 1000).toISOString(), event.id]);
            let updated = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            let status = await EventRules.canJoinEvent(world.db, updated, user);
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/started/i);

            // Ended
            await world.db.run('UPDATE events SET start = ?, end = ? WHERE id = ?', [new Date(Date.now() - 2000).toISOString(), new Date(Date.now() - 1000).toISOString(), event.id]);
            updated = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            status = await EventRules.canJoinEvent(world.db, updated, user);
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/ended/i);
        });

        test('Capacity checks', async () => {
            await world.db.run('UPDATE events SET max_attendees = 1 WHERE id = ?', [event.id]);
            const updated = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            // One coach is already attending, so it's full
            const status = await EventRules.canJoinEvent(world.db, updated, user);
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/full/i);
        });

        test('Coach requirement', async () => {
            await world.db.run('DELETE FROM event_attendees');
            const status = await EventRules.canJoinEvent(world.db, event, user);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/coach/i);

            // Coach can join empty event
            const coach = await world.db.get('SELECT * FROM users WHERE first_name = "coach"');
            const coachStatus = await EventRules.canJoinEvent(world.db, event, coach);
            expect(coachStatus.isError()).toBe(false);
        });

        test('Legal info check', async () => {
            await world.db.run('UPDATE users SET filled_legal_info = 0 WHERE id = ?', [user.id]);
            const updatedUser = await world.db.get('SELECT * FROM users WHERE id = ?', [user.id]);
            const status = await EventRules.canJoinEvent(world.db, event, updatedUser);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/legal/i);
        });

        test('Debt check', async () => {
            world.mockGlobalFloat('MinMoney', -10.0);
            await world.addTransaction('member', -15.0);
            const updatedUser = await world.db.get('SELECT * FROM users WHERE id = ?', [user.id]);
            const status = await EventRules.canJoinEvent(world.db, event, updatedUser);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/debts/i);
        });

        test('Membership / Free Sessions check', async () => {
            await world.createUser('nonmember_no_sessions', { is_member: 0, free_sessions: 0, filled_legal_info: 1 });
            const nmUser = await world.db.get('SELECT * FROM users WHERE first_name = "nonmember_no_sessions"');
            
            const status = await EventRules.canJoinEvent(world.db, event, nmUser);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/sessions/i);
        });

        test('Tag Policies: Whitelist', async () => {
            await world.createTag('Secret', { join_policy: 'whitelist' });
            const tag = await world.db.get('SELECT id FROM tags WHERE name = "Secret"');
            await world.db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [event.id, tag.id]);
            
            const updatedEvent = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            updatedEvent.tags = [await world.db.get('SELECT * FROM tags WHERE id = ?', [tag.id])];

            let status = await EventRules.canJoinEvent(world.db, updatedEvent, user);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/Restricted/i);

            // Whitelist them
            await world.db.run('INSERT INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tag.id, user.id]);
            status = await EventRules.canJoinEvent(world.db, updatedEvent, user);
            expect(status.isError()).toBe(false);
        });

        test('Already attending check', async () => {
            await world.joinEvent('member', 'Joinable');
            const status = await EventRules.canJoinEvent(world.db, event, user);
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/Already attending/i);
        });
    });
});