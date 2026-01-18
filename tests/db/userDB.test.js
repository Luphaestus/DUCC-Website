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

        // Permissions & Roles
        await db.run("INSERT INTO permissions (slug) VALUES ('user.manage')");
        const permId = (await db.get("SELECT id FROM permissions WHERE slug = 'user.manage'")).id;
        await db.run("INSERT INTO roles (name) VALUES ('UserManager')");
        const roleId = (await db.get("SELECT id FROM roles WHERE name = 'UserManager'")).id;
        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [roleId, permId]);

        const res1 = await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, college_id)
             VALUES (?, ?, ?, ?, ?)`,
            ['test@durham.ac.uk', hashedPassword, 'Test', 'User', 1]
        );
        user1Id = res1.lastID;

        const res2 = await db.run(
            `INSERT INTO users (email, hashed_password, first_name, last_name, college_id)
             VALUES (?, ?, ?, ?, ?)`,
            ['admin@durham.ac.uk', hashedPassword, 'Admin', 'User', 1]
        );
        adminId = res2.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminId, roleId]);
    });

    afterEach(async () => {
        await db.close();
    });

    describe('getElements', () => {
        test('retrieves user data successfully', async () => {
            const result = await UserDB.getElementsById(db, user1Id, ['first_name', 'email']);
            expect(result.getStatus()).toBe(200);
            expect(result.getData()).toEqual({ first_name: 'Test', email: 'test@durham.ac.uk' });
        });
    });

    describe('writeElements', () => {
        test('updates data successfully', async () => {
            const updateData = { first_name: 'UpdatedName' };
            const result = await UserDB.writeElementsById(db, user1Id, updateData);
            expect(result.getStatus()).toBe(200);

            const user = await db.get('SELECT first_name FROM users WHERE id = ?', user1Id);
            expect(user.first_name).toBe('UpdatedName');
        });
    });

    describe('getUsers', () => {
        test('can list users with perms object', async () => {
            const userPerms = { canManageUsers: true, canManageTrans: true, canManageEvents: true, isScopedExec: true };
            const options = { page: 1, limit: 10, sort: 'last_name', order: 'asc' };
            const result = await UserDB.getUsers(db, userPerms, options);
            expect(result.getStatus()).toBe(200);
            expect(result.getData().users.length).toBe(2);
        });
    });
});
