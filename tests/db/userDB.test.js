const { setupTestDb } = require('../utils/db');
const UserDB = require('../../server/db/userDB');
const bcrypt = require('bcrypt');

describe('UserDB', () => {
    let db;
    let user1Id;
    let adminId;

    beforeEach(async () => {
        db = await setupTestDb();
        const hashedPassword = await bcrypt.hash('password', 10);
        
        const res1 = await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, college_id)
             VALUES (?, ?, ?, ?, ?)`,
            ['test@durham.ac.uk', hashedPassword, 'Test', 'User', 1]
        );
        user1Id = res1.lastID;

        const res2 = await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, college_id, can_manage_users)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['admin@durham.ac.uk', hashedPassword, 'Admin', 'User', 1, 1]
        );
        adminId = res2.lastID;
    });

    afterEach(async () => {
        await db.close();
    });

    describe('getElements', () => {
        test('retrieves own data successfully', async () => {
            const req = {
                isAuthenticated: () => true,
                user: { id: user1Id }
            };
            const result = await UserDB.getElements(req, db, ['first_name', 'email']);
            expect(result.getStatus()).toBe(200);
            expect(result.getData()).toEqual({ first_name: 'Test', email: 'test@durham.ac.uk' });
        });

        test('returns 401 if not authenticated', async () => {
            const req = { isAuthenticated: () => false };
            const result = await UserDB.getElements(req, db, ['first_name']);
            expect(result.getStatus()).toBe(401);
        });

        test('admin can retrieve other user data', async () => {
            const req = {
                isAuthenticated: () => true,
                user: { id: adminId }
            };
            const result = await UserDB.getElements(req, db, ['first_name'], user1Id);
            expect(result.getStatus()).toBe(200);
            expect(result.getData()).toEqual({ first_name: 'Test' });
        });

        test('normal user cannot retrieve other user data (caught by access check logic usually, but here checking DB layer permission)', async () => {
             // UserDB.getElements with explicit ID checks canManageUsers
             const req = {
                isAuthenticated: () => true,
                user: { id: user1Id }
            };
            const result = await UserDB.getElements(req, db, ['first_name'], adminId);
            expect(result.getStatus()).toBe(403);
        });
    });

    describe('writeElements', () => {
        test('updates own data successfully', async () => {
            const req = {
                isAuthenticated: () => true,
                user: { id: user1Id }
            };
            const updateData = { first_name: 'UpdatedName' };
            const result = await UserDB.writeElements(req, db, updateData);
            expect(result.getStatus()).toBe(200);

            const user = await db.get('SELECT first_name FROM users WHERE id = ?', user1Id);
            expect(user.first_name).toBe('UpdatedName');
        });
    });

    describe('getUsers', () => {
        test('admin can list users', async () => {
            const req = {
                isAuthenticated: () => true,
                user: { id: adminId }
            };
            const options = { page: 1, limit: 10, sort: 'last_name', order: 'asc' };
            const result = await UserDB.getUsers(req, db, options);
            expect(result.getStatus()).toBe(200);
            expect(result.getData().users.length).toBe(2);
        });

        test('normal user cannot list users', async () => {
            const req = {
                isAuthenticated: () => true,
                user: { id: user1Id }
            };
            const options = { page: 1, limit: 10 };
            const result = await UserDB.getUsers(req, db, options);
            expect(result.getStatus()).toBe(403);
        });
    });
});
