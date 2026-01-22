/**
 * AttendanceAPI.test.js
 * 
 * Functional tests for the Event Attendance API.
 * Covers joining/leaving events, coach requirements, payment logic, and automatic waitlist promotion.
 */

const TestWorld = require('../../utils/TestWorld');
const AttendanceAPI = require('../../../server/api/events/AttendanceAPI');
const EventsAPI = require('../../../server/api/events/EventsAPI');
const WaitlistAPI = require('../../../server/api/events/WaitlistAPI');

describe('api/events/AttendanceAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        world.mockGlobalInt('Unauthorized_max_difficulty', 5);
        world.mockGlobalFloat('MinMoney', -10.0);

        new AttendanceAPI(world.app, world.db).registerRoutes();
        new EventsAPI(world.app, world.db).registerRoutes();
        new WaitlistAPI(world.app, world.db).registerRoutes();

        await world.createUser('user', { filled_legal_info: 1, is_member: 1 });
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /**
     * Helper to test authentication requirements for specific routes.
     */
    const itRequiresAuth = (method, pathTemplate) => {
        test(`${method.toUpperCase()} ${pathTemplate} - Fail if guest user`, async () => {
            const res = await world.request[method](pathTemplate.replace(':id', '1'));
            expect(res.statusCode).toBe(401);
        });
    };

    /**
     * Helper to test standard :id parameter validation logic.
     */
    const itValidatesIdParam = (method, pathTemplate, notFoundStatus = 404) => {
        test(`${method.toUpperCase()} ${pathTemplate} - Fail if ID is non-numeric`, async () => {
            const res = await world.as('user')[method](pathTemplate.replace(':id', 'abc'));
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/integer/i);
        });

        test(`${method.toUpperCase()} ${pathTemplate} - Handle request for non-existent ID`, async () => {
            const res = await world.as('user')[method](pathTemplate.replace(':id', '999999'));
            expect(res.statusCode).toBe(notFoundStatus);
        });
    };

    describe('General Endpoint Security and Parameter Validation', () => {
        const protectedRoutes = [
            ['get', '/api/event/:id/isAttending'],
            ['get', '/api/event/:id/isPaying'],
            ['get', '/api/event/:id/canJoin'],
            ['post', '/api/event/:id/attend'],
            ['post', '/api/event/:id/leave'],
            ['get', '/api/event/:id/attendees']
        ];

        protectedRoutes.forEach(([method, path]) => itRequiresAuth(method, path));

        itValidatesIdParam('get', '/api/event/:id/isAttending');
        itValidatesIdParam('get', '/api/event/:id/isPaying', 200); 
        itValidatesIdParam('get', '/api/event/:id/canJoin');
        itValidatesIdParam('post', '/api/event/:id/attend');
        itValidatesIdParam('post', '/api/event/:id/leave', 400);
        itValidatesIdParam('get', '/api/event/:id/attendees');
    });

    describe('GET /api/event/:id/isAttending (Status Verification)', () => {
        test('Returns true for active attendees', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];
            await world.joinEvent('user', 'E1');

            const res = await world.as('user').get(`/api/event/${eventId}/isAttending`);
            expect(res.statusCode).toBe(200);
            expect(res.body.isAttending).toBe(true);
        });

        test('Returns false for non-attendees', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];

            const res = await world.as('user').get(`/api/event/${eventId}/isAttending`);
            expect(res.statusCode).toBe(200);
            expect(res.body.isAttending).toBe(false);
        });
    });

    describe('GET /api/event/:id/isPaying (Financial Status)', () => {
        test('Correctly identifies if a user has a linked payment transaction', async () => {
            await world.createEvent('E1', { upfront_cost: 10 });
            const eventId = world.data.events['E1'];
            const userId = world.data.users['user'];

            let res = await world.as('user').get(`/api/event/${eventId}/isPaying`);
            expect(res.body.isPaying).toBe(false);

            // Simulate a completed payment transaction
            await world.addTransaction('user', -10, 'Manual Payment', eventId);
            const tx = await world.db.get('SELECT id FROM transactions WHERE event_id = ?', [eventId]);
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, payment_transaction_id) VALUES (?, ?, ?)', [eventId, userId, tx.id]);

            res = await world.as('user').get(`/api/event/${eventId}/isPaying`);
            expect(res.body.isPaying).toBe(true);
        });
    });

    describe('GET /api/event/:id/coachCount (Safety Auditing)', () => {
        test('Correctly aggregates attending instructor counts', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];

            let res = await world.as('user').get(`/api/event/${eventId}/coachCount`);
            expect(res.body.count).toBe(0);

            // Add one coach
            await world.createUser('c1', { is_instructor: 1 });
            await world.joinEvent('c1', 'E1');
            res = await world.as('user').get(`/api/event/${eventId}/coachCount`);
            expect(res.body.count).toBe(1);

            // Add many more coaches
            for(let i=2; i<=12; i++) {
                await world.createUser(`c${i}`, { is_instructor: 1 });
                await world.joinEvent(`c${i}`, 'E1');
            }
            res = await world.as('user').get(`/api/event/${eventId}/coachCount`);
            expect(res.body.count).toBe(12);
        });
    });

    describe('GET /api/event/:id/canJoin (Pre-check Logic)', () => {
        /**
         * Verifies that the canJoin endpoint correctly previews business rules.
         */
        it('should enforce coach safety requirements', async () => {
            await world.createEvent('SafetyEvent');
            const eventId = world.data.events['SafetyEvent'];
            
            await world.createUser('coach_a', { is_instructor: 1, filled_legal_info: 1, is_member: 1 });
            await world.createUser('member_b', { is_instructor: 0, filled_legal_info: 1, is_member: 1 });
            await world.createUser('member_c', { is_instructor: 0, filled_legal_info: 0, is_member: 1 });

            // Blocked: No coach attending
            const res1 = await world.as('member_b').post(`/api/event/${eventId}/attend`);
            expect(res1.status).toBe(403);

            // Allowed: Coach added
            await world.as('coach_a').post(`/api/event/${eventId}/attend`);
            const res2 = await world.as('member_b').post(`/api/event/${eventId}/attend`);
            expect(res2.status).toBe(200);

            // Blocked: Incomplete legal info
            const res3 = await world.as('member_c').post(`/api/event/${eventId}/attend`);
            expect(res3.status).toBe(403);
        });
    });

    describe('POST /api/event/:id/attend (Joining Logic)', () => {
        test('Successful registration for a standard event', async () => {
            await world.createEvent('E1');
            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'E1');

            const res = await world.as('user').post(`/api/event/${world.data.events['E1']}/attend`);
            expect(res.statusCode).toBe(200);
        });

        test('Blocked: cannot join canceled events', async () => {
            await world.createEvent('CanceledEvent', { is_canceled: 1 });
            
            const res = await world.as('user').post(`/api/event/${world.data.events['CanceledEvent']}/attend`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/canceled/i);
        });

        test('Blocked: cannot join past events', async () => {
            const past = new Date(Date.now() - 86400000).toISOString();
            await world.createEvent('PastEvent', { start: past, end: past });

            const res = await world.as('user').post(`/api/event/${world.data.events['PastEvent']}/attend`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/ended|started/i);
        });

        test('Blocked: whitelist-only tag policy enforcement', async () => {
            await world.createEvent('RestrictedEvent');
            await world.createTag('SecretTag', { join_policy: 'whitelist' });
            await world.assignTag('event', 'RestrictedEvent', 'SecretTag');
            
            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'RestrictedEvent');

            const res = await world.as('user').post(`/api/event/${world.data.events['RestrictedEvent']}/attend`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/Restricted access/i);
        });

        test('Success: joining whitelisted restricted event', async () => {
            await world.createEvent('WhitelistedEvent');
            await world.createTag('WhiteTag', { join_policy: 'whitelist' });
            await world.assignTag('event', 'WhitelistedEvent', 'WhiteTag');
            
            await world.createUser('user_ok', { filled_legal_info: 1, is_member: 1 });
            const userId = world.data.users['user_ok'];
            const tagId = world.data.tags['WhiteTag'];
            
            // Add user to whitelist
            await world.db.run('INSERT INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagId, userId]);

            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'WhitelistedEvent');

            const res = await world.as('user_ok').post(`/api/event/${world.data.events['WhitelistedEvent']}/attend`);
            expect(res.statusCode).toBe(200);
        });

        test('Blocked: non-instructors require at least one instructor present', async () => {
            await world.createEvent('NoCoachEvent');

            const res = await world.as('user').post(`/api/event/${world.data.events['NoCoachEvent']}/attend`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/No coach/i);
        });

        test('Instructors can join events solo', async () => {
            await world.createEvent('EmptyEvent');
            await world.createUser('coach_alone', { is_instructor: 1, filled_legal_info: 1, is_member: 1 });

            const res = await world.as('coach_alone').post(`/api/event/${world.data.events['EmptyEvent']}/attend`);
            expect(res.statusCode).toBe(200);
        });

        test('Automatic credit consumption for non-members', async () => {
            await world.createEvent('FreeEvent');
            await world.createUser('coach_f', { is_instructor: 1 });
            await world.joinEvent('coach_f', 'FreeEvent');
            await world.createUser('nonmember', { filled_legal_info: 1, is_member: 0, free_sessions: 3 });

            const res = await world.as('nonmember').post(`/api/event/${world.data.events['FreeEvent']}/attend`);
            expect(res.statusCode).toBe(200);

            // Verification: session count decreased
            const user = await world.db.get('SELECT free_sessions FROM users WHERE first_name = "nonmember"');
            expect(user.free_sessions).toBe(2);
        });

        test('Automatic balance deduction for paid events', async () => {
            await world.createEvent('PaidEvent', { upfront_cost: 15.0 });
            await world.createUser('coach_p', { is_instructor: 1 });
            await world.joinEvent('coach_p', 'PaidEvent');

            const res = await world.as('user').post(`/api/event/${world.data.events['PaidEvent']}/attend`);
            expect(res.statusCode).toBe(200);

            // Verification: negative transaction recorded
            const balance = await world.db.get('SELECT SUM(amount) as b FROM transactions WHERE user_id = ?', [world.data.users['user']]);
            expect(balance.b).toBe(-15.0);
        });

        it('should handle refunds and re-joins correctly', async () => {
            const pastCutoff = new Date(Date.now() - 3600000).toISOString(); 
            await world.createEvent('RefundEvent', { upfront_cost: 10.0, upfront_refund_cutoff: pastCutoff });
            const eventId = world.data.events['RefundEvent'];
            
            await world.createUser('user_refund', { filled_legal_info: 1, is_member: 1 });
            const userId = world.data.users['user_refund'];
            
            await world.createUser('coach_refund', { is_instructor: 1 });
            await world.joinEvent('coach_refund', 'RefundEvent');

            // Join and pay
            await world.as('user_refund').post(`/api/event/${eventId}/attend`);
            const bal1 = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(bal1.b).toBe(-10.0);

            // Leave after cutoff (no refund)
            await world.as('user_refund').post(`/api/event/${eventId}/leave`);
            const bal2 = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(bal2.b).toBe(-10.0);

            // Re-join (should NOT pay again)
            await world.as('user_refund').post(`/api/event/${eventId}/attend`);
            const bal3 = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(bal3.b).toBe(-10.0);
        });

        /**
         * Transfer logic: If User A pays but leaves, and User B takes their spot, User A gets a refund.
         */
        test('Balance is restored if a spot is effectively "purchased" by another user', async () => {
            const pastCutoff = new Date(Date.now() - 3600000).toISOString(); 
            await world.createEvent('RefundReplacementEvent', { upfront_cost: 10.0, upfront_refund_cutoff: pastCutoff });
            const eventId = world.data.events['RefundReplacementEvent'];
            const userIdA = world.data.users['user'];
            
            await world.createUser('user_b', { filled_legal_info: 1, is_member: 1 });
            await world.createUser('coach_replace', { is_instructor: 1 });
            await world.joinEvent('coach_replace', 'RefundReplacementEvent');

            // User A joins and pays
            await world.as('user').post(`/api/event/${eventId}/attend`);
            
            // User A leaves after cutoff (stays at -10)
            await world.as('user').post(`/api/event/${eventId}/leave`);
            let balanceA = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userIdA]);
            expect(balanceA.b).toBe(-10.0);

            // User B joins (takes User A's paid slot)
            await world.as('user_b').post(`/api/event/${eventId}/attend`);
            // User A should now be at 0 (refunded automatically)
            balanceA = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userIdA]);
            expect(balanceA.b).toBe(0); 

            // User A joins again (now they must pay again as their previous slot was transferred)
            const res = await world.as('user').post(`/api/event/${eventId}/attend`);
            expect(res.statusCode).toBe(200);
            
            balanceA = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userIdA]);
            expect(balanceA.b).toBe(-10.0);
        });
    });

    describe('POST /api/event/:id/leave (Exit Logic)', () => {
        test('Non-member free sessions are refunded upon exit', async () => {
            await world.createEvent('E1');
            await world.createUser('nonmember_l', { is_member: 0, free_sessions: 2 });
            await world.joinEvent('nonmember_l', 'E1');

            const res = await world.as('nonmember_l').post(`/api/event/${world.data.events['E1']}/leave`);
            expect(res.statusCode).toBe(200);

            const user = await world.db.get('SELECT free_sessions FROM users WHERE first_name = "nonmember_l"');
            expect(user.free_sessions).toBe(3);
        });

        test('Automatic refund if no cutoff date exists', async () => {
            await world.createEvent('PaidEvent_l', { upfront_cost: 10.0 });
            const eventId = world.data.events['PaidEvent_l'];
            const userId = world.data.users['user'];

            await world.addTransaction('user', -10.0, 'Payment', eventId);
            const tx = await world.db.get('SELECT id FROM transactions WHERE user_id = ?', [userId]);
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, payment_transaction_id) VALUES (?, ?, ?)', [eventId, userId, tx.id]);

            const res = await world.as('user').post(`/api/event/${eventId}/leave`);
            expect(res.statusCode).toBe(200);

            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(balance.b).toBe(0); 
        });

        test('Success: monetary refund when leaving BEFORE cutoff', async () => {
            const futureCutoff = new Date(Date.now() + 86400000).toISOString(); 
            await world.createEvent('CutoffEvent_l', { upfront_cost: 10.0, upfront_refund_cutoff: futureCutoff });
            await world.createUser('user_early', { is_member: 1 });
            const userId = world.data.users['user_early'];
            const eventId = world.data.events['CutoffEvent_l'];

            await world.addTransaction('user_early', -10.0, 'Payment', eventId);
            const tx = await world.db.get('SELECT id FROM transactions WHERE user_id = ?', [userId]);
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, payment_transaction_id) VALUES (?, ?, ?)', [eventId, userId, tx.id]);

            const res = await world.as('user_early').post(`/api/event/${eventId}/leave`);
            expect(res.statusCode).toBe(200);

            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(balance.b).toBe(0);
        });

        test('Denied: no refund when leaving AFTER cutoff', async () => {
            const pastCutoff = new Date(Date.now() - 3600000).toISOString();
            await world.createEvent('LateEvent_l', { upfront_cost: 10.0, upfront_refund_cutoff: pastCutoff });
            await world.createUser('user_late', { is_member: 1 });
            const userId = world.data.users['user_late'];
            const eventId = world.data.events['LateEvent_l'];

            await world.addTransaction('user_late', -10.0, 'Payment', eventId);
            const tx = await world.db.get('SELECT id FROM transactions WHERE user_id = ?', [userId]);
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, payment_transaction_id) VALUES (?, ?, ?)', [eventId, userId, tx.id]);

            const res = await world.as('user_late').post(`/api/event/${eventId}/leave`);
            expect(res.statusCode).toBe(200);

            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(balance.b).toBe(-10.0); 
        });

        test('Safety: event is canceled if the last attending coach leaves', async () => {
            await world.createEvent('CoachEvent_l');
            const eventId = world.data.events['CoachEvent_l'];
            
            await world.createUser('coach_l', { is_instructor: 1 });
            await world.joinEvent('coach_l', 'CoachEvent_l');
            await world.joinEvent('user', 'CoachEvent_l');

            const res = await world.as('coach_l').post(`/api/event/${eventId}/leave`);
            expect(res.statusCode).toBe(200);

            // Verification: event is now canceled
            const event = await world.db.get('SELECT is_canceled FROM events WHERE id = ?', [eventId]);
            expect(event.is_canceled).toBe(1);
        });

        /**
         * Waitlist promotion logic: if someone leaves a full event, the next person in line should join.
         */
        test('Waitlist: automatically promotes and charges the next user when a spot opens', async () => {
            await world.createEvent('FullPaidEvent', { max_attendees: 1, upfront_cost: 15.0 });
            const eventId = world.data.events['FullPaidEvent'];
            
            // Attendee occupying the only spot
            await world.createUser('attendee', { filled_legal_info: 1, is_member: 1 });
            await world.joinEvent('attendee', 'FullPaidEvent');

            // User waiting in line
            await world.createUser('waitlist_user', { filled_legal_info: 1, is_member: 1 });
            const waitUserId = world.data.users['waitlist_user'];
            await world.db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [eventId, waitUserId]);

            // Action: Attendee leaves
            const res = await world.as('attendee').post(`/api/event/${eventId}/leave`);
            expect(res.statusCode).toBe(200);

            // Verification 1: Waitlist user is now an attendee
            const attendeeRecord = await world.db.get('SELECT payment_transaction_id FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1', [eventId, waitUserId]);
            expect(attendeeRecord).toBeDefined();
            expect(attendeeRecord.payment_transaction_id).not.toBeNull();

            // Verification 2: Waitlist user is removed from waiting list
            const onWaitlist = await world.db.get('SELECT 1 FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, waitUserId]);
            expect(onWaitlist).toBeUndefined();

            // Verification 3: Waitlist user was automatically charged
            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [waitUserId]);
            expect(balance.b).toBe(-15.0);
        });
    });

    describe('GET /api/event/:id/attendees (Listings)', () => {
        test('Normal user sees a simplified attendee list', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];
            await world.joinEvent('user', 'E1');

            const res = await world.as('user').get(`/api/event/${eventId}/attendees`);
            expect(res.statusCode).toBe(200);
            expect(res.body.attendees.length).toBe(1);
            // Verify PII exclusion
            expect(res.body.attendees[0]).toHaveProperty('first_name');
            expect(res.body.attendees[0]).not.toHaveProperty('balance');
        });

        test('Exec sees full attendee history and detailed data', async () => {
            await world.createRole('Admin', []);
            await world.createUser('admin', {}, ['Admin']);
            
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];
            await world.joinEvent('user', 'E1');

            const res = await world.as('admin').get(`/api/event/${eventId}/attendees`);
            expect(res.statusCode).toBe(200);
            // Execs see the internal 'is_attending' flag
            expect(res.body.attendees[0]).toHaveProperty('is_attending');
        });
    });
});