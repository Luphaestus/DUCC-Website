const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const GlobalsAPI = require('../../server/api/GlobalsAPI');
const Globals = require('../../server/misc/globals');

describe('Globals API', () => {
    let app;
    let db;
    let presidentId;

    beforeEach(async () => {
        db = await setupTestDb();

        // Spy on Globals methods
        vi.spyOn(Globals.prototype, 'getInt').mockImplementation((key) => (key === 'President' ? 1 : 0));
        vi.spyOn(Globals.prototype, 'getFloat').mockReturnValue(0);
        vi.spyOn(Globals.prototype, 'get').mockReturnValue(null);
        vi.spyOn(Globals.prototype, 'getAll').mockReturnValue({});
        vi.spyOn(Globals.prototype, 'set').mockImplementation(() => {});

        // Create President Role
        await db.run("INSERT INTO roles (name, description) VALUES ('President', 'Club President')");
        const presidentRole = await db.get("SELECT id FROM roles WHERE name = 'President'");

        const res = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['pres@durham.ac.uk', 'Pres', 'Ident', 1]
        );
        presidentId = res.lastID;
        
        // Assign President role
        await db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [presidentId, presidentRole.id]);

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
        vi.restoreAllMocks();
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
        Globals.prototype.getAll.mockReturnValue({ Key: 'Value' });
        Globals.prototype.getInt.mockImplementation((key) => key === 'President' ? presidentId : 0);

        const res = await request(app)
            .get('/api/globals')
            .set('x-mock-user', 'president');
        expect(res.statusCode).toBe(200);
        expect(res.body.res).toEqual({ Key: 'Value', President: presidentId });
    });

    test('POST /api/globals/:key updates value', async () => {
        const res = await request(app)
            .post('/api/globals/SomeKey')
            .set('x-mock-user', 'president')
            .send({ value: 'NewValue' });

        expect(res.statusCode).toBe(200);
        expect(Globals.prototype.set).toHaveBeenCalledWith('SomeKey', 'NewValue');
    });
});
