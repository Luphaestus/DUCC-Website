/**
 * AdminRolesAPI.test.js
 * 
 * Role and Permission Management API tests.
 */

import TestWorld from '../../utils/TestWorld.js';
import AdminRolesAPI from '../../../server/api/admin/AdminRolesAPI.js';

describe('api/admin/AdminRolesAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['role.read', 'role.manage', 'role.write']);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('user', {});

        new AdminRolesAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/admin/roles/permissions', () => {
        /** Test manually-assignable permissions. */
        test('Returns only manually-assignable (non-scoped) permissions', async () => {
            await world.createPermission('user.manage');
            await world.createPermission('event.manage.scoped');

            const res = await world.as('admin').get('/api/admin/roles/permissions');
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            const slugs = body.map(p => p.slug);
            
            expect(slugs).toContain('user.manage');
            expect(slugs).not.toContain('event.manage.scoped');
        });
    });

    describe('Role Lifecycle Management', () => {
        /** Full CRUD flow for custom administrative roles. */
        test('Full CRUD flow for custom administrative roles', async () => {
            // Create
            const res1 = await world.as('admin').post('/api/admin/roles', {
                name: 'TestRole', description: 'Desc', permissions: ['role.read']
            });
            expect(res1.statusCode).toBe(201);
            const body1 = JSON.parse(res1.body);
            const roleId = body1.data.id;

            // Update
            const res2 = await world.as('admin').put(`/api/admin/roles/${roleId}`, {
                name: 'UpdatedName', description: 'NewDesc', permissions: []
            });
            expect(res2.statusCode).toBe(200);

            // Delete
            const res3 = await world.as('admin').delete(`/api/admin/roles/${roleId}`);
            expect(res3.statusCode).toBe(200);
        });

        /** Test President role protection. */
        test('Modification or deletion of the President role is strictly forbidden', async () => {
            await world.db.run('INSERT INTO roles (name) VALUES ("President")');
            const pres = await world.db.get('SELECT id FROM roles WHERE name = "President"');

            // Attempt Update
            const resUpdate = await world.as('admin').put(`/api/admin/roles/${pres.id}`, { name: 'Hack' });
            expect(resUpdate.statusCode).toBe(403);

            // Attempt Delete
            const resDelete = await world.as('admin').delete(`/api/admin/roles/${pres.id}`);
            expect(resDelete.statusCode).toBe(403);
        });
    });
});
