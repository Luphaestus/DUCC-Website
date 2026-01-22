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
     * Helper to test authentication and permission requirements.
     */
    const itRequiresAuth = (method, pathTemplate) => {
        test(`${method.toUpperCase()} ${pathTemplate} - Fail if not logged in`, async () => {
            const res = await world.request[method](pathTemplate.replace(':id', '1'));
            expect(res.statusCode).toBe(401);
        });
    };

    /**
     * Helper to test common :id parameter validation rules.
     */
    const itValidatesIdParam = (method, pathTemplate, notFoundStatus = 404) => {
        test(`${method.toUpperCase()} ${pathTemplate} - Fail if ID is not a number`, async () => {
            const res = await world.as('user')[method](pathTemplate.replace(':id', 'abc'));
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/integer/i);
        });

        test(`${method.toUpperCase()} ${pathTemplate} - Behavior if event does not exist`, async () => {
            const res = await world.as('user')[method](pathTemplate.replace(':id', '999999'));
            expect(res.statusCode).toBe(notFoundStatus);
        });
    };

    describe('Security and Validation', () => {
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

    describe('GET /api/event/:id/isAttending', () => {
        test('Returns true if attending', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];
            await world.joinEvent('user', 'E1');

            const res = await world.as('user').get(`/api/event/${eventId}/isAttending`);
            expect(res.statusCode).toBe(200);
            expect(res.body.isAttending).toBe(true);
        });

        test('Returns false if not attending', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];

            const res = await world.as('user').get(`/api/event/${eventId}/isAttending`);
            expect(res.statusCode).toBe(200);
            expect(res.body.isAttending).toBe(false);
        });
    });

    describe('GET /api/event/:id/isPaying', () => {
        test('Returns true if paid, false otherwise', async () => {
            await world.createEvent('E1', { upfront_cost: 10 });
            const eventId = world.data.events['E1'];
            const userId = world.data.users['user'];

            let res = await world.as('user').get(`/api/event/${eventId}/isPaying`);
            expect(res.body.isPaying).toBe(false);

            await world.addTransaction('user', -10, 'Pay', eventId);
            const tx = await world.db.get('SELECT id FROM transactions WHERE event_id = ?', [eventId]);
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, payment_transaction_id) VALUES (?, ?, ?)', [eventId, userId, tx.id]);

            res = await world.as('user').get(`/api/event/${eventId}/isPaying`);
            expect(res.body.isPaying).toBe(true);
        });
    });

    describe('GET /api/event/:id/coachCount', () => {
        test('Returns correct counts (0, 1, 12)', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];

            let res = await world.as('user').get(`/api/event/${eventId}/coachCount`);
            expect(res.body.count).toBe(0);

            await world.createUser('c1', { is_instructor: 1 });
            await world.joinEvent('c1', 'E1');
            res = await world.as('user').get(`/api/event/${eventId}/coachCount`);
            expect(res.body.count).toBe(1);

            for(let i=2; i<=12; i++) {
                await world.createUser(`c${i}`, { is_instructor: 1 });
                await world.joinEvent(`c${i}`, 'E1');
            }
            res = await world.as('user').get(`/api/event/${eventId}/coachCount`);
            expect(res.body.count).toBe(12);
        });
    });

    describe('GET /api/event/:id/canJoin', () => {
        test('Reflects attendance rules (coach, legal, membership)', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];

            // No coach yet
            let res = await world.as('user').get(`/api/event/${eventId}/canJoin`);
            expect(res.body.canJoin).toBe(false);
            expect(res.body.reason).toMatch(/coach/i);

            // Add coach
            await world.createUser('c', { is_instructor: 1 });
            await world.joinEvent('c', 'E1');

            res = await world.as('user').get(`/api/event/${eventId}/canJoin`);
            expect(res.body.canJoin).toBe(true);

            // Incomplete legal
            await world.db.run('UPDATE users SET filled_legal_info = 0 WHERE id = ?', [world.data.users['user']]);
            res = await world.as('user').get(`/api/event/${eventId}/canJoin`);
            expect(res.body.canJoin).toBe(false);
            expect(res.body.reason).toMatch(/legal/i);
        });
    });

    describe('POST /api/event/:id/attend', () => {
        test('Success for normal member', async () => {
            await world.createEvent('E1');
            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'E1');

            const res = await world.as('user').post(`/api/event/${world.data.events['E1']}/attend`);
            expect(res.statusCode).toBe(200);
        });

        test('Fail if event is canceled', async () => {
            await world.createEvent('CanceledEvent', { is_canceled: 1 });
            
            const res = await world.as('user').post(`/api/event/${world.data.events['CanceledEvent']}/attend`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/canceled/i);
        });

        test('Fail if event is in the past', async () => {
            const past = new Date(Date.now() - 86400000).toISOString();
            await world.createEvent('PastEvent', { start: past, end: past });

            const res = await world.as('user').post(`/api/event/${world.data.events['PastEvent']}/attend`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/ended|started/i);
        });

        test('Fail if restricted by tag whitelist', async () => {
            await world.createEvent('RestrictedEvent');
            await world.createTag('SecretTag', { join_policy: 'whitelist' });
            await world.assignTag('event', 'RestrictedEvent', 'SecretTag');
            
            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'RestrictedEvent');

            const res = await world.as('user').post(`/api/event/${world.data.events['RestrictedEvent']}/attend`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/Restricted access/i);
        });

        test('Success if whitelisted for restricted event', async () => {
            await world.createEvent('WhitelistedEvent');
            await world.createTag('WhiteTag', { join_policy: 'whitelist' });
            await world.assignTag('event', 'WhitelistedEvent', 'WhiteTag');
            
            await world.createUser('user_ok', { filled_legal_info: 1, is_member: 1 });
            const userId = world.data.users['user_ok'];
            const tagId = world.data.tags['WhiteTag'];
            
            await world.db.run('INSERT INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagId, userId]);

            await world.createUser('coach', { is_instructor: 1 });
            await world.joinEvent('coach', 'WhitelistedEvent');

            const res = await world.as('user_ok').post(`/api/event/${world.data.events['WhitelistedEvent']}/attend`);
            expect(res.statusCode).toBe(200);
        });

        test('Fail if no coach is attending', async () => {
            await world.createEvent('NoCoachEvent');

            const res = await world.as('user').post(`/api/event/${world.data.events['NoCoachEvent']}/attend`);
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/No coach/i);
        });

        test('Coach can join event even if no other coach is there', async () => {
            await world.createEvent('EmptyEvent');
            await world.createUser('coach_alone', { is_instructor: 1, filled_legal_info: 1, is_member: 1 });

            const res = await world.as('coach_alone').post(`/api/event/${world.data.events['EmptyEvent']}/attend`);
            expect(res.statusCode).toBe(200);
        });

        test('Free sessions decrease for non-members', async () => {
            await world.createEvent('FreeEvent');
            await world.createUser('coach_f', { is_instructor: 1 });
            await world.joinEvent('coach_f', 'FreeEvent');
            await world.createUser('nonmember', { filled_legal_info: 1, is_member: 0, free_sessions: 3 });

            const res = await world.as('nonmember').post(`/api/event/${world.data.events['FreeEvent']}/attend`);
            expect(res.statusCode).toBe(200);

            const user = await world.db.get('SELECT free_sessions FROM users WHERE first_name = "nonmember"');
            expect(user.free_sessions).toBe(2);
        });

        test('Balance decreases for paid events', async () => {
            await world.createEvent('PaidEvent', { upfront_cost: 15.0 });
            await world.createUser('coach_p', { is_instructor: 1 });
            await world.joinEvent('coach_p', 'PaidEvent');

            const res = await world.as('user').post(`/api/event/${world.data.events['PaidEvent']}/attend`);
            expect(res.statusCode).toBe(200);

            const balance = await world.db.get('SELECT SUM(amount) as b FROM transactions WHERE user_id = ?', [world.data.users['user']]);
            expect(balance.b).toBe(-15.0);
        });

        test('Balance does not change if already paid and not refunded', async () => {
            const pastCutoff = new Date(Date.now() - 3600000).toISOString(); 
            await world.createEvent('AlreadyPaidEvent', { upfront_cost: 10.0, upfront_refund_cutoff: pastCutoff });
            const eventId = world.data.events['AlreadyPaidEvent'];
            const userId = world.data.users['user'];

            await world.createUser('coach_rep', { is_instructor: 1 });
            await world.joinEvent('coach_rep', 'AlreadyPaidEvent');

            await world.as('user').post(`/api/event/${eventId}/attend`);
            let balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(balance.b).toBe(-10.0);

            await world.as('user').post(`/api/event/${eventId}/leave`);
            balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(balance.b).toBe(-10.0); 

            const res = await world.as('user').post(`/api/event/${eventId}/attend`);
            expect(res.statusCode).toBe(200);
            
            balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userId]);
            expect(balance.b).toBe(-10.0); 
        });

        test('Balance DOES change if re-joining after being refunded (refunded by replacement)', async () => {
            const pastCutoff = new Date(Date.now() - 3600000).toISOString(); 
            await world.createEvent('RefundReplacementEvent', { upfront_cost: 10.0, upfront_refund_cutoff: pastCutoff });
            const eventId = world.data.events['RefundReplacementEvent'];
            const userIdA = world.data.users['user'];
            
            await world.createUser('user_b', { filled_legal_info: 1, is_member: 1 });

            await world.createUser('coach_replace', { is_instructor: 1 });
            await world.joinEvent('coach_replace', 'RefundReplacementEvent');

            await world.as('user').post(`/api/event/${eventId}/attend`);
            
            await world.as('user').post(`/api/event/${eventId}/leave`);
            let balanceA = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userIdA]);
            expect(balanceA.b).toBe(-10.0);

            await world.as('user_b').post(`/api/event/${eventId}/attend`);
            balanceA = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userIdA]);
            expect(balanceA.b).toBe(0); 

            const res = await world.as('user').post(`/api/event/${eventId}/attend`);
            expect(res.statusCode).toBe(200);
            
            balanceA = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [userIdA]);
            expect(balanceA.b).toBe(-10.0);
        });
    });

    describe('POST /api/event/:id/leave', () => {
        test('Free sessions increase (refunded) for non-members', async () => {
            await world.createEvent('E1');
            await world.createUser('nonmember_l', { is_member: 0, free_sessions: 2 });
            await world.joinEvent('nonmember_l', 'E1');

            const res = await world.as('nonmember_l').post(`/api/event/${world.data.events['E1']}/leave`);
            expect(res.statusCode).toBe(200);

            const user = await world.db.get('SELECT free_sessions FROM users WHERE first_name = "nonmember_l"');
            expect(user.free_sessions).toBe(3);
        });

        test('Money is refunded if no cutoff exists', async () => {
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

        test('Money is refunded if leaving BEFORE cutoff', async () => {
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

        test('Money is NOT refunded if leaving AFTER cutoff', async () => {
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

        test('Event is canceled if the last coach leaves', async () => {
            await world.createEvent('CoachEvent_l');
            const eventId = world.data.events['CoachEvent_l'];
            
            await world.createUser('coach_l', { is_instructor: 1 });
            await world.joinEvent('coach_l', 'CoachEvent_l');
            await world.joinEvent('user', 'CoachEvent_l');

            const res = await world.as('coach_l').post(`/api/event/${eventId}/leave`);
            expect(res.statusCode).toBe(200);

            const event = await world.db.get('SELECT is_canceled FROM events WHERE id = ?', [eventId]);
            expect(event.is_canceled).toBe(1);
        });

        test('Leaves successfully and promotes next user from waitlist (and charges them if paid)', async () => {
            await world.createEvent('FullPaidEvent', { max_attendees: 1, upfront_cost: 15.0 });
            const eventId = world.data.events['FullPaidEvent'];
            
            await world.createUser('attendee', { filled_legal_info: 1, is_member: 1 });
            await world.joinEvent('attendee', 'FullPaidEvent');

            await world.createUser('waitlist_user', { filled_legal_info: 1, is_member: 1 });
            const waitUserId = world.data.users['waitlist_user'];
            await world.db.run('INSERT INTO event_waiting_list (event_id, user_id) VALUES (?, ?)', [eventId, waitUserId]);

            const res = await world.as('attendee').post(`/api/event/${eventId}/leave`);
            expect(res.statusCode).toBe(200);

            const attendeeRecord = await world.db.get('SELECT payment_transaction_id FROM event_attendees WHERE event_id = ? AND user_id = ? AND is_attending = 1', [eventId, waitUserId]);
            expect(attendeeRecord).toBeDefined();
            expect(attendeeRecord.payment_transaction_id).not.toBeNull();

            const onWaitlist = await world.db.get('SELECT 1 FROM event_waiting_list WHERE event_id = ? AND user_id = ?', [eventId, waitUserId]);
            expect(onWaitlist).toBeUndefined();

            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [waitUserId]);
            expect(balance.b).toBe(-15.0);
        });
    });

    describe('GET /api/event/:id/attendees', () => {
        test('Normal user sees attendee list (basic info)', async () => {
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];
            await world.joinEvent('user', 'E1');

            const res = await world.as('user').get(`/api/event/${eventId}/attendees`);
            expect(res.statusCode).toBe(200);
            expect(res.body.attendees.length).toBe(1);
            expect(res.body.attendees[0]).toHaveProperty('first_name');
        });

        test('Admin sees attendee history (detailed info)', async () => {
            await world.createRole('Admin', []);
            await world.createUser('admin', {}, ['Admin']);
            
            await world.createEvent('E1');
            const eventId = world.data.events['E1'];
            await world.joinEvent('user', 'E1');

            const res = await world.as('admin').get(`/api/event/${eventId}/attendees`);
            expect(res.statusCode).toBe(200);
            expect(res.body.attendees[0]).toHaveProperty('is_attending');
        });
    });
});