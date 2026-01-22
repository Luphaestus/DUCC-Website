/**
 * AuthAPI.test.js
 * 
 * Integration tests for the Authentication API.
 * Covers signup, account restoration, login, status checks, and password resets.
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passportModule = require('passport');
const TestWorld = require('../utils/TestWorld');
const AuthAPI = require('../../server/api/AuthAPI');
const UserAPI = require('../../server/api/users/UserAPI');
const bcrypt = require('bcrypt');

describe('api/AuthAPI', () => {
    let app, db, passport, auth;
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        db = world.db;
        
        // Manual Express setup to inject the test database
        passport = new passportModule.Authenticator();
        app = express();
        app.use(express.json());
        app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
        app.use(passport.initialize());
        app.use(passport.session());

        app.use((req, res, next) => {
            req.db = db;
            next();
        });

        auth = new AuthAPI(app, db, passport);
        auth.registerRoutes();
        
        new UserAPI(app, db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('Signup & Registration', () => {
        /**
         * Test standard successful signup.
         */
        test('POST /api/auth/signup - Success', async () => {
            const res = await request(app)
                .post('/api/auth/signup')
                .send({
                    email: 'new.user@durham.ac.uk',
                    password: 'password123',
                    first_name: 'New',
                    last_name: 'User'
                });
            expect(res.statusCode).toBe(201);
        });

        /**
         * Test account restoration logic.
         * When a user deletes their account and then signs up again with the same email,
         * their old ID and historical data should be preserved.
         */
        test('Account Restoration: Actually calling deleteAccount then re-signing up', async () => {
            const agent = request.agent(app);
            const email = 'rejoiner.real@durham.ac.uk';
            const password = 'securePassword123';
            
            // 1. Create and populate user
            await agent.post('/api/auth/signup').send({
                email, password, first_name: 'Old', last_name: 'Name'
            });
            await agent.post('/api/auth/login').send({ email, password });
            const userRow = await db.get('SELECT id FROM users WHERE email = ?', [email]);
            await db.run('UPDATE users SET swims = 10 WHERE id = ?', [userRow.id]);

            // 2. Soft-delete the account
            const deleteRes = await agent.post('/api/user/deleteAccount').send({ password });
            expect(deleteRes.statusCode).toBe(200);

            // 3. Re-signup
            const signupRes = await agent.post('/api/auth/signup').send({
                email, password, first_name: 'Restored', last_name: 'User'
            });
            expect(signupRes.statusCode).toBe(200);
            expect(signupRes.body.message).toMatch(/restored/i);

            // 4. Verify data preservation
            const restoredUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
            expect(restoredUser.id).toBe(userRow.id);
            expect(restoredUser.swims).toBe(10);
            expect(restoredUser.first_name).toBe('Restored');
        });
    });

    describe('Login & Status', () => {
        const email = 'login.test@durham.ac.uk';
        const password = 'password123';

        beforeEach(async () => {
            const hashed = await bcrypt.hash(password, 10);
            await db.run('INSERT INTO users (email, hashed_password, first_name, last_name) VALUES (?,?,?,?)', [email, hashed, 'L', 'T']);
        });

        test('POST /api/auth/login success', async () => {
            const res = await request(app).post('/api/auth/login').send({ email, password });
            expect(res.statusCode).toBe(200);
            expect(res.body.user.email).toBe(email);
        });
        
        test('POST /api/auth/login fail (wrong password)', async () => {
            const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
            expect(res.statusCode).toBe(401);
        });

        test('GET /api/auth/status verifies session', async () => {
            const agent = request.agent(app);
            await agent.post('/api/auth/login').send({ email, password });
            const res = await agent.get('/api/auth/status');
            expect(res.body.authenticated).toBe(true);
        });
    });

    describe('Password Resets', () => {
        const email = 'reset.test@durham.ac.uk';

        beforeEach(async () => {
            await db.run('INSERT INTO users (email, first_name, last_name) VALUES (?,?,?)', [email, 'R', 'T']);
        });

        /**
         * Test token generation.
         */
        test('POST /api/auth/reset-password-request creates token', async () => {
            const res = await request(app).post('/api/auth/reset-password-request').send({ email });
            expect(res.statusCode).toBe(200);
            
            const reset = await db.get('SELECT * FROM password_resets');
            expect(reset).toBeDefined();
            expect(reset.token).toBeDefined();
        });

        /**
         * Test password update using token.
         */
        test('POST /api/auth/reset-password updates password', async () => {
            await request(app).post('/api/auth/reset-password-request').send({ email });
            const { token } = await db.get('SELECT token FROM password_resets');

            const res = await request(app).post('/api/auth/reset-password').send({
                token,
                newPassword: 'new-password'
            });
            expect(res.statusCode).toBe(200);

            const user = await db.get('SELECT hashed_password FROM users WHERE email = ?', [email]);
            expect(await bcrypt.compare('new-password', user.hashed_password)).toBe(true);
        });
    });
});