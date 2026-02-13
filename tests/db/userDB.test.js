/**
 * userDB.test.js
 * 
 * User DB tests.
 */

import TestWorld from '../utils/TestWorld.js';
import UserDB from '../../server/db/userDB.js';

describe('db/userDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('getElementsById correctly retrieves specific user columns', async () => {
        await world.createUser('user', { first_name: 'John', email: 'john@test.com' });
        const userId = world.data.users['user'];

        const res = await UserDB.getElementsById(world.db, userId, ['first_name', 'email']);
        expect(res.getData()).toEqual({ first_name: 'John', email: 'john@test.com' });
    });

    test('getElementsById forces is_member to true for permanent members', async () => {
        await world.createUser('perm_user', { first_name: 'President', email: 'president@test.com', is_member: 0 });
        const permUserId = world.data.users['perm_user'];
        await world.db.run('UPDATE users SET is_permanent_member = 1 WHERE id = ?', [permUserId]);

        const res = await UserDB.getElementsById(world.db, permUserId, ['is_member']);
        expect(res.getData().is_member).toBe(1);
    });

    test('writeElements correctly updates user record data', async () => {
        await world.createUser('user', { first_name: 'Old Name' });
        const userId = world.data.users['user'];

        await UserDB.writeElements(world.db, userId, { first_name: 'New Name' });
        
        const user = await world.db.get('SELECT first_name FROM users WHERE id = ?', [userId]);
        expect(user.first_name).toBe('New Name');
    });

    /** Test user listings with balance. */
    test('getUsers correctly calculates and returns balances in the listing', async () => {
        await world.createUser('user', { first_name: 'John' });
        const userId = world.data.users['user'];
        await world.addTransaction('user', 50.0);

        const perms = { canManageUsers: true };
        const res = await UserDB.getUsers(world.db, perms, { page: 1, limit: 10 });
        const user = res.getData().users.find(u => u.id === userId);
        
        expect(user.first_name).toBe('John');
        expect(user.balance).toBe(50.0);
    });

    test('getUsers filters correctly with isMember, considering permanent members', async () => {
        await world.createUser('member', { first_name: 'Regular', is_member: 1 });
        await world.createUser('non_member', { first_name: 'Guest', is_member: 0 });
        await world.createUser('perm_member', { first_name: 'Ex-Pres', is_member: 0 }); // Initially non-member
        const permUserId = world.data.users['perm_member'];
        await world.db.run('UPDATE users SET is_permanent_member = 1 WHERE id = ?', [permUserId]); // Make permanent

        const perms = { canManageUsers: true };

        // Test filtering for members
        let res = await UserDB.getUsers(world.db, perms, { isMember: 'true' });
        let userNames = res.getData().users.map(u => u.first_name).sort();
        expect(userNames).toEqual(['Ex-Pres', 'Regular']); // Should include both regular member and permanent member

        // Test filtering for non-members
        res = await UserDB.getUsers(world.db, perms, { isMember: 'false' });
        userNames = res.getData().users.map(u => u.first_name).sort();
        expect(userNames).toEqual(['Guest']); // Should only include actual non-members, exclude permanent members
    });

    /** Test soft-delete logic. */
    test('removeUser successfully performs a soft-delete (anonymization)', async () => {
        await world.createUser('user', { first_name: 'Gone', email: 'gone@test.com' });
        const userId = world.data.users['user'];

        // soft delete
        await UserDB.removeUser(world.db, userId, false);
        
        const user = await world.db.get('SELECT * FROM users WHERE id = ?', [userId]);
        // unique constraint freed via prefix, but data kept for auditing
        expect(user.email).toBe('deleted:gone@test.com');
        expect(user.first_name).toBe('Gone');
    });
});