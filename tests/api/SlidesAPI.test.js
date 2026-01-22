/**
 * SlidesAPI.test.js
 * 
 * Functional tests for the slideshow image scanner.
 * Verifies that the system correctly identifies images and provides paths for the home page slider.
 */

const request = require('supertest');
const express = require('express');
const fs = require('fs');
const SlidesAPI = require('../../server/api/SlidesAPI');

describe('api/SlidesAPI', () => {
    let app, slidesAPI;

    beforeEach(async () => {
        // Mock directory listing to simulate actual images
        vi.spyOn(fs.promises, 'readdir').mockResolvedValue([
            { isFile: () => true, name: 'slide1.png' },
            { isFile: () => true, name: 'slide2.jpg' }
        ]);
        // Mock directory watcher to avoid real file system hooks
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

    /**
     * Test that the count endpoint returns the correct number of files found in the scan.
     */
    test('GET /api/slides/count', async () => {
        const res = await request(app).get('/api/slides/count');
        expect(res.body.count).toBe(2);
    });

    /**
     * Test that image paths are returned in the correct format for public access.
     */
    test('GET /api/slides/images', async () => {
        const res = await request(app).get('/api/slides/images');
        expect(res.body.images).toContain('/images/slides/slide1.png');
    });

    /**
     * Test random selection functionality.
     */
    test('GET /api/slides/random', async () => {
        const res = await request(app).get('/api/slides/random');
        expect(res.body.image).toBeDefined();
    });
});