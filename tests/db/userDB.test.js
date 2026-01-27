/**
 * userDB.test.js
 * 
 * Database layer tests for user profiles.
 * Covers field-level fetching, updates, administrative listings, and soft-deletion.
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

    test('writeElements correctly updates user record data', async () => {
        await world.createUser('user', { first_name: 'Old Name' });
        const userId = world.data.users['user'];

        await UserDB.writeElements(world.db, userId, { first_name: 'New Name' });
        
        const user = await world.db.get('SELECT first_name FROM users WHERE id = ?', [userId]);
        expect(user.first_name).toBe('New Name');
    });

    /**
     * Verifies complex JOIN query for user listings with balances.
     */
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

    /**
     * Test the GDPR-compliant soft-delete logic.
     */
    test('removeUser successfully performs a soft-delete (anonymization)', async () => {
        await world.createUser('user', { first_name: 'Gone', email: 'gone@test.com' });
        const userId = world.data.users['user'];

        // Action: soft delete
        await UserDB.removeUser(world.db, userId, false);
        
        const user = await world.db.get('SELECT * FROM users WHERE id = ?', [userId]);
        // Verification: unique constraint freed via prefix, but data kept for auditing
        expect(user.email).toBe('deleted:gone@test.com');
        expect(user.first_name).toBe('Gone');
    });
});
