const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passportModule = require('passport');
const { setupTestDb } = require('../utils/db');
const Auth = require('../../server/api/AuthAPI');

describe('Auth API', () => {
    let app;
    let db;
    let passport;

    beforeEach(async () => {
        db = await setupTestDb();
        passport = new passportModule.Authenticator();
        app = express();
        app.use(express.json());
        app.use(session({
            secret: 'test-secret',
            resave: false,
            saveUninitialized: false
        }));
        app.use(passport.initialize());
        app.use(passport.session());

        const auth = new Auth(app, db, passport);
        auth.registerRoutes();
    });

    afterEach(async () => {
        await db.close();
    });

    test('POST /api/auth/signup works with valid data', async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                email: 'test.user@durham.ac.uk',
                password: 'password123',
                first_name: 'Test',
                last_name: 'User'
            });

        expect(res.statusCode).toBe(201);

        const user = await db.get('SELECT * FROM users WHERE email = ?', ['test.user@durham.ac.uk']);
        expect(user).toBeDefined();
        expect(user.first_name).toBe('Test');
    });

    test('POST /api/auth/signup fails with invalid email', async () => {
        const res = await request(app)
            .post('/api/auth/signup')
            .send({
                email: 'test@gmail.com',
                password: 'password123',
                first_name: 'Test',
                last_name: 'User'
            });

        expect(res.statusCode).toBe(400);
    });

    test('POST /api/auth/login works with correct credentials', async () => {
        // Signup first
        await request(app)
            .post('/api/auth/signup')
            .send({
                email: 'test.user@durham.ac.uk',
                password: 'password123',
                first_name: 'Test',
                last_name: 'User'
            });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test.user@durham.ac.uk',
                password: 'password123'
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe('Login successful.');
    });

    test('POST /api/auth/login fails with incorrect password', async () => {
        await request(app)
            .post('/api/auth/signup')
            .send({
                email: 'test.user@durham.ac.uk',
                password: 'password123',
                first_name: 'Test',
                last_name: 'User'
            });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test.user@durham.ac.uk',
                password: 'wrongpassword'
            });

        expect(res.statusCode).toBe(401);
    });

    test('GET /api/auth/status returns correct state', async () => {
        const agent = request.agent(app);

        let statusRes = await agent.get('/api/auth/status');
        expect(statusRes.body.authenticated).toBe(false);

        const signupRes = await agent.post('/api/auth/signup').send({
            email: 'test.user@durham.ac.uk',
            password: 'password123',
            first_name: 'Test',
            last_name: 'User'
        });
        expect(signupRes.statusCode).toBe(201);

        const loginRes = await agent.post('/api/auth/login').send({
            email: 'test.user@durham.ac.uk',
            password: 'password123'
        });
        expect(loginRes.statusCode).toBe(200);

        statusRes = await agent.get('/api/auth/status');
        expect(statusRes.body.authenticated).toBe(true);
    });

    test('POST /api/auth/login is case-insensitive', async () => {
        await request(app)
            .post('/api/auth/signup')
            .send({
                email: 'Test.User@durham.ac.uk',
                password: 'password123',
                first_name: 'Test',
                last_name: 'User'
            });

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'tEsT.uSeR@DuRhAm.Ac.Uk',
                password: 'password123'
            });

        expect(res.statusCode).toBe(200);
    });
});
