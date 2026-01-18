const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const AdminAPI = require('../../server/api/AdminAPI');
const Globals = require('../../server/misc/globals');

describe('Admin API User Filtering', () => {
    let app;
    let db;
    let adminId;
    let execId;
    let userId;

    beforeEach(async () => {
        vi.spyOn(Globals.prototype, 'getInt').mockReturnValue(0);
        vi.spyOn(Globals.prototype, 'getFloat').mockReturnValue(0);

        db = await setupTestDb();

        // Setup Permissions
        await db.run("INSERT INTO permissions (slug) VALUES ('user.manage'), ('event.manage.all')");
        
        // Setup Roles
        await db.run("INSERT INTO roles (name) VALUES ('Admin'), ('Exec')");
        const adminRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Admin'")).id;
        const execRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Exec'")).id;

        const permId = (await db.get("SELECT id FROM permissions WHERE slug = 'user.manage'")).id;

        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [adminRoleId, permId]);

        // Create Admin (has role 'Admin' which has 'user.manage')
        const adminRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['admin@durham.ac.uk', 'Admin', 'User', 1]
        );
        adminId = adminRes.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminId, adminRoleId]);

        // Create Exec (has role 'Exec', no perms attached in this test setup, but is a role)
        const execRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['exec@durham.ac.uk', 'Exec', 'User', 1]
        );
        execId = execRes.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [execId, execRoleId]);

        // Create Regular User
        const userRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['user@durham.ac.uk', 'Regular', 'User', 1]
        );
        userId = userRes.lastID;

        app = express();
        app.use(express.json());

        // Middleware to mock authentication
        app.use((req, res, next) => {
            req.db = db;
            // Admin is logged in
            req.isAuthenticated = () => true;
            req.user = { id: adminId };
            next();
        });

        const adminAPI = new AdminAPI(app, db);
        adminAPI.registerRoutes();
    });

    afterEach(async () => {
        await db.close();
        vi.restoreAllMocks();
    });

    test('Filter by perm:is_exec returns users with roles', async () => {
        const res = await request(app).get('/api/admin/users?permissions=perm:is_exec');
        expect(res.statusCode).toBe(200);
        // Should find Admin and Exec
        const ids = res.body.users.map(u => u.id);
        expect(ids).toContain(adminId);
        expect(ids).toContain(execId);
        expect(ids).not.toContain(userId);
    });

    test('Filter by role:Admin returns only admin', async () => {
        const res = await request(app).get('/api/admin/users?permissions=role:Admin');
        expect(res.statusCode).toBe(200);
        const ids = res.body.users.map(u => u.id);
        expect(ids).toContain(adminId);
        expect(ids).not.toContain(execId);
    });

    test('Filter by perm:user.manage returns users with permission', async () => {
        const res = await request(app).get('/api/admin/users?permissions=perm:user.manage');
        expect(res.statusCode).toBe(200);
        const ids = res.body.users.map(u => u.id);
        expect(ids).toContain(adminId); // Admin role has user.manage
        expect(ids).not.toContain(execId);
    });

    test('Combined filter works (OR logic)', async () => {
        // perm:user.manage (Admin) OR role:Exec (Exec)
        const res = await request(app).get('/api/admin/users?permissions=perm:user.manage|role:Exec');
        expect(res.statusCode).toBe(200);
        const ids = res.body.users.map(u => u.id);
        expect(ids).toContain(adminId);
        expect(ids).toContain(execId);
        expect(ids).not.toContain(userId);
    });
});
