/**
 * AdminUsersAPI.test.js
 * 
 * Functional tests for the Admin User Management API.
 * Covers user listing, detailed profile filtering based on admin role,
 * and the complex "President Role Transfer" logic.
 */

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

    describe('GET /api/admin/users (List View)', () => {
        test('Applying filters and pagination to user lists', async () => {
            new AdminUsersAPI(world.app, world.db).registerRoutes();
            await world.createUser('member', { is_member: 1 });
            
            const res = await world.as('admin').get('/api/admin/users?isMember=true');
            expect(res.statusCode).toBe(200);
            expect(res.body.users.every(u => u.is_member === 1)).toBe(true);
        });

        /**
         * System-wide PII protection: Scoped Execs should not see sensitive columns like email or balance.
         */
        test('Dynamic field visibility: Admins see all, Scoped Execs see restricted data', async () => {
            new AdminUsersAPI(world.app, world.db).registerRoutes();
            
            // Full Admin check
            const resAdmin = await world.as('admin').get('/api/admin/users');
            expect(resAdmin.body.users[0]).toHaveProperty('email');
            expect(resAdmin.body.users[0]).toHaveProperty('balance');

            // Scoped Exec check
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

    describe('GET /api/admin/user/:id (Detail View)', () => {
        /**
         * Detailed profiles should also be filtered based on the requester's management permissions.
         */
        test('RBAC-based data filtering in detailed user profiles', async () => {
            new AdminUsersAPI(world.app, world.db).registerRoutes();
            const userId = world.data.users['user'];

            // 1. Admin sees full profile
            const resAdmin = await world.as('admin').get(`/api/admin/user/${userId}`);
            expect(resAdmin.body).toHaveProperty('email');
            expect(resAdmin.body).toHaveProperty('balance');

            // 2. Scoped Exec sees restricted profile
            await world.createTag('T1');
            await world.assignTag('user_managed', 'exec', 'T1');
            const resExec = await world.as('exec').get(`/api/admin/user/${userId}`);
            expect(resExec.body.email).toBeUndefined();
            expect(resExec.body.balance).toBeUndefined();
        });
    });

    describe('President Role Transfer (High-Security Operation)', () => {
        /**
         * Transferring the President role is a sensitive action that requires password confirmation from the current admin.
         */
        test('President role transfer requires current user\'s password verification', async () => {
            const password = 'current-password';
            const hashed = await bcrypt.hash(password, 10);
            await world.db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [hashed, world.data.users['admin']]);
            
            await world.db.run('INSERT INTO roles (name) VALUES ("President")');
            const presRole = await world.db.get('SELECT id FROM roles WHERE name = "President"');
            const targetId = world.data.users['user'];

            // Inject the hashed password into the session object for the test agent
            world.app.use((req, res, next) => {
                if (req.user && req.user.id === world.data.users['admin']) {
                    req.user.hashed_password = hashed;
                }
                next();
            });
            new AdminUsersAPI(world.app, world.db).registerRoutes();

            // 1. Fail without password
            const res1 = await world.as('admin').post(`/api/admin/user/${targetId}/role`).send({ roleId: presRole.id });
            expect(res1.statusCode).toBe(400);

            // 2. Success with password
            const res2 = await world.as('admin').post(`/api/admin/user/${targetId}/role`).send({ 
                roleId: presRole.id, 
                password: password 
            });
            expect(res2.statusCode).toBe(200);
        });

        /**
         * President transfer has system-wide side effects:
         * 1. Wipes all existing role assignments and direct permissions (clean slate for new Captain).
         * 2. Scrubs PII for users who didn't opt-in to long-term data storage.
         */
        test('Side-effects of President transfer: wipes permissions and scrubs PII', async () => {
            const password = 'password';
            const hashed = await bcrypt.hash(password, 10);
            await world.db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [hashed, world.data.users['admin']]);
            
            await world.db.run('INSERT INTO roles (name) VALUES ("President")');
            const presRole = await world.db.get('SELECT id FROM roles WHERE name = "President"');
            
            const targetId = world.data.users['user'];

            // Setup User A: hasn't agreed to long-term storage
            await world.createUser('to_be_scrubbed', { 
                agrees_to_keep_health_data: 0, 
                home_address: 'Secret Location',
                filled_legal_info: 1
            });
            const scrubbedId = world.data.users['to_be_scrubbed'];

            // Setup User B: has agreed to long-term storage
            await world.createUser('to_be_kept', { 
                agrees_to_keep_health_data: 1, 
                home_address: 'Known Location',
                filled_legal_info: 1
            });
            const keptId = world.data.users['to_be_kept'];

            // Grant some permissions to be wiped
            await world.createRole('ExecRole', ['user.manage']);
            await world.db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [keptId, world.data.roles['ExecRole']]);
            await world.createPermission('DirectPerm');
            await world.db.run('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)', [keptId, world.data.perms['DirectPerm']]);

            world.app.use((req, res, next) => {
                if (req.user && req.user.id === world.data.users['admin']) req.user.hashed_password = hashed;
                next();
            });
            new AdminUsersAPI(world.app, world.db).registerRoutes();

            // Perform the transfer
            await world.as('admin').post(`/api/admin/user/${targetId}/role`).send({ roleId: presRole.id, password });

            // Verify logic
            // 1. Roles and direct permissions are wiped
            const rolesCount = await world.db.get('SELECT COUNT(*) as c FROM user_roles WHERE user_id != ?', [targetId]);
            expect(rolesCount.c).toBe(0);
            const directPermsCount = await world.db.get('SELECT COUNT(*) as c FROM user_permissions');
            expect(directPermsCount.c).toBe(0);

            // 2. GDPR scrubbing performed on User A
            const scrubbed = await world.db.get('SELECT home_address, filled_legal_info FROM users WHERE id = ?', [scrubbedId]);
            expect(scrubbed.home_address).toBeNull();
            expect(scrubbed.filled_legal_info).toBe(0);

            // 3. Data preserved for User B
            const kept = await world.db.get('SELECT home_address, filled_legal_info FROM users WHERE id = ?', [keptId]);
            expect(kept.home_address).toBe('Known Location');
            expect(kept.filled_legal_info).toBe(1);

            // 4. Target user is now President
            const targetRole = await world.db.get('SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?', [targetId]);
            expect(targetRole.name).toBe('President');
        });
    });

    describe('Direct Permissions & Tags', () => {
        /**
         * Admins can grant permissions and management scopes directly to users, independent of roles.
         */
        test('Management of direct user-specific permission and tag scope overrides', async () => {
            new AdminUsersAPI(world.app, world.db).registerRoutes();
            const userId = world.data.users['user'];
            await world.createPermission('custom.perm');
            const permId = world.data.perms['custom.perm'];

            // 1. Grant direct permission
            const res1 = await world.as('admin').post(`/api/admin/user/${userId}/permission`).send({ permissionId: permId });
            expect(res1.statusCode).toBe(200);

            // 2. Grant direct tag scope
            await world.createTag('T1');
            const tagId = world.data.tags['T1'];
            const res2 = await world.as('admin').post(`/api/admin/user/${userId}/managed_tag`).send({ tagId });
            expect(res2.statusCode).toBe(200);

            // 3. Verify via profile fetch
            const res3 = await world.as('admin').get(`/api/admin/user/${userId}`);
            expect(res3.body.direct_permissions.some(p => p.id === permId)).toBe(true);
            expect(res3.body.direct_managed_tags.some(t => t.id === tagId)).toBe(true);
        });
    });
});
