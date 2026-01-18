const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const AdminAPI = require('../../server/api/AdminAPI');
const Globals = require('../../server/misc/globals');

describe('Admin API Scoped Events', () => {
    let app;
    let db;
    let adminId;
    let scopedUserId;

    beforeEach(async () => {
        vi.spyOn(Globals.prototype, 'getInt').mockReturnValue(0);
        vi.spyOn(Globals.prototype, 'getFloat').mockReturnValue(0);

        db = await setupTestDb();

        // Setup Permissions
        await db.run("INSERT INTO permissions (slug) VALUES ('event.manage.all'), ('event.manage.scoped')");
        
        // Setup Roles
        await db.run("INSERT INTO roles (name) VALUES ('Admin'), ('ScopedAdmin')");
        const adminRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Admin'")).id;
        const scopedRoleId = (await db.get("SELECT id FROM roles WHERE name = 'ScopedAdmin'")).id;

        const allPermId = (await db.get("SELECT id FROM permissions WHERE slug = 'event.manage.all'")).id;
        const scopedPermId = (await db.get("SELECT id FROM permissions WHERE slug = 'event.manage.scoped'")).id;

        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [adminRoleId, allPermId]);
        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [scopedRoleId, scopedPermId]);

        // Create Admin
        const adminRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['admin@durham.ac.uk', 'Admin', 'User', 1]
        );
        adminId = adminRes.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminId, adminRoleId]);

        // Create Scoped Admin
        const scopedRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['scoped@durham.ac.uk', 'Scoped', 'User', 1]
        );
        scopedUserId = scopedRes.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [scopedUserId, scopedRoleId]);

        app = express();
        app.use(express.json());

        // Middleware to mock authentication
        app.use((req, res, next) => {
            req.db = db;
            const authHeader = req.headers['x-mock-user'];
            if (authHeader === 'admin') {
                req.isAuthenticated = () => true;
                req.user = { id: adminId };
            } else if (authHeader === 'scoped') {
                req.isAuthenticated = () => true;
                req.user = { id: scopedUserId };
            } else {
                req.isAuthenticated = () => false;
            }
            next();
        });

        const adminAPI = new AdminAPI(app, db);
        adminAPI.registerRoutes();
    });

    afterEach(async () => {
        await db.close();
        vi.restoreAllMocks();
    });

    test('Scoped admin sees only managed events', async () => {
        // Create Tags
        const tagARes = await db.run('INSERT INTO tags (name) VALUES (?)', ['Tag A']);
        const tagAId = tagARes.lastID;
        const tagBRes = await db.run('INSERT INTO tags (name) VALUES (?)', ['Tag B']);
        const tagBId = tagBRes.lastID;

        // Assign Scoped Admin to Tag A
        await db.run('INSERT INTO user_managed_tags (user_id, tag_id) VALUES (?, ?)', [scopedUserId, tagAId]);

        // Create Events
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureIso = futureDate.toISOString();

        const eventARes = await db.run('INSERT INTO events (title, start, end, difficulty_level) VALUES (?, ?, ?, ?)', ['Event A', futureIso, futureIso, 1]);
        const eventAId = eventARes.lastID;
        await db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [eventAId, tagAId]);

        const eventBRes = await db.run('INSERT INTO events (title, start, end, difficulty_level) VALUES (?, ?, ?, ?)', ['Event B', futureIso, futureIso, 1]);
        const eventBId = eventBRes.lastID;
        await db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [eventBId, tagBId]);

        // Check Scoped Admin View
        const resScoped = await request(app)
            .get('/api/admin/events')
            .set('x-mock-user', 'scoped');
        
        expect(resScoped.statusCode).toBe(200);
        expect(resScoped.body.events.length).toBe(1);
        expect(resScoped.body.events[0].title).toBe('Event A');

        // Check Full Admin View
        const resAdmin = await request(app)
            .get('/api/admin/events')
            .set('x-mock-user', 'admin');
        
        expect(resAdmin.statusCode).toBe(200);
        expect(resAdmin.body.events.length).toBe(2);
    });

    test('Scoped admin with no tags sees nothing', async () => {
        // Create Tag and Event
        const tagARes = await db.run('INSERT INTO tags (name) VALUES (?)', ['Tag A']);
        const tagAId = tagARes.lastID;
        const eventARes = await db.run('INSERT INTO events (title, start, end, difficulty_level) VALUES (?, ?, ?, ?)', ['Event A', new Date().toISOString(), new Date().toISOString(), 1]);
        const eventAId = eventARes.lastID;
        await db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [eventAId, tagAId]);

        // Scoped admin has no managed tags
        const resScoped = await request(app)
            .get('/api/admin/events')
            .set('x-mock-user', 'scoped');
        
        expect(resScoped.statusCode).toBe(200);
        expect(resScoped.body.events.length).toBe(0);
    });
});
