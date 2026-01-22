const TestWorld = require('../utils/TestWorld');
const UserDB = require('../../server/db/userDB');

describe('db/userDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('getElementsById retrieves user data', async () => {
        await world.createUser('user', { first_name: 'John', email: 'john@test.com' });
        const userId = world.data.users['user'];

        const res = await UserDB.getElementsById(world.db, userId, ['first_name', 'email']);
        expect(res.getData()).toEqual({ first_name: 'John', email: 'john@test.com' });
    });

    test('writeElements updates data', async () => {
        await world.createUser('user', { first_name: 'Old' });
        const userId = world.data.users['user'];

        await UserDB.writeElements(world.db, userId, { first_name: 'New' });
        
        const user = await world.db.get('SELECT first_name FROM users WHERE id = ?', [userId]);
        expect(user.first_name).toBe('New');
    });

    test('getUsers with balance', async () => {
        await world.createUser('user', { first_name: 'John' });
        const userId = world.data.users['user'];
        await world.addTransaction('user', 50.0);

        const perms = { canManageUsers: true };
        const res = await UserDB.getUsers(world.db, perms, { page: 1, limit: 10 });
        const user = res.getData().users.find(u => u.id === userId);
        
        expect(user.first_name).toBe('John');
        expect(user.balance).toBe(50.0);
    });

    test('removeUser (soft delete)', async () => {
        await world.createUser('user', { first_name: 'Gone', email: 'gone@test.com' });
        const userId = world.data.users['user'];

        await UserDB.removeUser(world.db, userId, false);
        
        const user = await world.db.get('SELECT * FROM users WHERE id = ?', [userId]);
        expect(user.email).toBe('deleted:gone@test.com');
        expect(user.first_name).toBe('Gone');
    });
});