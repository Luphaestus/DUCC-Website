const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const EventsAPI = require('../../server/api/EventsAPI');
const Globals = require('../../server/misc/globals');

describe('Events API - canManage endpoint', () => {
    let app;
    let db;
    let adminId;
    let scopedUserId;
    let regularUserId;

    beforeEach(async () => {
        vi.spyOn(Globals.prototype, 'getInt').mockReturnValue(0);
        vi.spyOn(Globals.prototype, 'getFloat').mockReturnValue(0);

        db = await setupTestDb();
        
        await db.run("INSERT INTO permissions (slug) VALUES ('event.manage.all')");
        await db.run("INSERT INTO roles (name) VALUES ('Admin')");
        const adminRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Admin'")).id;
        const permId = (await db.get("SELECT id FROM permissions WHERE slug = 'event.manage.all'")).id;
        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [adminRoleId, permId]);

        const adminRes = await db.run('INSERT INTO users (email, first_name, last_name) VALUES (?,?,?)', ['admin@test.com', 'Admin', 'User']);
        adminId = adminRes.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminId, adminRoleId]);
        
        const scopedRes = await db.run('INSERT INTO users (email, first_name, last_name) VALUES (?,?,?)', ['scoped@test.com', 'Scoped', 'User']);
        scopedUserId = scopedRes.lastID;

        const regularRes = await db.run('INSERT INTO users (email, first_name, last_name) VALUES (?,?,?)', ['user@test.com', 'Regular', 'User']);
        regularUserId = regularRes.lastID;

        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            req.db = db;
            const mockUserId = req.headers['x-mock-user-id'];
            if (mockUserId) {
                req.isAuthenticated = () => true;
                req.user = { id: parseInt(mockUserId) };
            } else {
                req.isAuthenticated = () => false;
            }
            next();
        });

        const eventsAPI = new EventsAPI(app, db);
        eventsAPI.registerRoutes();
    });

    afterEach(async () => {
        await db.close();
        vi.restoreAllMocks();
    });

    test('Admin user can manage any event', async () => {
        const eventRes = await db.run('INSERT INTO events (title, start, end, difficulty_level) VALUES (?,?,?,?)', ['Test Event', new Date(), new Date(), 1]);
        const eventId = eventRes.lastID;

        const res = await request(app)
            .get(`/api/event/${eventId}/canManage`)
            .set('x-mock-user-id', adminId);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.canManage).toBe(true);
    });

    test('Regular user cannot manage any event', async () => {
        const eventRes = await db.run('INSERT INTO events (title, start, end, difficulty_level) VALUES (?,?,?,?)', ['Test Event', new Date(), new Date(), 1]);
        const eventId = eventRes.lastID;

        const res = await request(app)
            .get(`/api/event/${eventId}/canManage`)
            .set('x-mock-user-id', regularUserId);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.canManage).toBe(false);
    });

    test('Scoped user can manage event with their tag', async () => {
        const tagRes = await db.run('INSERT INTO tags (name) VALUES (?)', ['Managed Tag']);
        const tagId = tagRes.lastID;
        await db.run('INSERT INTO user_managed_tags (user_id, tag_id) VALUES (?,?)', [scopedUserId, tagId]);

        const eventRes = await db.run('INSERT INTO events (title, start, end, difficulty_level) VALUES (?,?,?,?)', ['Scoped Event', new Date(), new Date(), 1]);
        const eventId = eventRes.lastID;
        await db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?,?)', [eventId, tagId]);

        const res = await request(app)
            .get(`/api/event/${eventId}/canManage`)
            .set('x-mock-user-id', scopedUserId);

        expect(res.statusCode).toBe(200);
        expect(res.body.canManage).toBe(true);
    });

    test('Scoped user cannot manage event without their tag', async () => {
        const eventRes = await db.run('INSERT INTO events (title, start, end, difficulty_level) VALUES (?,?,?,?)', ['Unscoped Event', new Date(), new Date(), 1]);
        const eventId = eventRes.lastID;

        const res = await request(app)
            .get(`/api/event/${eventId}/canManage`)
            .set('x-mock-user-id', scopedUserId);
            
        expect(res.statusCode).toBe(200);
        expect(res.body.canManage).toBe(false);
    });
});
