/**
 * permissions.test.js
 * 
 * RBAC evaluation tests.
 */

import TestWorld from '../utils/TestWorld.js';
import { Permissions } from '../../server/misc/permissions.js';

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

    describe('Hierarchical Permissions', () => {
        test('manage implies write and read', async () => {
            await world.createRole('Manager', ['event.manage.all']);
            await world.createUser('user', {}, ['Manager']);
            const userId = world.data.users['user'];

            expect(await Permissions.hasPermission(world.db, userId, 'event.manage.all')).toBe(true);
            expect(await Permissions.hasPermission(world.db, userId, 'event.write.all')).toBe(true);
            expect(await Permissions.hasPermission(world.db, userId, 'event.read.all')).toBe(true);
        });

        test('write implies read', async () => {
            await world.createRole('Writer', ['event.write.all']);
            await world.createUser('user', {}, ['Writer']);
            const userId = world.data.users['user'];

            expect(await Permissions.hasPermission(world.db, userId, 'event.write.all')).toBe(true);
            expect(await Permissions.hasPermission(world.db, userId, 'event.read.all')).toBe(true);
            expect(await Permissions.hasPermission(world.db, userId, 'event.manage.all')).toBe(false);
        });

        test('all implies scoped', async () => {
            await world.createRole('GlobalManager', ['event.manage.all']);
            await world.createUser('user', {}, ['GlobalManager']);
            const userId = world.data.users['user'];

            expect(await Permissions.hasPermission(world.db, userId, 'event.manage.scoped')).toBe(true);
            expect(await Permissions.hasPermission(world.db, userId, 'event.read.scoped')).toBe(true);
        });

        test('user.manage implies everything', async () => {
            await world.createRole('SuperAdmin', ['user.manage']);
            await world.createUser('user', {}, ['SuperAdmin']);
            const userId = world.data.users['user'];

            expect(await Permissions.hasPermission(world.db, userId, 'event.manage.all')).toBe(true);
            expect(await Permissions.hasPermission(world.db, userId, 'transaction.read')).toBe(true);
            expect(await Permissions.hasPermission(world.db, userId, 'any.custom.permission')).toBe(true);
        });
    });

    /** Test dynamic scoping. */
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

    /** Test global vs scoped management. */
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