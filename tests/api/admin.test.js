const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const AdminEventsAPI = require('../../server/api/admin/AdminEventsAPI.js');
const AdminUsersAPI = require('../../server/api/admin/AdminUsersAPI.js');
const AdminRolesAPI = require('../../server/api/admin/AdminRolesAPI.js');
const AdminTransactionsAPI = require('../../server/api/admin/AdminTransactionsAPI.js');
const AdminCollegesAPI = require('../../server/api/admin/AdminCollegesAPI.js');
const Globals = require('../../server/misc/globals');

describe('Admin API', () => {
    let app;
    let db;
    let adminId;
    let userId;

    beforeEach(async () => {
        db = await setupTestDb();

        vi.spyOn(Globals.prototype, 'getInt').mockImplementation((key) => (key === 'President' ? 1 : 0));
        vi.spyOn(Globals.prototype, 'getFloat').mockReturnValue(0);

        // Setup Roles & Permissions
        await db.run("INSERT INTO permissions (slug) VALUES ('user.manage'), ('event.manage.all'), ('transaction.manage'), ('event.manage.scoped')");
        
        await db.run("INSERT INTO roles (name) VALUES ('Admin'), ('Exec')");
        const adminRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Admin'")).id;
        const execRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Exec'")).id;

        const perms = await db.all("SELECT id, slug FROM permissions");
        for (const p of perms) {
            if (['user.manage', 'event.manage.all', 'transaction.manage'].includes(p.slug)) {
                await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [adminRoleId, p.id]);
            }
            if (p.slug === 'event.manage.scoped') {
                await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [execRoleId, p.id]);
            }
        }

        const adminRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['admin@durham.ac.uk', 'Admin', 'User', 1]
        );
        adminId = adminRes.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminId, adminRoleId]);

        const userRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['user@durham.ac.uk', 'Regular', 'User', 1]
        );
        userId = userRes.lastID;

        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            req.db = db; // Attach db for middleware
            const authHeader = req.headers['x-mock-user'];
            if (authHeader === 'admin') {
                req.isAuthenticated = () => true;
                req.user = { id: adminId };
            } else if (authHeader === 'exec') {
                // Assign exec role temporarily or use a separate user
                req.isAuthenticated = () => true;
                req.user = { id: userId }; // Will need to assign role in test
            } else if (authHeader === 'user') {
                req.isAuthenticated = () => true;
                req.user = { id: userId };
            } else {
                req.isAuthenticated = () => false;
            }
            next();
        });

        new AdminEventsAPI(app, db).registerRoutes();
        new AdminUsersAPI(app, db).registerRoutes();
        new AdminRolesAPI(app, db).registerRoutes();
        new AdminTransactionsAPI(app, db).registerRoutes();
        new AdminCollegesAPI(app, db).registerRoutes();
    });

    afterEach(async () => {
        await db.close();
        vi.restoreAllMocks();
    });

    test('GET /api/admin/users requires permissions', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('x-mock-user', 'user');
        expect(res.statusCode).toBe(403);
    });

    test('GET /api/admin/users works for admin', async () => {
        const res = await request(app)
            .get('/api/admin/users')
            .set('x-mock-user', 'admin');
        expect(res.statusCode).toBe(200);
        expect(res.body.users.length).toBeGreaterThan(0);
    });

    test('POST /api/admin/event creates an event', async () => {
        const res = await request(app)
            .post('/api/admin/event')
            .set('x-mock-user', 'admin')
            .send({
                title: 'New Event',
                start: '2025-01-01 10:00:00',
                end: '2025-01-01 12:00:00',
                difficulty_level: 1,
                upfront_cost: 0
            });
        expect(res.statusCode).toBe(200);

        const event = await db.get('SELECT * FROM events WHERE title = ?', ['New Event']);
        expect(event).toBeDefined();
    });

    test('POST /api/admin/event fails for regular user', async () => {
        const res = await request(app)
            .post('/api/admin/event')
            .set('x-mock-user', 'user')
            .send({ title: 'Hack Event', start: '2025-01-01', end: '2025-01-01', difficulty_level: 1 });
        expect(res.statusCode).toBe(403);
    });

    test('POST /api/admin/user/:id/transaction adds transaction', async () => {
        const res = await request(app)
            .post(`/api/admin/user/${userId}/transaction`)
            .set('x-mock-user', 'admin')
            .send({ amount: 10, description: 'Top up' });

        expect(res.statusCode).toBe(200);
        const transaction = await db.get('SELECT * FROM transactions WHERE user_id = ?', [userId]);
        expect(transaction.amount).toBe(10);
    });

    test('GET /api/admin/user/:id fails for regular user', async () => {
        const res = await request(app)
            .get(`/api/admin/user/${adminId}`)
            .set('x-mock-user', 'user');
        expect(res.statusCode).toBe(403);
    });

    test('GET /api/admin/user/:id returns restricted data for exec', async () => {
        const execRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Exec'")).id;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, execRoleId]);

        const res = await request(app)
            .get(`/api/admin/user/${adminId}`)
            .set('x-mock-user', 'exec');

        expect(res.statusCode).toBe(200);
        expect(res.body.first_name).toBeDefined();
        expect(res.body.email).toBeUndefined(); // Sensitive
        expect(res.body.balance).toBeUndefined(); // Sensitive
    });

    test('is_exec user can only see names in users list', async () => {
        // Setup exec user
        const execRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Exec'")).id;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, execRoleId]);

        const res = await request(app)
            .get('/api/admin/users')
            .set('x-mock-user', 'exec');

        expect(res.statusCode).toBe(200);
        const firstUser = res.body.users[0];
        expect(firstUser.first_name).toBeDefined();
        expect(firstUser.email).toBeUndefined();
        expect(firstUser.balance).toBeUndefined();
    });
});
