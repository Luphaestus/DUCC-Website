/**
 * AuthAPI.test.js
 * 
 * Authentication API tests.
 */

import Fastify from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import fastifyPassport from '@fastify/passport';
import TestWorld from '../utils/TestWorld.js';
import AuthAPI from '../../server/api/AuthAPI.js';
import UserAPI from '../../server/api/users/UserAPI.js';
import bcrypt from 'bcrypt';
import config from '../../server/config.js';

describe('api/AuthAPI', () => {
    let app, db, auth;
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        db = world.db;
        
        app = Fastify();
        await app.register(fastifyCookie);
        await app.register(fastifySession, { 
            secret: 'test-secret-must-be-long-enough-for-session-plugin', 
            cookieName: config.session.cookieName,
            saveUninitialized: true,
            cookie: { secure: false }
        });
        await app.register(fastifyPassport.initialize());
        await app.register(fastifyPassport.secureSession());

        app.addHook('preHandler', async (request) => {
            request.db = db;
        });

        auth = new AuthAPI(app, db, fastifyPassport);
        auth.registerRoutes();
        
        new UserAPI(app, db).registerRoutes();
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        await world.tearDown();
    });

    describe('Signup & Registration', () => {
        test('POST /api/auth/signup - Success', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: {
                    email: 'new.user@durham.ac.uk',
                    password: 'password123',
                    first_name: 'New',
                    last_name: 'User'
                }
            });
            expect(res.statusCode).toBe(201);
        });

        test('Account Restoration: Actually calling deleteAccount then re-signing up', async () => {
            const email = 'rejoiner.real@durham.ac.uk';
            const password = 'securePassword123';
            
            // Create user
            await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: { email, password, first_name: 'Old', last_name: 'Name' }
            });
            await db.run('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);

            // Login
            const loginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { email, password }
            });
            console.log('Login Headers:', loginRes.headers);
            console.log('Login Cookies:', loginRes.cookies);
            const cookies = loginRes.cookies;

            const userRow = await db.get('SELECT id FROM users WHERE email = ?', [email]);
            await db.run('UPDATE users SET swims = 10 WHERE id = ?', [userRow.id]);

            // Soft-delete
            const deleteRes = await app.inject({
                method: 'POST',
                url: '/api/user/deleteAccount',
                payload: { password },
                cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
            });
            expect(deleteRes.statusCode).toBe(200);

            // Re-signup
            const signupRes = await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: { email, password, first_name: 'Restored', last_name: 'User' }
            });
            expect(signupRes.statusCode).toBe(200);
            expect(JSON.parse(signupRes.body).message).toMatch(/restored/i);

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
            await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_verified) VALUES (?,?,?,?,1)', [email, hashed, 'L', 'T']);
        });

        test('POST /api/auth/login success', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { email, password }
            });
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).user.email).toBe(email);
        });
        
        test('POST /api/auth/login fail (wrong password)', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { email, password: 'wrong' }
            });
            expect(res.statusCode).toBe(401);
        });

        test('GET /api/auth/status verifies session', async () => {
            const loginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { email, password }
            });
            const res = await app.inject({
                method: 'GET',
                url: '/api/auth/status',
                cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
            });
            expect(JSON.parse(res.body).authenticated).toBe(true);
        });
    });

    describe('Password Resets', () => {
        const email = 'reset.test@durham.ac.uk';

        beforeEach(async () => {
            await db.run('INSERT INTO users (email, first_name, last_name) VALUES (?,?,?)', [email, 'R', 'T']);
        });

        test('POST /api/auth/reset-password-request creates token', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/auth/reset-password-request',
                payload: { email }
            });
            expect(res.statusCode).toBe(200);
            
            const reset = await db.get('SELECT * FROM password_resets');
            expect(reset).toBeDefined();
            expect(reset.token).toBeDefined();
        });

        test('POST /api/auth/set-password updates password', async () => {
            await app.inject({
                method: 'POST',
                url: '/api/auth/reset-password-request',
                payload: { email }
            });
            const reset = await db.get('SELECT * FROM password_resets');
            const resetToken = reset.token;

            const res = await app.inject({
                method: 'POST',
                url: '/api/auth/set-password',
                payload: {
                    token: resetToken,
                    password: 'newSecretPassword123'
                }
            });
            expect(res.statusCode).toBe(200);

            const user = await db.get('SELECT hashed_password FROM users WHERE email = ?', [email]);
            expect(await bcrypt.compare('newSecretPassword123', user.hashed_password)).toBe(true);
        });
    });

    describe('2FA - TOTP', () => {
        let agent; // Not used in fastify inject but kept for flow
        const email = 'totp.test@durham.ac.uk';
        const password = 'Password123!';

        beforeEach(async () => {
            await app.inject({
                method: 'POST',
                url: '/api/auth/signup',
                payload: { email, password, first_name: 'Two', last_name: 'Factor' }
            });
            await db.run('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);
        });

        test('Setup generates QR code', async () => {
            const loginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { email, password }
            });
            
            const res = await app.inject({
                method: 'GET',
                url: '/api/auth/totp/setup',
                cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
            });
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.secret).toBeDefined();
            expect(body.qrCodeData).toBeDefined();
        });
    });
});
