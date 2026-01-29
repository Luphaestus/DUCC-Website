/**
 * server.test.js
 * 
 * Express server tests.
 */

import request from 'supertest';
import { serverReady } from '../server/server.js';

describe('Main Express Application', () => {
    let app;
    let db;

    beforeAll(async () => {
        // Wait for the dynamic bootstrapping process to finish
        const ready = await serverReady;
        app = ready.app;
        db = ready.db;
    });

    afterAll(async () => {
        // Ensure database connection is closed after all tests
        if (db) {
            await db.close();
        }
    });

    /** Test health check endpoint. */
    test('GET /api/health returns 200 OK', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });

    /** Test SPA root entry. */
    test('GET / returns index.html (SPA Entry)', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });

    /** Test SPA fallback. */
    test('GET /arbitrary-route returns index.html (SPA fallback)', async () => {
        const res = await request(app).get('/arbitrary-route');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });
});