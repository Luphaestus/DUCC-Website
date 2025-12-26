const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const User = require('../../server/api/UserAPI');

// Mock Globals
jest.mock('../../server/misc/globals', () => {
    return class Globals {
        getFloat(key) {
            if (key === 'MembershipCost') return 10.0;
            return 0;
        }
    };
});

// Mock Authentication Middleware
jest.mock('../../server/misc/authentication', () => {
    return () => (req, res, next) => next();
});


describe('User API', () => {
    let app;
    let db;
    let userId;

    beforeEach(async () => {
        db = await setupTestDb();
        const res = await db.run(`INSERT INTO users (email, first_name, last_name, is_member) VALUES ('u@d.ac.uk', 'U', 'S', 0)`);
        userId = res.lastID;

        app = express();
        app.use(express.json());

        // Mock authentication middleware globally for the app in tests
        app.use((req, res, next) => {
            req.isAuthenticated = () => true;
            req.user = { id: userId, email: 'u@d.ac.uk' };
            req.logout = (cb) => cb();
            next();
        });

        new User(app, db).registerRoutes();
    });

    afterEach(async () => {
        await db.close();
    });

    test('GET /api/user/elements/:elements returns data', async () => {
        const res = await request(app).get('/api/user/elements/first_name,last_name');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ first_name: 'U', last_name: 'S' });
    });

    test('POST /api/user/elements updates data', async () => {
        const res = await request(app)
            .post('/api/user/elements')
            .send({ first_name: 'Updated' });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const user = await db.get('SELECT first_name FROM users WHERE id = ?', userId);
        expect(user.first_name).toBe('Updated');
    });

    test('POST /api/user/join handles membership', async () => {
        const res = await request(app).post('/api/user/join');
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);

        const user = await db.get('SELECT is_member FROM users WHERE id = ?', userId);
        expect(user.is_member).toBe(1);

        const tx = await db.get('SELECT * FROM transactions WHERE user_id = ?', userId);
        expect(tx).toBeDefined();
        expect(tx.amount).toBe(-10.0);
    });

    test('GET /api/user/swims/leaderboard returns empty list initially', async () => {
        const res = await request(app).get('/api/user/swims/leaderboard');
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toEqual([]);
    });

    test('POST /api/user/:id/swims adds swims correctly', async () => {
        // Mock req.user.is_exec = true
        await db.run('UPDATE users SET is_exec = 1 WHERE id = ?', userId);
        
        const res = await request(app)
            .post(`/api/user/${userId}/swims`)
            .send({ count: 5 });
        
        expect(res.statusCode).toBe(200);
        
        const user = await db.get('SELECT swims FROM users WHERE id = ?', userId);
        expect(user.swims).toBe(5);

        // Check history
        const history = await db.get('SELECT * FROM swim_history WHERE user_id = ?', userId);
        expect(history).toBeDefined();
        expect(history.count).toBe(5);
    });
});
