const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const SlidesAPI = require('../../server/api/SlidesAPI');

describe('Slides API', () => {
    let app;
    let slidesAPI;
    let readdirSpy;
    let watchSpy;

    beforeEach(async () => {
        // Spy on fs.promises.readdir
        readdirSpy = vi.spyOn(fs.promises, 'readdir').mockResolvedValue([
            { isFile: () => true, name: 'slide1.png' },
            { isFile: () => true, name: 'slide2.jpg' },
            { isFile: () => false, name: 'folder' },
            { isFile: () => true, name: 'notimage.txt' }
        ]);

        // Spy on fs.watch (return a dummy watcher)
        watchSpy = vi.spyOn(fs, 'watch').mockImplementation(() => ({
            on: vi.fn(),
            close: vi.fn()
        }));

        app = express();
        slidesAPI = new SlidesAPI(app);
        // Wait for _init to complete (it calls scan)
        await slidesAPI.scan();
        slidesAPI.registerRoutes();
    });

    afterEach(() => {
        if (slidesAPI) slidesAPI.close();
        vi.restoreAllMocks();
    });

    test('GET /api/slides/count returns correct count', async () => {
        const res = await request(app).get('/api/slides/count');
        expect(res.statusCode).toBe(200);
        expect(res.body.count).toBe(2); // slide1.png, slide2.jpg
    });

    test('GET /api/slides/images returns all image paths', async () => {
        const res = await request(app).get('/api/slides/images');
        expect(res.statusCode).toBe(200);
        expect(res.body.images).toContain('/images/slides/slide1.png');
        expect(res.body.images).toContain('/images/slides/slide2.jpg');
    });

    test('GET /api/slides/random returns one image', async () => {
        const res = await request(app).get('/api/slides/random');
        expect(res.statusCode).toBe(200);
        expect(['/images/slides/slide1.png', '/images/slides/slide2.jpg']).toContain(res.body.image);
    });

    test('GET /api/slides/:index returns correct image', async () => {
        const res = await request(app).get('/api/slides/0');
        expect(res.statusCode).toBe(200);
        expect(res.body.image).toBe('/images/slides/slide1.png');
    });

    test('GET /api/slides/:index returns 404 for out of bounds', async () => {
        const res = await request(app).get('/api/slides/99');
        expect(res.statusCode).toBe(404);
    });
});
