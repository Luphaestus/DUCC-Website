/**
 * EventRules.test.js
 * 
 * Logic tests for event-related business rules.
 * Extensively covers event visibility (difficulty/tags) and participation (joining) requirements.
 */

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

    describe('canViewEvent (Visibility Logic)', () => {
        /**
         * System Logic: guests are restricted by the 'Unauthorized_max_difficulty' setting.
         */
        test('Guest visibility is bounded by the global unauthorized limit', async () => {
            world.mockGlobalInt('Unauthorized_max_difficulty', 2);
            
            expect(await EventRules.canViewEvent(world.db, { difficulty_level: 2 }, null)).toBe(true);
            expect(await EventRules.canViewEvent(world.db, { difficulty_level: 3 }, null)).toBe(false);
        });

        test('User visibility is bounded by their own difficulty level', async () => {
            const user = { difficulty_level: 3 };
            expect(await EventRules.canViewEvent(world.db, { difficulty_level: 3 }, user)).toBe(true);
            expect(await EventRules.canViewEvent(world.db, { difficulty_level: 4 }, user)).toBe(false);
        });

        /**
         * System Logic: even if event difficulty is OK, tags can impose stricter limits.
         */
        test('Tag difficulty constraints can override event-level accessibility', async () => {
            const user = { difficulty_level: 2 };
            
            // Event OK (1 <= 2), but Tag NOT OK (3 > 2)
            const event = { 
                difficulty_level: 1, 
                tags: [{ min_difficulty: 3 }] 
            };
            expect(await EventRules.canViewEvent(world.db, event, user)).toBe(false);

            // Both OK
            const eventOk = { 
                difficulty_level: 1, 
                tags: [{ min_difficulty: 2 }, { min_difficulty: 1 }] 
            };
            expect(await EventRules.canViewEvent(world.db, eventOk, user)).toBe(true);
        });
    });

    describe('canJoinEvent (Participation Logic)', () => {
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

            // Default: add a coach so members can join
            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'Joinable');
        });

        test('Success case: standard member joining an open event', async () => {
            const status = await EventRules.canJoinEvent(world.db, event, user);
            expect(status.isError()).toBe(false);
        });

        test('Denied: guest attempts to join', async () => {
            const status = await EventRules.canJoinEvent(world.db, event, null);
            expect(status.getStatus()).toBe(401);
        });

        test('Denied: joining an event where signup is disabled', async () => {
            await world.db.run('UPDATE events SET signup_required = 0 WHERE id = ?', [event.id]);
            const updated = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            const status = await EventRules.canJoinEvent(world.db, updated, user);
            
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/not required/i);
        });

        test('Denied: joining a canceled event', async () => {
            await world.db.run('UPDATE events SET is_canceled = 1 WHERE id = ?', [event.id]);
            const updated = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            const status = await EventRules.canJoinEvent(world.db, updated, user);
            
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/canceled/i);
        });

        /**
         * Ensures users can only join future events.
         */
        test('Denied: joining events that have already started or ended', async () => {
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

        test('Denied: event is at maximum capacity', async () => {
            await world.db.run('UPDATE events SET max_attendees = 1 WHERE id = ?', [event.id]);
            const updated = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            // The coach is already attending, so the 1 spot is taken
            const status = await EventRules.canJoinEvent(world.db, updated, user);
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/full/i);
        });

        /**
         * Safety Rule: Non-instructors cannot attend if no instructor is signed up.
         */
        test('Denied: safety constraint - no coach attending', async () => {
            await world.db.run('DELETE FROM event_attendees');
            const status = await EventRules.canJoinEvent(world.db, event, user);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/coach/i);

            // But an instructor CAN join an empty event
            const coach = await world.db.get('SELECT * FROM users WHERE first_name = "coach"');
            const coachStatus = await EventRules.canJoinEvent(world.db, event, coach);
            expect(coachStatus.isError()).toBe(false);
        });

        test('Denied: legal/medical info is incomplete', async () => {
            await world.db.run('UPDATE users SET filled_legal_info = 0 WHERE id = ?', [user.id]);
            const updatedUser = await world.db.get('SELECT * FROM users WHERE id = ?', [user.id]);
            const status = await EventRules.canJoinEvent(world.db, event, updatedUser);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/legal/i);
        });

        /**
         * Standing Rule: users with high debt are blocked from joining new events.
         */
        test('Denied: user standing - outstanding debts exceed limit', async () => {
            world.mockGlobalFloat('MinMoney', -10.0);
            await world.addTransaction('member', -15.0);
            const updatedUser = await world.db.get('SELECT * FROM users WHERE id = ?', [user.id]);
            const status = await EventRules.canJoinEvent(world.db, event, updatedUser);
            
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/debts/i);
        });

        /**
         * Credit Rule: non-members must have remaining free session credits.
         */
        test('Denied: non-member has exhausted all free session credits', async () => {
            await world.createUser('nonmember_empty', { is_member: 0, free_sessions: 0, filled_legal_info: 1 });
            const nmUser = await world.db.get('SELECT * FROM users WHERE first_name = "nonmember_empty"');
            
            const status = await EventRules.canJoinEvent(world.db, event, nmUser);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/sessions/i);
        });

        /**
         * Verifies whitelist enforcement for restricted tags.
         */
        test('Restricted Tags: correctly enforces whitelist joining policy', async () => {
            await world.createTag('SecretTeam', { join_policy: 'whitelist' });
            const tag = await world.db.get('SELECT id FROM tags WHERE name = "SecretTeam"');
            await world.db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [event.id, tag.id]);
            
            const updatedEvent = await world.db.get('SELECT * FROM events WHERE id = ?', [event.id]);
            updatedEvent.tags = [await world.db.get('SELECT * FROM tags WHERE id = ?', [tag.id])];

            // Initially blocked
            let status = await EventRules.canJoinEvent(world.db, updatedEvent, user);
            expect(status.getStatus()).toBe(403);
            expect(status.getMessage()).toMatch(/Restricted/i);

            // Add user to whitelist
            await world.db.run('INSERT INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tag.id, user.id]);
            
            // Now allowed
            status = await EventRules.canJoinEvent(world.db, updatedEvent, user);
            expect(status.isError()).toBe(false);
        });

        test('Denied: user is already signed up for the event', async () => {
            await world.joinEvent('member', 'Joinable');
            const status = await EventRules.canJoinEvent(world.db, event, user);
            expect(status.getStatus()).toBe(400);
            expect(status.getMessage()).toMatch(/Already attending/i);
        });
    });
});