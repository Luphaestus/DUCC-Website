/**
 * QuotesAPI.test.js
 * 
 * Tests for the Quotes API, specifically membership restrictions.
 */

import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { Authenticator } from 'passport';
import TestWorld from '../utils/TestWorld.js';
import QuotesAPI from '../../server/api/QuotesAPI.js';
import AuthAPI from '../../server/api/AuthAPI.js';
import bcrypt from 'bcrypt';

describe('api/QuotesAPI', () => {
    let app, db, passport;
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        db = world.db;
        
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

        // Register Auth for login support in tests
        new AuthAPI(app, db, passport).registerRoutes();
        new QuotesAPI(app, db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('GET /api/quotes - Unauthenticated fails', async () => {
        const res = await request(app).get('/api/quotes');
        expect(res.statusCode).toBe(401);
    });

    test('GET /api/quotes - Logged in non-member fails', async () => {
        const email = 'nonmember@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member) VALUES (?,?,?,?,?)', [email, hashed, 'Non', 'Member', 0]);

        const agent = request.agent(app);
        await agent.post('/api/auth/login').send({ email, password });

        const res = await agent.get('/api/quotes');
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/Only members/i);
    });

    test('GET /api/quotes - Logged in member succeeds', async () => {
        const email = 'member@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member) VALUES (?,?,?,?,?)', [email, hashed, 'Is', 'Member', 1]);

        const agent = request.agent(app);
        await agent.post('/api/auth/login').send({ email, password });

        const res = await agent.get('/api/quotes');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data.quotes)).toBe(true);
        expect(res.body.data.totalPages).toBeDefined();
    });

    test('GET /api/quotes/users - Logged in member succeeds', async () => {
        const email = 'member@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member) VALUES (?,?,?,?,?)', [email, hashed, 'Is', 'Member', 1]);

        const agent = request.agent(app);
        await agent.post('/api/auth/login').send({ email, password });

        const res = await agent.get('/api/quotes/users');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('GET /api/quotes/users - Logged in non-member fails', async () => {
        const email = 'nonmember@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member) VALUES (?,?,?,?,?)', [email, hashed, 'Non', 'Member', 0]);

        const agent = request.agent(app);
        await agent.post('/api/auth/login').send({ email, password });

        const res = await agent.get('/api/quotes/users');
        expect(res.statusCode).toBe(403);
    });

    test('GET /api/quotes - Filter by person: prefix works', async () => {
        const email = 'member@test.com';
        const password = 'password';
        const hashed = await bcrypt.hash(password, 10);
        await db.run('INSERT INTO users (email, hashed_password, first_name, last_name, is_member) VALUES (?,?,?,?,?)', [email, hashed, 'Is', 'Member', 1]);
        
        const user2Res = await db.run('INSERT INTO users (email, first_name, last_name) VALUES (?,?,?)', ['other@test.com', 'Target', 'Person']);
        const user2Id = user2Res.lastID;

        await db.run('INSERT INTO quotes (text, quoted_user_id, visibility) VALUES (?,?,?)', ['Match this', user2Id, 'public']);
        await db.run('INSERT INTO quotes (text, quoted_user_id, visibility) VALUES (?,?,?)', ['Exclude this', 1, 'public']);

        const agent = request.agent(app);
        await agent.post('/api/auth/login').send({ email, password });

        const res = await agent.get('/api/quotes?search=person:Target');
        expect(res.statusCode).toBe(200);
        expect(res.body.data.quotes.length).toBe(1);
        expect(res.body.data.quotes[0].text).toBe('Match this');

        const resFull = await agent.get('/api/quotes?search=person:Target Person');
        expect(resFull.statusCode).toBe(200);
        expect(resFull.body.data.quotes.length).toBe(1);
    });
});
