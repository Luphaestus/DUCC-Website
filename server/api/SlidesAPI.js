/**
 * SlidesAPI.js
 * 
 * This file serves image paths for the home page slideshow from the database.
 * 
 * Routes:
 * - GET /api/slides/count: Fetch the total number of slide images.
 * - GET /api/slides/images: Fetch an array of all slide image paths.
 * - GET /api/slides/random: Fetch a random slide image path.
 * - POST /api/slides/import: Add a file from the library to slides.
 * - DELETE /api/slides: Remove a file from slides.
 */

const { statusObject } = require('../misc/status.js');
const SlidesDB = require('../db/slidesDB.js');
const check = require('../misc/authentication.js');

/**
 * API for managing and serving slideshow images.
 * @module SlidesAPI
 */
class SlidesAPI {
    /**
     * @param {object} app - Express app.
     * @param {object} db - Database connection.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers slides-related routes.
     */
    registerRoutes() {
        /**
         * Get the total number of slides.
         */
        this.app.get('/api/slides/count', async (req, res) => {
            const status = await SlidesDB.getSlideCount(this.db);
            status.getResponse(res);
        });

        /**
         * Get all slide image URLs.
         */
        this.app.get('/api/slides/images', async (req, res) => {
            const status = await SlidesDB.getSlides(this.db);
            if (status.isError()) return status.getResponse(res);
            const slides = status.getData();
            res.json({ 
                images: slides.map(s => s.url),
                slides: slides 
            });
        });

        /**
         * Get a random slide image URL.
         */
        this.app.get('/api/slides/random', async (req, res) => {
            const status = await SlidesDB.getSlides(this.db);
            if (status.isError()) return status.getResponse(res);
            
            const slides = status.getData();
            if (slides.length === 0) return res.status(404).json({ message: 'No slides found' });
            
            const randomSlide = slides[Math.floor(Math.random() * slides.length)];
            res.json({ image: randomSlide.url });
        });

        /**
         * Import a file from the central library into the slideshow.
         */
        this.app.post('/api/slides/import', check('file.write'), async (req, res) => {
            const { fileId } = req.body;
            if (!fileId) return res.status(400).json({ message: 'fileId is required' });

            const status = await SlidesDB.addSlide(this.db, fileId);
            status.getResponse(res);
        });

        /**
         * Remove a slide from the slideshow.
         */
        this.app.delete('/api/slides', check('file.write'), async (req, res) => {
            const { fileId } = req.body;
            if (!fileId) return res.status(400).json({ message: 'fileId is required' });

            const status = await SlidesDB.removeSlide(this.db, fileId);
            status.getResponse(res);
        });
    }
}

module.exports = SlidesAPI;
