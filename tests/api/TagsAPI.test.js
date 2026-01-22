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
        test('GET /api/tags - Public access', async () => {
            await world.createTag('T1');
            const res = await world.request.get('/api/tags');
            expect(res.statusCode).toBe(200);
            expect(res.body.data.some(t => t.name === 'T1')).toBe(true);
        });

        test('POST /api/tags - Access control', async () => {
            const tagData = { name: 'NewTag', color: '#ff0000', description: 'D', min_difficulty: 1 };
            
            // Guest fail
            const resGuest = await world.request.post('/api/tags').send(tagData);
            expect(resGuest.statusCode).toBe(401);

            // User fail
            const resUser = await world.as('user1').post('/api/tags').send(tagData);
            expect(resUser.statusCode).toBe(403);

            // Admin success
            const resAdmin = await world.as('admin').post('/api/tags').send(tagData);
            expect(resAdmin.statusCode).toBe(200);
            expect(resAdmin.body.data).toHaveProperty('id');
        });

        test('PUT /api/tags/:id and DELETE /api/tags/:id', async () => {
            await world.createTag('OldTag');
            const tagId = world.data.tags['OldTag'];

            const resUpdate = await world.as('admin').put(`/api/tags/${tagId}`).send({ name: 'Updated' });
            expect(resUpdate.statusCode).toBe(200);

            const resDelete = await world.as('admin').delete(`/api/tags/${tagId}`);
            expect(resDelete.statusCode).toBe(200);

            const check = await world.db.get('SELECT 1 FROM tags WHERE id = ?', [tagId]);
            expect(check).toBeUndefined();
        });
    });

    describe('Whitelist Management', () => {
        let tagId, targetUserId;

        beforeEach(async () => {
            await world.createTag('WhiteTag');
            tagId = world.data.tags['WhiteTag'];
            targetUserId = world.data.users['user1'];
        });

        test('Full lifecycle: Add, Get, Remove', async () => {
            // Add
            const resAdd = await world.as('admin').post(`/api/tags/${tagId}/whitelist`).send({ userId: targetUserId });
            expect(resAdd.statusCode).toBe(200);

            // Get
            const resGet = await world.as('admin').get(`/api/tags/${tagId}/whitelist`);
            expect(resGet.body.data.some(u => u.id === targetUserId)).toBe(true);

            // Remove
            const resDel = await world.as('admin').delete(`/api/tags/${tagId}/whitelist/${targetUserId}`);
            expect(resDel.statusCode).toBe(200);

            const resGet2 = await world.as('admin').get(`/api/tags/${tagId}/whitelist`);
            expect(resGet2.body.data.some(u => u.id === targetUserId)).toBe(false);
        });

        test('Forbidden for normal users', async () => {
            const res = await world.as('user1').get(`/api/tags/${tagId}/whitelist`);
            expect(res.statusCode).toBe(403);
        });
    });

    describe('Manager Management', () => {
        let tagId, targetUserId;

        beforeEach(async () => {
            await world.createTag('ManagedTag');
            tagId = world.data.tags['ManagedTag'];
            targetUserId = world.data.users['user1'];
        });

        test('Add and remove managers', async () => {
            await world.as('admin').post(`/api/tags/${tagId}/managers`).send({ userId: targetUserId });
            
            const resGet = await world.as('admin').get(`/api/tags/${tagId}/managers`);
            expect(resGet.body.data.some(u => u.id === targetUserId)).toBe(true);

            await world.as('admin').delete(`/api/tags/${tagId}/managers/${targetUserId}`);
            const resGet2 = await world.as('admin').get(`/api/tags/${tagId}/managers`);
            expect(resGet2.body.data.some(u => u.id === targetUserId)).toBe(false);
        });
    });

    describe('User-Specific Tags', () => {
        beforeEach(async () => {
            await world.createTag('T1');
            await world.db.run('INSERT INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [world.data.tags['T1'], world.data.users['user1']]);
        });

        test('GET /api/user/tags - Current user sees their own', async () => {
            const res = await world.as('user1').get('/api/user/tags');
            expect(res.statusCode).toBe(200);
            expect(res.body.some(t => t.name === 'T1')).toBe(true);
        });

        test('GET /api/user/:userId/tags - Permissions', async () => {
            const u1Id = world.data.users['user1'];
            
            // Self access
            const resSelf = await world.as('user1').get(`/api/user/${u1Id}/tags`);
            expect(resSelf.statusCode).toBe(200);

            // Admin access
            const resAdmin = await world.as('admin').get(`/api/user/${u1Id}/tags`);
            expect(resAdmin.statusCode).toBe(200);

            // Other user denied
            const resOther = await world.as('user2').get(`/api/user/${u1Id}/tags`);
            expect(resOther.statusCode).toBe(403);
        });
    });
});