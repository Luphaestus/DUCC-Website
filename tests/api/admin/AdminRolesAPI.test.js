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

    describe('GET /api/admin/permissions', () => {
        test('Lists only non-scoped permissions', async () => {
            await world.createPermission('user.manage');
            await world.createPermission('event.manage.scoped');

            const res = await world.as('admin').get('/api/admin/permissions');
            expect(res.statusCode).toBe(200);
            const slugs = res.body.map(p => p.slug);
            expect(slugs).toContain('user.manage');
            expect(slugs).not.toContain('event.manage.scoped');
        });
    });

    describe('Role Lifecycle', () => {
        test('Full CRUD for custom roles', async () => {
            const res1 = await world.as('admin').post('/api/admin/role').send({
                name: 'TestRole', description: 'Desc', permissions: ['role.read']
            });
            expect(res1.statusCode).toBe(201);
            const roleId = res1.body.id;

            const res2 = await world.as('admin').put(`/api/admin/role/${roleId}`).send({
                name: 'UpdatedName', description: 'NewDesc', permissions: []
            });
            expect(res2.statusCode).toBe(200);

            const res3 = await world.as('admin').delete(`/api/admin/role/${roleId}`);
            expect(res3.statusCode).toBe(200);
        });

        test('Cannot delete or update President role', async () => {
            await world.db.run('INSERT INTO roles (name) VALUES ("President")');
            const pres = await world.db.get('SELECT id FROM roles WHERE name = "President"');

            const resUpdate = await world.as('admin').put(`/api/admin/role/${pres.id}`).send({ name: 'Hack' });
            expect(resUpdate.statusCode).toBe(403);

            const resDelete = await world.as('admin').delete(`/api/admin/role/${pres.id}`);
            expect(resDelete.statusCode).toBe(403);
        });
    });
});