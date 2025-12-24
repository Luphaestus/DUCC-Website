const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const TagsAPI = require('../../server/api/TagsAPI');

describe('Tags API', () => {
    let app;
    let db;
    let adminId;
    let userId;

    beforeEach(async () => {
        db = await setupTestDb();
        
        const adminRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id, can_manage_events, can_manage_users) VALUES (?, ?, ?, ?, ?, ?)',
            ['admin@durham.ac.uk', 'Admin', 'User', 1, 1, 1]
        );
        adminId = adminRes.lastID;

        const userRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['user@durham.ac.uk', 'Regular', 'User', 1]
        );
        userId = userRes.lastID;

        app = express();
        app.use(express.json());

        // Middleware to mock authentication
        app.use((req, res, next) => {
            const authHeader = req.headers['x-mock-user'];
            if (authHeader === 'admin') {
                req.isAuthenticated = () => true;
                req.user = { id: adminId, can_manage_events: true, can_manage_users: true };
            } else if (authHeader === 'user') {
                req.isAuthenticated = () => true;
                req.user = { id: userId, can_manage_events: false, can_manage_users: false };
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
    });

    test('GET /api/tags returns all tags', async () => {
        await db.run('INSERT INTO tags (name) VALUES (?)', ['Tag 1']);
        const res = await request(app).get('/api/tags');
        expect(res.statusCode).toBe(200);
        expect(res.body.data.length).toBe(1);
    });

    test('POST /api/tags requires admin', async () => {
        const res = await request(app)
            .post('/api/tags')
            .set('x-mock-user', 'user')
            .send({ name: 'New Tag' });
        expect(res.statusCode).toBe(403);
    });

    test('POST /api/tags works for admin', async () => {
        const res = await request(app)
            .post('/api/tags')
            .set('x-mock-user', 'admin')
            .send({ name: 'Admin Tag' });
        expect(res.statusCode).toBe(200);
    });

    test('Whitelist operations', async () => {
        const tagRes = await db.run('INSERT INTO tags (name) VALUES (?)', ['Tag 1']);
        const tagId = tagRes.lastID;

        // Add to whitelist
        const addRes = await request(app)
            .post(`/api/tags/${tagId}/whitelist`)
            .set('x-mock-user', 'admin')
            .send({ userId: userId });
        expect(addRes.statusCode).toBe(200);

        // Get whitelist
        const listRes = await request(app)
            .get(`/api/tags/${tagId}/whitelist`)
            .set('x-mock-user', 'admin');
        expect(listRes.statusCode).toBe(200);
        expect(listRes.body.data.length).toBe(1);
        expect(listRes.body.data[0].id).toBe(userId);
    });
});
