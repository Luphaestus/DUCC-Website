/**
 * AdminEventsAPI.test.js
 * 
 * Functional tests for the Admin Event Management API.
 * Covers scoped visibility, creation authorization (tag matches), deletion restrictions,
 * and automatic attendee refunds upon event cancellation.
 */

import TestWorld from '../../utils/TestWorld.js';
import AdminEventsAPI from '../../../server/api/admin/AdminEventsAPI.js';
import TagsAPI from '../../../server/api/TagsAPI.js';

describe('api/admin/AdminEventsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['event.manage.all', 'event.read.all', 'event.write.all', 'event.delete']);
        await world.createRole('ScopedAdmin', ['event.manage.scoped', 'event.read.scoped']);
        await world.createRole('Editor', ['event.write.all', 'event.read.all']); // Creation/Edit but no deletion
        
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('scoped', {}, ['ScopedAdmin']);
        await world.createUser('editor', {}, ['Editor']);
        await world.createUser('user', {});

        new AdminEventsAPI(world.app, world.db).registerRoutes();
        new TagsAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/admin/events (Administrative Scoping)', () => {
        /**
         * Admins with 'event.read.all' should see every event in the system.
         */
        test('Global admin sees all events', async () => {
            await world.createEvent('Event1');
            await world.createEvent('Event2');
            
            const res = await world.as('admin').get('/api/admin/events');
            expect(res.statusCode).toBe(200);
            expect(res.body.events).toHaveLength(2);
            expect(res.body).toHaveProperty('totalPages');
            expect(res.body).toHaveProperty('currentPage');
        });

        /**
         * Scoped admins should only see events linked to tags they manage.
         */
        test('Scoped admin sees only events within their managed tags', async () => {
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

        test('Standard user is denied access to admin listings', async () => {
            const res = await world.as('user').get('/api/admin/events');
            expect(res.statusCode).toBe(403);
        });
    });

    describe('POST /api/admin/event (Authorization Logic)', () => {
        test('Global admin can create event with any arbitrary tag', async () => {
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

        /**
         * Scoped admins can only create events if they manage the tags they are assigning.
         */
        test('Scoped admin restricted to creating events with tags they manage', async () => {
            await world.createTag('ManagedTag');
            await world.createTag('SecretTag');
            await world.assignTag('user_managed', 'scoped', 'ManagedTag');

            // Success case: using a managed tag
            const res1 = await world.as('scoped').post('/api/admin/event').send({
                title: 'Ok Event', start: '2025-01-01', end: '2025-01-01', difficulty_level: 1, upfront_cost: 0,
                tags: [world.data.tags['ManagedTag']]
            });
            expect(res1.statusCode).toBe(200);

            // Failure case: using an unmanaged tag
            const res2 = await world.as('scoped').post('/api/admin/event').send({
                title: 'Bad Event', start: '2025-01-01', end: '2025-01-01', difficulty_level: 1, upfront_cost: 0,
                tags: [world.data.tags['SecretTag']]
            });
            expect(res2.statusCode).toBe(403);
        });

        test('Event inherits highest priority tag image if no image_id provided', async () => {
            const lowFileId = await world.createFile('LowImg');
            const highFileId = await world.createFile('HighImg');
            
            await world.createTag('Low', { priority: 1, image_id: lowFileId });
            await world.createTag('High', { priority: 10, image_id: highFileId });
            const lowId = world.data.tags['Low'];
            const highId = world.data.tags['High'];

            const res = await world.as('admin').post('/api/admin/event').send({
                title: 'Default Image Event',
                start: '2025-01-01',
                end: '2025-01-01',
                difficulty_level: 1,
                upfront_cost: 0,
                tags: [lowId, highId]
            });

            expect(res.statusCode).toBe(200);
            const eventId = res.body.data.id;
            
            const getRes = await world.as('admin').get(`/api/admin/event/${eventId}`);
            expect(getRes.body.image_url).toBe(`/api/files/${highFileId}/download?view=true`);
        });

        test('POST /api/admin/event/:id/reset-image - Clear event custom image', async () => {
            const fileId = await world.createFile('TestImg');
            const eventId = await world.createEvent('ImageEvent', { image_id: fileId });
            
            const res = await world.as('admin').post(`/api/admin/event/${eventId}/reset-image`);
            expect(res.statusCode).toBe(200);

            const event = await world.db.get('SELECT image_id FROM events WHERE id = ?', [eventId]);
            expect(event.image_id).toBeNull();
        });

        test('Image Fallback Chain: Event -> Tag -> Global Default', async () => {
            const globalDefault = '/images/misc/ducc.png';

            // 1. Tag with image
            const tagFileId = await world.createFile('TagImg');
            await world.createTag('Nature', { priority: 10, image_id: tagFileId });
            const tagId = world.data.tags['Nature'];
            const tagImageUrl = `/api/files/${tagFileId}/download?view=true`;

            // 2. Event with its own image
            const eventFileId = await world.createFile('EventImg');
            const eventId = await world.createEvent('Hiking', { 
                image_id: eventFileId
            });
            await world.assignTag('event', 'Hiking', 'Nature');

            // Step 1: Verify event image
            let res = await world.as('admin').get(`/api/admin/event/${eventId}`);
            expect(res.body.image_url).toBe(`/api/files/${eventFileId}/download?view=true`);

            // Step 2: Remove event image, verify fallback to tag image
            await world.as('admin').post(`/api/admin/event/${eventId}/reset-image`);
            res = await world.as('admin').get(`/api/admin/event/${eventId}`);
            expect(res.body.image_url).toBe(tagImageUrl);

            // Step 3: Remove tag image, verify fallback to global default
            await world.as('admin').post(`/api/tags/${tagId}/reset-image`);
            res = await world.as('admin').get(`/api/admin/event/${eventId}`);
            expect(res.body.image_url).toBe(globalDefault);
        });
    });

    describe('DELETE /api/admin/event/:id (Safety Constraints)', () => {
        test('Editors without explicit delete permission are blocked', async () => {
            await world.createEvent('DeleteMe');
            const eventId = world.data.events['DeleteMe'];

            const res = await world.as('editor').delete(`/api/admin/event/${eventId}`);
            expect(res.statusCode).toBe(403);
        });

        /**
         * To maintain data integrity and financial records, events that have passed cannot be deleted.
         */
        test('Cannot delete events that have already started/happened', async () => {
            const past = new Date(Date.now() - 86400000).toISOString();
            await world.createEvent('PastEvent', { start: past });
            const eventId = world.data.events['PastEvent'];

            const res = await world.as('admin').delete(`/api/admin/event/${eventId}`);
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/past events/i);
        });

        test('Success for full admin on future event deletion', async () => {
            const future = new Date(Date.now() + 86400000).toISOString();
            await world.createEvent('FutureEvent', { start: future });
            const eventId = world.data.events['FutureEvent'];

            const res = await world.as('admin').delete(`/api/admin/event/${eventId}`);
            expect(res.statusCode).toBe(200);
        });
    });

    describe('POST /api/admin/event/:id/cancel (Refund Logic)', () => {
        /**
         * Complex workflow test:
         * Create paid event.
         * Enroll a guest (uses free session).
         * Enroll a member (pays upfront cost).
         * Admin cancels event.
         * Verify guest gets session back and member gets money back.
         */
        test('Automatically refunds all active attendees upon administrative cancellation', async () => {
            const eventId = await world.createEvent('PaidEvent', { upfront_cost: 15 });
            
            // Enrollment 1: Non-member guest
            await world.createUser('guest_user', { is_member: 0, free_sessions: 3 });
            const guestId = world.data.users['guest_user'];
            await world.db.run('UPDATE users SET free_sessions = 2 WHERE id = ?', [guestId]);
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, is_attending) VALUES (?, ?, 1)', [eventId, guestId]);

            // Enrollment 2: Member with upfront payment
            await world.createUser('member_user', { is_member: 1 });
            const memberId = world.data.users['member_user'];
            const txRes = await world.db.run('INSERT INTO transactions (user_id, amount, description, event_id) VALUES (?, ?, ?, ?)', 
                [memberId, -15, 'Payment', eventId]);
            const txId = txRes.lastID;
            await world.db.run('INSERT INTO event_attendees (event_id, user_id, is_attending, payment_transaction_id) VALUES (?, ?, 1, ?)', 
                [eventId, memberId, txId]);

            // Action: Admin cancellation
            const res = await world.as('admin').post(`/api/admin/event/${eventId}/cancel`);
            expect(res.statusCode).toBe(200);

            // Verification 1: Guest session restored
            const guest = await world.db.get('SELECT free_sessions FROM users WHERE id = ?', [guestId]);
            expect(guest.free_sessions).toBe(3);

            // Verification 2: Member balance restored
            const balance = await world.db.get('SELECT SUM(amount) as b FROM transactions WHERE user_id = ?', [memberId]);
            expect(balance.b).toBe(0);
            
            // Verification 3: Refund record exists
            const refundTx = await world.db.get('SELECT * FROM transactions WHERE user_id = ? AND amount = 15', [memberId]);
            expect(refundTx).toBeDefined();
            expect(refundTx.description).toMatch(/refund/i);
        });
    });
});
