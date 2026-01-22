const TestWorld = require('../../utils/TestWorld');
const AdminEventsAPI = require('../../../server/api/admin/AdminEventsAPI');

describe('api/admin/AdminEventsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['event.manage.all', 'event.read.all', 'event.write.all']);
        await world.createRole('ScopedAdmin', ['event.manage.scoped', 'event.read.scoped']);
        await world.createRole('Editor', ['event.write.all', 'event.read.all']); // Can create/edit but not delete
        
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('scoped', {}, ['ScopedAdmin']);
        await world.createUser('editor', {}, ['Editor']);
        await world.createUser('user', {});

        new AdminEventsAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/admin/events', () => {
        test('Full admin sees all events', async () => {
            await world.createEvent('Event1');
            await world.createEvent('Event2');
            
            const res = await world.as('admin').get('/api/admin/events');
            expect(res.statusCode).toBe(200);
            expect(res.body.events).toHaveLength(2);
            expect(res.body).toHaveProperty('totalPages');
            expect(res.body).toHaveProperty('currentPage');
        });

        test('Scoped admin sees only managed tags', async () => {
            await world.createTag('T1');
            await world.assignTag('user_managed', 'scoped', 'T1');

            await world.createEvent('ManagedEvent');
            await world.assignTag('event', 'ManagedEvent', 'T1');
            await world.createEvent('UnmanagedEvent');

            const res = await world.as('scoped').get('/api/admin/events');
            expect(res.statusCode).toBe(200);
            expect(res.body.events).toHaveLength(1);
            expect(res.body.events[0].title).toBe('ManagedEvent');
        });

        test('Regular user is forbidden', async () => {
            const res = await world.as('user').get('/api/admin/events');
            expect(res.statusCode).toBe(403);
        });
    });

    describe('POST /api/admin/event', () => {
        test('Full admin can create event with any tag', async () => {
            await world.createTag('T1');
            const tagId = world.data.tags['T1'];

            const res = await world.as('admin').post('/api/admin/event').send({
                title: 'New Event',
                start: '2025-01-01',
                end: '2025-01-01',
                difficulty_level: 1,
                upfront_cost: 0,
                tags: [tagId]
            });
            expect(res.statusCode).toBe(200);
        });

        test('Scoped admin can only create event if they manage the tags', async () => {
            await world.createTag('ManagedTag');
            await world.createTag('SecretTag');
            await world.assignTag('user_managed', 'scoped', 'ManagedTag');

            const res1 = await world.as('scoped').post('/api/admin/event').send({
                title: 'Ok Event', start: '2025-01-01', end: '2025-01-01', difficulty_level: 1, upfront_cost: 0,
                tags: [world.data.tags['ManagedTag']]
            });
            expect(res1.statusCode).toBe(200);

            const res2 = await world.as('scoped').post('/api/admin/event').send({
                title: 'Bad Event', start: '2025-01-01', end: '2025-01-01', difficulty_level: 1, upfront_cost: 0,
                tags: [world.data.tags['SecretTag']]
            });
            expect(res2.statusCode).toBe(403);
        });
    });

    describe('DELETE /api/admin/event/:id', () => {
        test('Editor cannot delete even if they can write', async () => {
            await world.createEvent('DeleteMe');
            const eventId = world.data.events['DeleteMe'];

            const res = await world.as('editor').delete(`/api/admin/event/${eventId}`);
            expect(res.statusCode).toBe(403);
        });

        test('Cannot delete past events', async () => {
            const past = new Date(Date.now() - 86400000).toISOString();
            await world.createEvent('PastEvent', { start: past });
            const eventId = world.data.events['PastEvent'];

            const res = await world.as('admin').delete(`/api/admin/event/${eventId}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/past events/i);
        });

        test('Success for admin on future event', async () => {
            const future = new Date(Date.now() + 86400000).toISOString();
            await world.createEvent('FutureEvent', { start: future });
            const eventId = world.data.events['FutureEvent'];

            const res = await world.as('admin').delete(`/api/admin/event/${eventId}`);
            expect(res.statusCode).toBe(200);
        });
    });

    describe('POST /api/admin/event/:id/cancel', () => {
        test('Refunds attendees on cancellation', async () => {
            const eventId = await world.createEvent('PaidEvent', { upfront_cost: 15 });
            
            await world.createUser('guest_user', { is_member: 0, free_sessions: 3 });
            const guestId = world.data.users['guest_user'];
            
            await world.db.run('UPDATE users SET free_sessions = 2 WHERE id = ?', [guestId]);
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, is_attending) VALUES (?, ?, 1)', [eventId, guestId]);

            await world.createUser('member_user', { is_member: 1 });
            const memberId = world.data.users['member_user'];
            
            const txRes = await world.db.run('INSERT INTO transactions (user_id, amount, description, event_id) VALUES (?, ?, ?, ?)', 
                [memberId, -15, 'Payment', eventId]);
            const txId = txRes.lastID;
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, is_attending, payment_transaction_id) VALUES (?, ?, 1, ?)', 
                [eventId, memberId, txId]);

            const res = await world.as('admin').post(`/api/admin/event/${eventId}/cancel`);
            expect(res.statusCode).toBe(200);

            const guest = await world.db.get('SELECT free_sessions FROM users WHERE id = ?', [guestId]);
            expect(guest.free_sessions).toBe(3);

            const balance = await world.db.get('SELECT SUM(amount) as b FROM transactions WHERE user_id = ?', [memberId]);
            expect(balance.b).toBe(0);
            
            const refundTx = await world.db.get('SELECT * FROM transactions WHERE user_id = ? AND amount = 15', [memberId]);
            expect(refundTx).toBeDefined();
            expect(refundTx.description).toMatch(/refund/i);
        });
    });
});