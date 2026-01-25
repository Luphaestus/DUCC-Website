/**
 * authDB.test.js
 * 
 * Database layer tests for authentication and password resets.
 * Covers user retrieval, creation, restoration, and reset token management.
 */

const TestWorld = require('../utils/TestWorld');
const AuthDB = require('../../server/db/authDB');

describe('db/authDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('getUserByEmail and getUserById', async () => {
        const userId = await world.createUser('testuser', { email: 'test@durham.ac.uk' });
        
        const userByEmail = await AuthDB.getUserByEmail(world.db, 'test@durham.ac.uk');
        expect(userByEmail.id).toBe(userId);

        const userById = await AuthDB.getUserById(world.db, userId);
        expect(userById.email).toBe('test@durham.ac.uk');
    });

    test('createUser and restoreUser', async () => {
        // Create
        const resCreate = await AuthDB.createUser(world.db, 'new@durham.ac.uk', 'hash', 'New', 'User');
        expect(resCreate.status).toBe(201);

        // Restore
        const userId = (await world.db.get('SELECT id FROM users WHERE email = "new@durham.ac.uk"')).id;
        await world.db.run('UPDATE users SET email = "deleted:new@durham.ac.uk" WHERE id = ?', [userId]);
        
        const resRestore = await AuthDB.restoreUser(world.db, userId, 'restored@durham.ac.uk', 'newhash', 'Restored', 'Name');
        expect(resRestore.status).toBe(200);
        
        const restored = await AuthDB.getUserById(world.db, userId);
        expect(restored.email).toBe('restored@durham.ac.uk');
        expect(restored.first_name).toBe('Restored');
    });

    test('Password Resets', async () => {
        const userId = await world.createUser('resetuser');
        const token = 'test-token';
        const expires = new Date(Date.now() + 3600000).toISOString();

        await AuthDB.createPasswordReset(world.db, userId, token, expires);
        
        const reset = await AuthDB.getValidPasswordReset(world.db, token);
        expect(reset.user_id).toBe(userId);

        await AuthDB.resetPassword(world.db, userId, 'newhash');
        const updated = await AuthDB.getUserById(world.db, userId);
        expect(updated.hashed_password).toBe('newhash');

        const resetDeleted = await AuthDB.getValidPasswordReset(world.db, token);
        expect(resetDeleted).toBeUndefined();
    });
});
