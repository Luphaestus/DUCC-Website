/**
 * AuthAPI.test.js
 * 
 * Authentication API tests.
 */

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { Authenticator } from 'passport';
import TestWorld from '../utils/TestWorld.js';
import AuthAPI from '../../server/api/AuthAPI.js';
import UserAPI from '../../server/api/users/UserAPI.js';
import bcrypt from 'bcrypt';
import config from '../../server/config.js';

describe('api/AuthAPI', () => {
    let app, db, passport, auth;
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        db = world.db;
        
        // Manual Express setup to inject the test database
        passport = new Authenticator();
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
        /** Test standard successful signup. */
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

        /** Test account restoration logic. */
        test('Account Restoration: Actually calling deleteAccount then re-signing up', async () => {
            const agent = request.agent(app);
            const email = 'rejoiner.real@durham.ac.uk';
            const password = 'securePassword123';
            
            // Create and populate user
            await agent.post('/api/auth/signup').send({
                email, password, first_name: 'Old', last_name: 'Name'
            });
            await agent.post('/api/auth/login').send({ email, password });
            const userRow = await db.get('SELECT id FROM users WHERE email = ?', [email]);
            await db.run('UPDATE users SET swims = 10 WHERE id = ?', [userRow.id]);

            // Soft-delete the account
            const deleteRes = await agent.post('/api/user/deleteAccount').send({ password });
            expect(deleteRes.statusCode).toBe(200);

            // Re-signup
            const signupRes = await agent.post('/api/auth/signup').send({
                email, password, first_name: 'Restored', last_name: 'User'
            });
            expect(signupRes.statusCode).toBe(200);
            expect(signupRes.body.message).toMatch(/restored/i);

            // Verify data preservation
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
            const hashed = await bcrypt.hash(password, config.auth.bcryptSaltRounds);
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

        /** Test token generation. */
        test('POST /api/auth/reset-password-request creates token', async () => {
            const res = await request(app).post('/api/auth/reset-password-request').send({ email });
            expect(res.statusCode).toBe(200);
            
            const reset = await db.get('SELECT * FROM password_resets');
            expect(reset).toBeDefined();
            expect(reset.token).toBeDefined();
        });

        /** Test password update using token. */
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

    describe('2FA - TOTP', () => {
        let userId;
        let agent;

        beforeEach(async () => {
            agent = request.agent(app);
            const signupRes = await agent.post('/api/auth/signup').send({
                email: 'totp.test@durham.ac.uk', password: 'Password123!', first_name: 'Two', last_name: 'Factor'
            });
            expect(signupRes.statusCode).toBe(201);

            const user = await db.get('SELECT id FROM users WHERE email = ?', ['totp.test@durham.ac.uk']);
            expect(user).toBeDefined();
            userId = user.id;
            // Login to establish session
            await agent.post('/api/auth/login').send({ email: 'totp.test@durham.ac.uk', password: 'Password123!' });
        });

        test('Setup generates QR code', async () => {
            const res = await agent.get('/api/auth/totp/setup');
            expect(res.statusCode).toBe(200);
            expect(res.body.secret).toBeDefined();
            expect(res.body.qrCodeData).toBeDefined();
        });
    });

    describe('2FA - Passkey', () => {
        let agent;
        const email = 'passkey.test@durham.ac.uk';
        let user;

        beforeEach(async () => {
            agent = request.agent(app);
            await agent.post('/api/auth/signup').send({
                email, password: 'Password123!', first_name: 'Key', last_name: 'Holder'
            });
            await agent.post('/api/auth/login').send({ email, password: 'Password123!' });
            user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        });

        test('Registration options are generated', async () => {
            const res = await agent.get('/api/auth/passkey/register-options');
            expect(res.statusCode).toBe(200);
            expect(res.body.challenge).toBeDefined();
            expect(res.body.user.name).toBe(email);
        });

        test('POST /api/auth/passkey/login-options - Success even if no email and no session (Discoverable Credentials)', async () => {
            // New agent without session
            const res = await request(app)
                .post('/api/auth/passkey/login-options')
                .send({});
            expect(res.statusCode).toBe(200);
            expect(res.body.challenge).toBeDefined();
            expect(res.body.allowCredentials).toBeUndefined();
        });

        test('POST /api/auth/passkey/login-options - Success even if user has no passkeys (Discoverable Credentials)', async () => {
            const res = await request(app)
                .post('/api/auth/passkey/login-options')
                .send({ email }); // User exists but has no passkeys
                
            expect(res.statusCode).toBe(200);
            expect(res.body.challenge).toBeDefined();
            expect(res.body.allowCredentials).toBeUndefined();
        });

        test('POST /api/auth/passkey/login-options - Success with email', async () => {
            // Create Passkey manually for the user
            const credentialID = 'validCredentialId123';
            const publicKey = Buffer.from('publicKey');
            // We use the internal method to save a fake passkey
            // Need to import AuthDB if we want to use its methods, or raw SQL.
            // AuthDB is not imported in this file, but we have 'db' access.
            // Let's use raw SQL or import AuthDB. AuthAPI uses AuthDB, so it's safer to use raw SQL for simple setup 
            // OR duplicate the logic. Let's rely on the fact that we can just insert into the DB directly.
            
            // Wait, previous test used AuthDB.saveAuthenticator. Let's import AuthDB at the top of this file first.
            // I'll add the import in a separate tool call or just use raw SQL here to avoid messing up imports now.
            
            await db.run(
                'INSERT INTO authenticators (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)',
                [credentialID, user.id, publicKey, 0, JSON.stringify(['usb'])]
            );

            const res = await request(app)
                .post('/api/auth/passkey/login-options')
                .send({ email });

            expect(res.statusCode).toBe(200);
            expect(res.body.challenge).toBeDefined();
            expect(res.body.allowCredentials).toHaveLength(1);
            expect(res.body.allowCredentials[0].id).toBe(credentialID);
        });
    });
});