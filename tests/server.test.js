const request = require('supertest');
const { serverReady } = require('../server/server');

describe('Main App', () => {
    let app;
    let db;

    beforeAll(async () => {
        const ready = await serverReady;
        app = ready.app;
        db = ready.db;
    });

    afterAll(async () => {
        if (db) {
            await db.close();
        }
    });

    test('GET /api/health should return 200 OK', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('OK');
    });

    test('GET / should return the index.html (SPA catch-all)', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });

    test('GET /random-route should return the index.html (SPA catch-all)', async () => {
        const res = await request(app).get('/random-route');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });
});