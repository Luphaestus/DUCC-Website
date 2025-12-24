const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const AdminAPI = require('../../server/api/AdminAPI');
const Globals = require('../../server/misc/globals');

jest.mock('../../server/misc/globals', () => {
    return jest.fn().mockImplementation(() => ({
        getInt: (key) => (key === 'President' ? 1 : 0)
    }));
});

describe('Admin API', () => {
    let app;
    let db;
    let adminId;
    let userId;

    beforeEach(async () => {
        db = await setupTestDb();
        
        const adminRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id, can_manage_users, can_manage_events, can_manage_transactions) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['admin@durham.ac.uk', 'Admin', 'User', 1, 1, 1, 1]
        );
        adminId = adminRes.lastID; // Should be 1 as per setupTestDb and mock

        const userRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['user@durham.ac.uk', 'Regular', 'User', 1]
        );
        userId = userRes.lastID;

        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            const authHeader = req.headers['x-mock-user'];
            if (authHeader === 'admin') {
                req.isAuthenticated = () => true;
                req.user = { id: adminId, can_manage_users: true, can_manage_events: true, can_manage_transactions: true };
            } else if (authHeader === 'user') {
                req.isAuthenticated = () => true;
                req.user = { id: userId, can_manage_users: false, can_manage_events: false, can_manage_transactions: false };
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

    test('POST /api/admin/user/:id/transaction adds transaction', async () => {
        const res = await request(app)
            .post(`/api/admin/user/${userId}/transaction`)
            .set('x-mock-user', 'admin')
            .send({ amount: 10, description: 'Top up' });
        
        expect(res.statusCode).toBe(200);
        const transaction = await db.get('SELECT * FROM transactions WHERE user_id = ?', [userId]);
        expect(transaction.amount).toBe(10);
    });
});
