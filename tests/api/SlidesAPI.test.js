const request = require('supertest');
const express = require('express');
const fs = require('fs');
const SlidesAPI = require('../../server/api/SlidesAPI');

describe('api/SlidesAPI', () => {
    let app, slidesAPI;

    beforeEach(async () => {
        vi.spyOn(fs.promises, 'readdir').mockResolvedValue([
            { isFile: () => true, name: 'slide1.png' },
            { isFile: () => true, name: 'slide2.jpg' }
        ]);
        vi.spyOn(fs, 'watch').mockReturnValue({ on: vi.fn(), close: vi.fn() });

        app = express();
        slidesAPI = new SlidesAPI(app);
        await slidesAPI.scan();
        slidesAPI.registerRoutes();
    });

    afterEach(() => {
        slidesAPI.close();
        vi.restoreAllMocks();
    });

    test('GET /api/slides/count', async () => {
        const res = await request(app).get('/api/slides/count');
        expect(res.body.count).toBe(2);
    });

    test('GET /api/slides/images', async () => {
        const res = await request(app).get('/api/slides/images');
        expect(res.body.images).toContain('/images/slides/slide1.png');
    });

    test('GET /api/slides/random', async () => {
        const res = await request(app).get('/api/slides/random');
        expect(res.body.image).toBeDefined();
    });
});
