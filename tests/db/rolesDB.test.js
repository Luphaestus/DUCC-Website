/**
 * rolesDB.test.js
 * 
 * Database layer tests for RBAC (Role-Based Access Control).
 * Verifies role creation, user assignment, and permission resolution.
 */

import TestWorld from '../utils/TestWorld.js';
import RolesDB from '../../server/db/rolesDB.js';

describe('db/rolesDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('createRole and getAllRoles persistence', async () => {
        await RolesDB.createRole(world.db, 'NewRole', 'Desc', ['user.manage']);
        const res = await RolesDB.getAllRoles(world.db);
        const roles = res.getData();
        expect(roles.some(r => r.name === 'NewRole')).toBe(true);
    });

    /**
     * Verifies that assigning a role correctly allows subsequent lookup.
     */
    test('assignRole successfully links a role to a user', async () => {
        await world.createUser('user', {});
        const userId = world.data.users['user'];
        
        await RolesDB.createRole(world.db, 'TestRole', 'Desc', []);
        const role = (await world.db.get('SELECT id FROM roles WHERE name = "TestRole"'));

        await RolesDB.assignRole(world.db, userId, role.id);
        
        const res = await RolesDB.getUserRoles(world.db, userId);
        expect(res.getData()[0].name).toBe('TestRole');
    });

    /**
     * Test direct permission overrides (independent of roles).
     */
    test('addUserPermission adds a direct override that is included in user permissions', async () => {
        await world.createUser('user', {});
        const userId = world.data.users['user'];
        
        await world.createPermission('custom.perm');
        const permId = world.data.perms['custom.perm'];

        await RolesDB.addUserPermission(world.db, userId, permId);
        
        const res = await RolesDB.getAllUserPermissions(world.db, userId);
        expect(res.getData()).toContain('custom.perm');
    });
});
