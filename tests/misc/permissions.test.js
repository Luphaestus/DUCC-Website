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

    test('hasPermission returns false for non-existent user', async () => {
        const has = await Permissions.hasPermission(world.db, 999, 'user.manage');
        expect(has).toBe(false);
    });

    test('hasPermission works for role-based perms', async () => {
        await world.createRole('Admin', ['user.manage']);
        await world.createUser('admin', {}, ['Admin']);
        const userId = world.data.users['admin'];

        const has = await Permissions.hasPermission(world.db, userId, 'user.manage');
        expect(has).toBe(true);
    });

    test('hasPermission works for direct perms', async () => {
        await world.createPermission('custom.perm');
        await world.createUser('user', {});
        const userId = world.data.users['user'];
        const permId = world.data.perms['custom.perm'];

        await world.db.run('INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)', [userId, permId]);

        const has = await Permissions.hasPermission(world.db, userId, 'custom.perm');
        expect(has).toBe(true);
    });

    test('Dynamic check for scoped permissions', async () => {
        await world.createUser('exec', {});
        const userId = world.data.users['exec'];

        // Initially false
        expect(await Permissions.hasPermission(world.db, userId, 'event.manage.scoped')).toBe(false);

        // Assign managed tag
        await world.createTag('Tag1');
        await world.assignTag('user_managed', 'exec', 'Tag1');

        expect(await Permissions.hasPermission(world.db, userId, 'event.manage.scoped')).toBe(true);
    });

    test('canManageEvent global access', async () => {
        await world.createRole('Admin', ['event.manage.all']);
        await world.createUser('admin', {}, ['Admin']);
        const userId = world.data.users['admin'];

        await world.createEvent('Event1');
        const eventId = world.data.events['Event1'];

        expect(await Permissions.canManageEvent(world.db, userId, eventId)).toBe(true);
    });

    test('canManageEvent scoped access', async () => {
        await world.createRole('Exec', ['event.manage.scoped']);
        await world.createUser('exec', {}, ['Exec']);
        const userId = world.data.users['exec'];

        await world.createTag('Tag1');
        await world.assignTag('user_managed', 'exec', 'Tag1');

        await world.createEvent('Event1');
        const eventId = world.data.events['Event1'];
        await world.assignTag('event', 'Event1', 'Tag1');

        expect(await Permissions.canManageEvent(world.db, userId, eventId)).toBe(true);

        await world.createEvent('Event2');
        const event2Id = world.data.events['Event2'];
        expect(await Permissions.canManageEvent(world.db, userId, event2Id)).toBe(false);
    });
});
