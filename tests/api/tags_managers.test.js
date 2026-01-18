const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const TagsAPI = require('../../server/api/TagsAPI');
const Globals = require('../../server/misc/globals');

describe('Tags API Managers', () => {
    let app;
    let db;
    let adminId;
    let userId;
    let userManagerId;

    beforeEach(async () => {
        vi.spyOn(Globals.prototype, 'getInt').mockReturnValue(0);
        vi.spyOn(Globals.prototype, 'getFloat').mockReturnValue(0);

        db = await setupTestDb();

        // Setup Permissions & Roles
        await db.run("INSERT INTO permissions (slug) VALUES ('user.manage'), ('event.manage.all')");
        
        await db.run("INSERT INTO roles (name) VALUES ('Admin'), ('UserManager')");
        const adminRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Admin'")).id;
        const umRoleId = (await db.get("SELECT id FROM roles WHERE name = 'UserManager'")).id;

        const perms = await db.all("SELECT id, slug FROM permissions");
        for (const p of perms) {
            await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [adminRoleId, p.id]); // Admin gets all
            if (p.slug === 'user.manage') {
                await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [umRoleId, p.id]);
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

        const userManagerRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['usermanager@durham.ac.uk', 'User', 'Manager', 1]
        );
        userManagerId = userManagerRes.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userManagerId, umRoleId]);

        app = express();
        app.use(express.json());

        // Middleware to mock authentication
        app.use((req, res, next) => {
            req.db = db;
            const authHeader = req.headers['x-mock-user'];
            if (authHeader === 'admin') {
                req.isAuthenticated = () => true;
                req.user = { id: adminId };
            } else if (authHeader === 'userManager') {
                req.isAuthenticated = () => true;
                req.user = { id: userManagerId };
            } else if (authHeader === 'user') {
                req.isAuthenticated = () => true;
                req.user = { id: userId };
            } else {
                req.isAuthenticated = () => false;
            }
            next();
        });

        const tagsAPI = new TagsAPI(app, db);
        tagsAPI.registerRoutes();
    });

    afterEach(async () => {
        await db.close();
        vi.restoreAllMocks();
    });

    test('Manager operations', async () => {
        const tagRes = await db.run('INSERT INTO tags (name) VALUES (?)', ['Tag 1']);
        const tagId = tagRes.lastID;

        // Add manager as admin
        const addRes = await request(app)
            .post(`/api/tags/${tagId}/managers`)
            .set('x-mock-user', 'admin')
            .send({ userId: userId });
        expect(addRes.statusCode).toBe(200);

        // Get managers
        const listRes = await request(app)
            .get(`/api/tags/${tagId}/managers`)
            .set('x-mock-user', 'admin');
        expect(listRes.statusCode).toBe(200);
        expect(listRes.body.data.length).toBe(1);
        expect(listRes.body.data[0].id).toBe(userId);

        // Remove manager
        const delRes = await request(app)
            .delete(`/api/tags/${tagId}/managers/${userId}`)
            .set('x-mock-user', 'admin');
        expect(delRes.statusCode).toBe(200);

        // Verify removal
        const listRes2 = await request(app)
            .get(`/api/tags/${tagId}/managers`)
            .set('x-mock-user', 'admin');
        expect(listRes2.body.data.length).toBe(0);
    });

    test('Non-admin cannot manage managers', async () => {
        const tagRes = await db.run('INSERT INTO tags (name) VALUES (?)', ['Tag 1']);
        const tagId = tagRes.lastID;

        const addRes = await request(app)
            .post(`/api/tags/${tagId}/managers`)
            .set('x-mock-user', 'user')
            .send({ userId: userId });
        expect(addRes.statusCode).toBe(403);
    });
});
