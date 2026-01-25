/**
 * AdminRolesAPI.test.js
 * 
 * Functional tests for the Role and Permission Management API.
 * Verifies the lifecycle of custom roles and protects critical system roles (President).
 */

const TestWorld = require('../../utils/TestWorld');
const AdminRolesAPI = require('../../../server/api/admin/AdminRolesAPI');

describe('api/admin/AdminRolesAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['role.read', 'role.manage', 'role.write']);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('user', {});

        new AdminRolesAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/admin/roles/permissions', () => {
        /**
         * System-managed scoped permissions should be hidden from the manual assignment UI.
         */
        test('Returns only manually-assignable (non-scoped) permissions', async () => {
            await world.createPermission('user.manage');
            await world.createPermission('event.manage.scoped');

            const res = await world.as('admin').get('/api/admin/roles/permissions');
            expect(res.statusCode).toBe(200);
            const slugs = res.body.map(p => p.slug);
            
            expect(slugs).toContain('user.manage');
            expect(slugs).not.toContain('event.manage.scoped');
        });
    });

    describe('Role Lifecycle Management', () => {
        /**
         * Verify full creation, update, and deletion flow for standard roles.
         */
        test('Full CRUD flow for custom administrative roles', async () => {
            // Create
            const res1 = await world.as('admin').post('/api/admin/roles').send({
                name: 'TestRole', description: 'Desc', permissions: ['role.read']
            });
            expect(res1.statusCode).toBe(201);
            const roleId = res1.body.id;

            // Update
            const res2 = await world.as('admin').put(`/api/admin/roles/${roleId}`).send({
                name: 'UpdatedName', description: 'NewDesc', permissions: []
            });
            expect(res2.statusCode).toBe(200);

            // Delete
            const res3 = await world.as('admin').delete(`/api/admin/roles/${roleId}`);
            expect(res3.statusCode).toBe(200);
        });

        /**
         * The President role is critical for system operation and must not be modified or removed via standard API routes.
         */
        test('Modification or deletion of the President role is strictly forbidden', async () => {
            await world.db.run('INSERT INTO roles (name) VALUES ("President")');
            const pres = await world.db.get('SELECT id FROM roles WHERE name = "President"');

            // Attempt Update
            const resUpdate = await world.as('admin').put(`/api/admin/roles/${pres.id}`).send({ name: 'Hack' });
            expect(resUpdate.statusCode).toBe(403);

            // Attempt Delete
            const resDelete = await world.as('admin').delete(`/api/admin/roles/${pres.id}`);
            expect(resDelete.statusCode).toBe(403);
        });
    });
});