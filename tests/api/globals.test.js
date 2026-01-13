const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('/js/utils/db');
const GlobalsAPI = require('../../server/api/GlobalsAPI');
const Globals = require('../../server/misc/globals');

jest.mock('../../server/misc/globals');

describe('Globals API', () => {
    let app;
    let db;
    let presidentId;
    let mockGlobals;

    beforeEach(async () => {
        db = await setupTestDb();

        // Mock Globals instance
        mockGlobals = {
            getInt: jest.fn(),
            get: jest.fn(),
            getAll: jest.fn(),
            set: jest.fn()
        };
        Globals.mockImplementation(() => mockGlobals);

        const res = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['pres@durham.ac.uk', 'Pres', 'Ident', 1]
        );
        presidentId = res.lastID;
        mockGlobals.getInt.mockImplementation((key) => {
            if (key === 'President') return presidentId;
            return 0;
        });

        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            const authHeader = req.headers['x-mock-user'];
            if (authHeader === 'president') {
                req.isAuthenticated = () => true;
                req.user = { id: presidentId, email: 'pres@durham.ac.uk' };
            } else if (authHeader === 'user') {
                req.isAuthenticated = () => true;
                req.user = { id: 999, email: 'user@durham.ac.uk' };
            } else {
                req.isAuthenticated = () => false;
            }
            next();
        });

        const globalsAPI = new GlobalsAPI(app, db);
        globalsAPI.registerRoutes();
    });

    afterEach(async () => {
        await db.close();
    });

    test('GET /api/globals/status returns true for president', async () => {
        const res = await request(app)
            .get('/api/globals/status')
            .set('x-mock-user', 'president');
        expect(res.body.isPresident).toBe(true);
    });

    test('GET /api/globals/status returns false for regular user', async () => {
        const res = await request(app)
            .get('/api/globals/status')
            .set('x-mock-user', 'user');
        expect(res.body.isPresident).toBe(false);
    });

    test('GET /api/globals requires president', async () => {
        const res = await request(app)
            .get('/api/globals')
            .set('x-mock-user', 'user');
        expect(res.statusCode).toBe(403);
    });

    test('GET /api/globals works for president', async () => {
        mockGlobals.getAll.mockReturnValue({ Key: 'Value' });
        const res = await request(app)
            .get('/api/globals')
            .set('x-mock-user', 'president');
        expect(res.statusCode).toBe(200);
        expect(res.body.res).toEqual({ Key: 'Value' });
    });

    test('POST /api/globals/:key updates value', async () => {
        const res = await request(app)
            .post('/api/globals/SomeKey')
            .set('x-mock-user', 'president')
            .send({ value: 'NewValue' });

        expect(res.statusCode).toBe(200);
        expect(mockGlobals.set).toHaveBeenCalledWith('SomeKey', 'NewValue');
    });

    test('GET /api/globals/public/:key returns whitelisted values', async () => {
        mockGlobals.get.mockImplementation((key) => {
            if (key === 'MembershipCost') return 50;
            return null;
        });

        const res = await request(app)
            .get('/api/globals/public/MembershipCost,SecretKey')
            .set('x-mock-user', 'user');

        expect(res.statusCode).toBe(200);
        expect(res.body.res).toEqual({ MembershipCost: 50 });
        expect(res.body.res.SecretKey).toBeUndefined();
    });
});
