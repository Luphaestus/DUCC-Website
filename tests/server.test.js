/**
 * server.test.js
 * 
 * High-level integration tests for the Express server.
 * Verifies that the server boots correctly and serves the core SPA entry point.
 */

const request = require('supertest');
const { serverReady } = require('../server/server');

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

    /**
     * Test the basic health check endpoint used by monitors and deployments.
     */
    test('GET /api/health returns 200 OK', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('OK');
    });

    /**
     * Test SPA behavior: index.html should be served for the root path.
     */
    test('GET / returns index.html (SPA Entry)', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });

    /**
     * Test SPA behavior: any non-API route should serve index.html (client-side routing).
     */
    test('GET /arbitrary-route returns index.html (SPA fallback)', async () => {
        const res = await request(app).get('/arbitrary-route');
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });
});