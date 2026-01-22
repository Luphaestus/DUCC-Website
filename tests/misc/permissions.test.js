/**
 * permissions.test.js
 * 
 * Logic tests for RBAC evaluation and scoping.
 * Verifies role-based perms, direct overrides, and dynamic scoping for events.
 */

const TestWorld = require('../utils/TestWorld');
const { Permissions } = require('../../server/misc/permissions');

describe('misc/permissions', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('hasPermission returns false for users not present in the system', async () => {
        const has = await Permissions.hasPermission(world.db, 999, 'user.manage');
        expect(has).toBe(false);
    });

    test('hasPermission correctly evaluates role-based permissions', async () => {
        await world.createRole('Admin', ['user.manage']);
        await world.createUser('admin', {}, ['Admin']);
        const userId = world.data.users['admin'];

        const has = await Permissions.hasPermission(world.db, userId, 'user.manage');
        expect(has).toBe(true);
    });

    test('hasPermission correctly evaluates direct permission overrides', async () => {
        await world.createPermission('custom.perm');
        await world.createUser('user', {});
        const userId = world.data.users['user'];
        const permId = world.data.perms['custom.perm'];

        // Assign permission directly to user without a role
        await world.db.run('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)', [userId, permId]);

        const has = await Permissions.hasPermission(world.db, userId, 'custom.perm');
        expect(has).toBe(true);
    });

    /**
     * Scoped permissions (e.g. event.manage.scoped) are dynamic.
     * Possession is defined as "having at least one entry in the management scope tables".
     */
    test('Dynamic scoping: hasPermission evaluates scoped perms based on managed tag entries', async () => {
        await world.createUser('exec', {});
        const userId = world.data.users['exec'];

        // Initially false (no tags assigned)
        expect(await Permissions.hasPermission(world.db, userId, 'event.manage.scoped')).toBe(false);

        // Assign a managed tag to the user
        await world.createTag('Tag1');
        await world.assignTag('user_managed', 'exec', 'Tag1');

        // Now true
        expect(await Permissions.hasPermission(world.db, userId, 'event.manage.scoped')).toBe(true);
    });

    /**
     * Test global vs scoped management logic.
     */
    test('canManageEvent: global access grants management of any event', async () => {
        await world.createRole('Admin', ['event.manage.all']);
        await world.createUser('admin', {}, ['Admin']);
        const userId = world.data.users['admin'];

        await world.createEvent('Event1');
        const eventId = world.data.events['Event1'];

        expect(await Permissions.canManageEvent(world.db, userId, eventId)).toBe(true);
    });

    test('canManageEvent: scoped access enforces tag matching', async () => {
        await world.createRole('Exec', ['event.manage.scoped']);
        await world.createUser('exec', {}, ['Exec']);
        const userId = world.data.users['exec'];

        // Grant scope over 'Tag1'
        await world.createTag('Tag1');
        await world.assignTag('user_managed', 'exec', 'Tag1');

        // Event 1 has 'Tag1' -> accessible
        await world.createEvent('Event1');
        const eventId = world.data.events['Event1'];
        await world.assignTag('event', 'Event1', 'Tag1');
        expect(await Permissions.canManageEvent(world.db, userId, eventId)).toBe(true);

        // Event 2 has no tags -> inaccessible
        await world.createEvent('Event2');
        const event2Id = world.data.events['Event2'];
        expect(await Permissions.canManageEvent(world.db, userId, event2Id)).toBe(false);
    });
});