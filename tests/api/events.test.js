const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const Events = require('../../server/api/EventsAPI');

jest.mock('../../server/misc/globals', () => {
    return class Globals {
        getInt(key) {
            if (key === 'Unauthorized_max_difficulty') return 1;
            return 0;
        }
        getFloat(key) {
            return -1000; // MinMoney, allow debt
        }
    };
});

jest.mock('../../server/misc/authentication', () => {
    return () => (req, res, next) => next();
});

describe('Events API', () => {
    let app;
    let db;
    let userId;
    let eventId;

    beforeEach(async () => {
        db = await setupTestDb();
        // Insert user who is a member and has filled legal info to allow attendance
        const res = await db.run(`
            INSERT INTO users (email, first_name, last_name, difficulty_level, is_member, filled_legal_info, free_sessions) 
            VALUES ('u@d.ac.uk', 'U', 'S', 5, 1, 1, 0)
        `);
        userId = res.lastID;

        // Create an event in future
        const now = new Date();
        const start = new Date(now); start.setDate(start.getDate() + 1);
        const end = new Date(start); end.setHours(end.getHours() + 2);
        
        const eventRes = await db.run(`
            INSERT INTO events (title, start, end, difficulty_level, upfront_cost, max_attendees) 
            VALUES ('E1', ?, ?, 1, 0, 10)
        `, [start.toISOString(), end.toISOString()]);
        eventId = eventRes.lastID;

        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            req.isAuthenticated = () => true;
            req.user = { id: userId, email: 'u@d.ac.uk' };
            req.logout = (cb) => cb();
            next();
        });

        new Events(app, db).registerRoutes();
    });

    afterEach(async () => {
        await db.close();
    });

    test('GET /api/events returns events', async () => {
        const res = await request(app).get('/api/events');
        expect(res.statusCode).toBe(200);
        expect(res.body.events.length).toBeGreaterThan(0);
    });

    test('POST /api/event/:id/attend allows joining', async () => {
        // Make user a coach so they can join alone
        await db.run('UPDATE users SET is_instructor = 1 WHERE id = ?', userId);
        
        const res = await request(app).post(`/api/event/${eventId}/attend`);
        if (res.statusCode !== 200) {
            console.log(res.body);
        }
        expect(res.statusCode).toBe(200);
        
        const attendingRes = await request(app).get(`/api/event/${eventId}/isAttending`);
        expect(attendingRes.body.isAttending).toBe(true);
    });

    test('GET /api/event/:id/isPaying returns false initially', async () => {
        const res = await request(app).get(`/api/event/${eventId}/isPaying`);
        expect(res.statusCode).toBe(200);
        expect(res.body.isPaying).toBe(false);
    });

    test('GET /api/event/:id/coachCount returns correct count', async () => {
        // Current user is NOT a coach in setup
        const res = await request(app).get(`/api/event/${eventId}/coachCount`);
        expect(res.statusCode).toBe(200);
        expect(res.body.count).toBe(0);

        // Make user a coach and join
        await db.run('UPDATE users SET is_instructor = 1 WHERE id = ?', userId);
        await request(app).post(`/api/event/${eventId}/attend`);

        const res2 = await request(app).get(`/api/event/${eventId}/coachCount`);
        expect(res2.body.count).toBe(1);
    });
});
