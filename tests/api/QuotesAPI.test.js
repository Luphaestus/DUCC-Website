/**
 * QuotesAPI.test.js
 * 
 * Tests for the Quotes API, specifically membership restrictions.
 */

import Fastify from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import fastifyPassport from '@fastify/passport';
import TestWorld from '../utils/TestWorld.js';
import QuotesAPI from '../../server/api/QuotesAPI.js';
import AuthAPI from '../../server/api/AuthAPI.js';
import bcrypt from 'bcrypt';
import config from '../../server/config.js';

describe('api/QuotesAPI', () => {
    let app, db;
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

        // Register Auth for login support in tests
        new AuthAPI(app, db, fastifyPassport).registerRoutes();
        new QuotesAPI(app, db).registerRoutes();
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        await world.tearDown();
    });

    test('GET /api/quotes - Unauthenticated fails', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/quotes'
        });
        expect(res.statusCode).toBe(401);
    });

    test('GET /api/quotes - Logged in non-member fails', async () => {
        const email = 'nonmember@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member, is_verified) VALUES (?,?,?,?,?,1)', [email, hashed, 'Non', 'Member', 0]);

        const loginRes = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email, password }
        });

        const res = await app.inject({
            method: 'GET',
            url: '/api/quotes',
            cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
        });
        expect(res.statusCode).toBe(403);
        expect(JSON.parse(res.body).message).toMatch(/Only members/i);
    });

    test('GET /api/quotes - Logged in member succeeds', async () => {
        const email = 'member@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member, is_verified) VALUES (?,?,?,?,?,1)', [email, hashed, 'Is', 'Member', 1]);

        const loginRes = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email, password }
        });

        const res = await app.inject({
            method: 'GET',
            url: '/api/quotes',
            cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(Array.isArray(body.data.quotes)).toBe(true);
        expect(body.data.totalPages).toBeDefined();
    });

    test('GET /api/quotes/users - Logged in member succeeds', async () => {
        const email = 'member@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member, is_verified) VALUES (?,?,?,?,?,1)', [email, hashed, 'Is', 'Member', 1]);

        const loginRes = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email, password }
        });

        const res = await app.inject({
            method: 'GET',
            url: '/api/quotes/users',
            cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
        });
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(JSON.parse(res.body))).toBe(true);
    });

    test('GET /api/quotes/users - Logged in non-member fails', async () => {
        const email = 'nonmember@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member, is_verified) VALUES (?,?,?,?,?,1)', [email, hashed, 'Non', 'Member', 0]);

        const loginRes = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email, password }
        });

        const res = await app.inject({
            method: 'GET',
            url: '/api/quotes/users',
            cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
        });
        expect(res.statusCode).toBe(403);
    });

    test('GET /api/quotes - Filter by person: prefix works', async () => {
        const email = 'member@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member, is_verified) VALUES (?,?,?,?,?,1)', [email, hashed, 'Is', 'Member', 1]);
        
        const user2Res = await db.run('INSERT INTO users (email, first_name, last_name) VALUES (?,?,?)', ['other@test.com', 'Target', 'Person']);
        const user2Id = user2Res.lastID;

        await db.run('INSERT INTO quotes (text, quoted_user_id, visibility) VALUES (?,?,?)', ['Match this', user2Id, 'public']);
        await db.run('INSERT INTO quotes (text, quoted_user_id, visibility) VALUES (?,?,?)', ['Exclude this', 1, 'public']);

        const loginRes = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { email, password }
        });

        const res = await app.inject({
            method: 'GET',
            url: '/api/quotes?search=person:Target',
            cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.data.quotes.length).toBe(1);
        expect(body.data.quotes[0].text).toBe('Match this');

        const resFull = await app.inject({
            method: 'GET',
            url: '/api/quotes?search=person:Target%20Person',
            cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
        });
        expect(resFull.statusCode).toBe(200);
        expect(JSON.parse(resFull.body).data.quotes.length).toBe(1);
    });
});