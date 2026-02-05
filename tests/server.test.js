/**
 * server.test.js
 * 
 * Fastify server tests.
 */

import { serverReady } from '../server/server.js';

describe('Main Fastify Application', () => {
    let app;
    let db;

    beforeAll(async () => {
        // Wait for the dynamic bootstrapping process to finish
        const ready = await serverReady;
        app = ready.fastify || ready.app;
        db = ready.db;
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
        if (db) {
            await db.close();
        }
    });

    /** Test health check endpoint. */
    test('GET /api/health returns 200 OK', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/health'
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({ ok: true });
    });

    /** Test SPA root entry. */
    test('GET / returns index.html (SPA Entry)', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/'
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });

    /** Test SPA fallback. */
    test('GET /arbitrary-route returns index.html (SPA fallback)', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/arbitrary-route'
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/html');
    });
});
