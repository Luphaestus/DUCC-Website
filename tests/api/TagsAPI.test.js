/**
 * TagsAPI.test.js
 * 
 * Functional tests for the Tag Management API.
 * Covers tag CRUD operations, whitelist management, and user-specific tag visibility.
 */

const TestWorld = require('../utils/TestWorld');
const TagsAPI = require('../../server/api/TagsAPI');

describe('api/TagsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['user.manage', 'event.manage.all', 'event.write.all']);
        await world.createRole('User', []);

        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('user1', {}, ['User']);
        await world.createUser('user2', {}, ['User']);

        new TagsAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('CRUD Operations', () => {
        test('GET /api/tags - Authorized public access', async () => {
            await world.createTag('T1');
            const res = await world.request.get('/api/tags');
            expect(res.statusCode).toBe(200);
            expect(res.body.data.some(t => t.name === 'T1')).toBe(true);
        });

        test('POST /api/tags - RBAC enforcement', async () => {
            const tagData = { name: 'NewTag', color: '#ff0000', description: 'D', min_difficulty: 1 };
            
            // Guest should fail
            const resGuest = await world.request.post('/api/tags').send(tagData);
            expect(resGuest.statusCode).toBe(401);

            // Standard user should fail
            const resUser = await world.as('user1').post('/api/tags').send(tagData);
            expect(resUser.statusCode).toBe(403);

            // Admin should succeed
            const resAdmin = await world.as('admin').post('/api/tags').send(tagData);
            expect(resAdmin.statusCode).toBe(200);
            expect(resAdmin.body.data).toHaveProperty('id');
        });

        test('PUT /api/tags/:id and DELETE /api/tags/:id lifecycle', async () => {
            await world.createTag('OldTag');
            const tagId = world.data.tags['OldTag'];

            // Update
            const resUpdate = await world.as('admin').put(`/api/tags/${tagId}`).send({ name: 'Updated' });
            expect(resUpdate.statusCode).toBe(200);

            // Delete
            const resDelete = await world.as('admin').delete(`/api/tags/${tagId}`);
            expect(resDelete.statusCode).toBe(200);

            // Verify deletion
            const check = await world.db.get('SELECT 1 FROM tags WHERE id = ?', [tagId]);
            expect(check).toBeUndefined();
        });

        test('POST /api/tags/:id/reset-image - Clear tag image', async () => {
            const fileId = await world.createFile('TagIcon');
            await world.createTag('T1', { image_id: fileId });
            const tagId = world.data.tags['T1'];

            // Action: Reset image
            const res = await world.as('admin').post(`/api/tags/${tagId}/reset-image`);
            expect(res.statusCode).toBe(200);

            // Verification: image_id is NULL
            const updated = await world.db.get('SELECT image_id FROM tags WHERE id = ?', [tagId]);
            expect(updated.image_id).toBeNull();
        });

        test('Tag manager can update their managed tag', async () => {
            await world.createTag('M1');
            const tagId = world.data.tags['M1'];
            await world.assignTag('user_managed', 'user1', 'M1');

            const fileId = await world.createFile('TagIcon');
            
            // user1 is not a global admin but is a manager of M1
            const res = await world.as('user1').put(`/api/tags/${tagId}`).send({
                name: 'M1-Updated',
                image_id: fileId
            });
            expect(res.statusCode).toBe(200);

            const updated = await world.db.get('SELECT name, image_id FROM tags WHERE id = ?', [tagId]);
            expect(updated.name).toBe('M1-Updated');
            expect(updated.image_id).toBe(fileId);
        });

        test('Standard user cannot update tag they do not manage', async () => {
            await world.createTag('T1');
            const tagId = world.data.tags['T1'];

            const res = await world.as('user1').put(`/api/tags/${tagId}`).send({ name: 'Hack' });
            expect(res.statusCode).toBe(403);
        });
    });

    describe('Whitelist Management', () => {
        let tagId, targetUserId;

        beforeEach(async () => {
            await world.createTag('WhiteTag');
            tagId = world.data.tags['WhiteTag'];
            targetUserId = world.data.users['user1'];
        });

        test('Whitelist lifecycle: Add, Get, Remove', async () => {
            // Add user
            const resAdd = await world.as('admin').post(`/api/tags/${tagId}/whitelist`).send({ userId: targetUserId });
            expect(resAdd.statusCode).toBe(200);

            // Verify in list
            const resGet = await world.as('admin').get(`/api/tags/${tagId}/whitelist`);
            expect(resGet.body.data.some(u => u.id === targetUserId)).toBe(true);

            // Remove user
            const resDel = await world.as('admin').delete(`/api/tags/${tagId}/whitelist/${targetUserId}`);
            expect(resDel.statusCode).toBe(200);

            // Verify gone
            const resGet2 = await world.as('admin').get(`/api/tags/${tagId}/whitelist`);
            expect(resGet2.body.data.some(u => u.id === targetUserId)).toBe(false);
        });

        test('Whitelist endpoints are forbidden for non-admins', async () => {
            const res = await world.as('user1').get(`/api/tags/${tagId}/whitelist`);
            expect(res.statusCode).toBe(403);
        });
    });

    describe('Manager Scoping Management', () => {
        let tagId, targetUserId;

        beforeEach(async () => {
            await world.createTag('ManagedTag');
            tagId = world.data.tags['ManagedTag'];
            targetUserId = world.data.users['user1'];
        });

        test('Assign and revoke direct tag management scope', async () => {
            // Assign
            await world.as('admin').post(`/api/tags/${tagId}/managers`).send({ userId: targetUserId });
            
            const resGet = await world.as('admin').get(`/api/tags/${tagId}/managers`);
            expect(resGet.body.data.some(u => u.id === targetUserId)).toBe(true);

            // Revoke
            await world.as('admin').delete(`/api/tags/${tagId}/managers/${targetUserId}`);
            const resGet2 = await world.as('admin').get(`/api/tags/${tagId}/managers`);
            expect(resGet2.body.data.some(u => u.id === targetUserId)).toBe(false);
        });
    });

    describe('User-Specific Tag Lookups', () => {
        beforeEach(async () => {
            await world.createTag('T1');
            await world.db.run('INSERT INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [world.data.tags['T1'], world.data.users['user1']]);
        });

        test('Current user can see their own whitelisted tags', async () => {
            const res = await world.as('user1').get('/api/user/tags');
            expect(res.statusCode).toBe(200);
            expect(res.body.some(t => t.name === 'T1')).toBe(true);
        });

        test('RBAC check for other user\'s whitelisted tags', async () => {
            const u1Id = world.data.users['user1'];
            
            // User can look up themselves
            const resSelf = await world.as('user1').get(`/api/user/${u1Id}/tags`);
            expect(resSelf.statusCode).toBe(200);

            // Admin can look up any user
            const resAdmin = await world.as('admin').get(`/api/user/${u1Id}/tags`);
            expect(resAdmin.statusCode).toBe(200);

            // Unauthorized user is blocked from PII lookup
            const resOther = await world.as('user2').get(`/api/user/${u1Id}/tags`);
            expect(resOther.statusCode).toBe(403);
        });
    });
});
