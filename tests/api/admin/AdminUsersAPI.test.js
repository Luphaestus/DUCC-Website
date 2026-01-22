const TestWorld = require('../../utils/TestWorld');
const AdminUsersAPI = require('../../../server/api/admin/AdminUsersAPI');
const bcrypt = require('bcrypt');

describe('api/admin/AdminUsersAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['user.manage', 'user.read', 'transaction.manage', 'role.manage']);
        await world.createRole('Exec', ['event.manage.scoped']);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('exec', {}, ['Exec']);
        await world.createUser('user', {});
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/admin/users', () => {
        test('Filtering and Pagination', async () => {
            new AdminUsersAPI(world.app, world.db).registerRoutes();
            await world.createUser('member', { is_member: 1 });
            
            const res = await world.as('admin').get('/api/admin/users?isMember=true');
            expect(res.statusCode).toBe(200);
            expect(res.body.users.every(u => u.is_member === 1)).toBe(true);
        });

        test('Field visibility for exec vs admin', async () => {
            new AdminUsersAPI(world.app, world.db).registerRoutes();
            const resAdmin = await world.as('admin').get('/api/admin/users');
            expect(resAdmin.body.users[0]).toHaveProperty('email');
            expect(resAdmin.body.users[0]).toHaveProperty('balance');

           
            await world.createTag('T1');
            await world.assignTag('user_managed', 'exec', 'T1');

            const resExec = await world.as('exec').get('/api/admin/users');
            expect(resExec.statusCode).toBe(200);
            const firstUser = resExec.body.users[0];
            expect(firstUser).toHaveProperty('first_name');
            expect(firstUser.email).toBeUndefined();
            expect(firstUser.balance).toBeUndefined();
        });
    });

    describe('GET /api/admin/user/:id', () => {
        test('Access control and data leakage check', async () => {
            new AdminUsersAPI(world.app, world.db).registerRoutes();
            const userId = world.data.users['user'];

            const resAdmin = await world.as('admin').get(`/api/admin/user/${userId}`);
            expect(resAdmin.body).toHaveProperty('email');
            expect(resAdmin.body).toHaveProperty('balance');

            await world.createTag('T1');
            await world.assignTag('user_managed', 'exec', 'T1');
            const resExec = await world.as('exec').get(`/api/admin/user/${userId}`);
            expect(resExec.body.email).toBeUndefined();
            expect(resExec.body.balance).toBeUndefined();
        });
    });

    describe('President Role Transfer', () => {
        test('Requires password of current user', async () => {
            const password = 'current-password';
            const hashed = await bcrypt.hash(password, 10);
            await world.db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [hashed, world.data.users['admin']]);
            
            await world.db.run('INSERT INTO roles (name) VALUES ("President")');
            const presRole = await world.db.get('SELECT id FROM roles WHERE name = "President"');
            const targetId = world.data.users['user'];

            world.app.use((req, res, next) => {
                if (req.user && req.user.id === world.data.users['admin']) {
                    req.user.hashed_password = hashed;
                }
                next();
            });
            new AdminUsersAPI(world.app, world.db).registerRoutes();

            const res1 = await world.as('admin').post(`/api/admin/user/${targetId}/role`).send({ roleId: presRole.id });
            expect(res1.statusCode).toBe(400);

            const res2 = await world.as('admin').post(`/api/admin/user/${targetId}/role`).send({ 
                roleId: presRole.id, 
                password: password 
            });
            expect(res2.statusCode).toBe(200);
        });

        test('Side-effects: Wipes permissions and conditionally scrubs legal info', async () => {
            const password = 'password';
            const hashed = await bcrypt.hash(password, 10);
            await world.db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [hashed, world.data.users['admin']]);
            
            await world.db.run('INSERT INTO roles (name) VALUES ("President")');
            const presRole = await world.db.get('SELECT id FROM roles WHERE name = "President"');
            
            const targetId = world.data.users['user'];

            await world.createUser('to_be_scrubbed', { 
                agrees_to_keep_health_data: 0, 
                home_address: 'Secret',
                filled_legal_info: 1
            });
            const scrubbedId = world.data.users['to_be_scrubbed'];

            await world.createUser('to_be_kept', { 
                agrees_to_keep_health_data: 1, 
                home_address: 'Stay',
                filled_legal_info: 1
            });
            const keptId = world.data.users['to_be_kept'];

            await world.createRole('ExecRole', ['user.manage']);
            await world.db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [keptId, world.data.roles['ExecRole']]);
            await world.createPermission('DirectPerm');
            await world.db.run('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)', [keptId, world.data.perms['DirectPerm']]);

            world.app.use((req, res, next) => {
                if (req.user && req.user.id === world.data.users['admin']) req.user.hashed_password = hashed;
                next();
            });
            new AdminUsersAPI(world.app, world.db).registerRoutes();

            await world.as('admin').post(`/api/admin/user/${targetId}/role`).send({ roleId: presRole.id, password });

            const rolesCount = await world.db.get('SELECT COUNT(*) as c FROM user_roles WHERE user_id != ?', [targetId]);
            expect(rolesCount.c).toBe(0);
            const directPermsCount = await world.db.get('SELECT COUNT(*) as c FROM user_permissions');
            expect(directPermsCount.c).toBe(0);

            const scrubbed = await world.db.get('SELECT home_address, filled_legal_info FROM users WHERE id = ?', [scrubbedId]);
            expect(scrubbed.home_address).toBeNull();
            expect(scrubbed.filled_legal_info).toBe(0);

            const kept = await world.db.get('SELECT home_address, filled_legal_info FROM users WHERE id = ?', [keptId]);
            expect(kept.home_address).toBe('Stay');
            expect(kept.filled_legal_info).toBe(1);

            const targetRole = await world.db.get('SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?', [targetId]);
            expect(targetRole.name).toBe('President');
        });
    });

    describe('Direct Permissions & Tags', () => {
        test('Can manage user-specific overrides', async () => {
            new AdminUsersAPI(world.app, world.db).registerRoutes();
            const userId = world.data.users['user'];
            await world.createPermission('custom.perm');
            const permId = world.data.perms['custom.perm'];

            const res1 = await world.as('admin').post(`/api/admin/user/${userId}/permission`).send({ permissionId: permId });
            expect(res1.statusCode).toBe(200);

            await world.createTag('T1');
            const tagId = world.data.tags['T1'];
            const res2 = await world.as('admin').post(`/api/admin/user/${userId}/managed_tag`).send({ tagId });
            expect(res2.statusCode).toBe(200);

            const res3 = await world.as('admin').get(`/api/admin/user/${userId}`);
            expect(res3.body.direct_permissions.some(p => p.id === permId)).toBe(true);
            expect(res3.body.direct_managed_tags.some(t => t.id === tagId)).toBe(true);
        });
    });
});