/**
 * SlidesAPI.ts
 * 
 * This file serves image paths for the home page slideshow from the database.
 */

import SlidesDB from '../db/slidesDB.js';
import check from '../misc/authentication.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';

export default class SlidesAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify app.
     * @param {object} db - Database connection.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
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
        this.app.get('/api/slides/count', async (request: FastifyRequest, reply: FastifyReply) => {
            const status = await SlidesDB.getSlideCount(this.db);
            return status.getResponse(reply);
        });

        /**
         * Get all slide image URLs.
         */
        this.app.get('/api/slides/images', async (request: FastifyRequest, reply: FastifyReply) => {
            const status = await SlidesDB.getSlides(this.db);
            if (status.isError()) return status.getResponse(reply);
            const slides = status.getData();
            return reply.send({ 
                images: slides.map((s: any) => s.url),
                slides: slides 
            });
        });

        /**
         * Get a random slide image URL.
         */
        this.app.get('/api/slides/random', async (request: FastifyRequest, reply: FastifyReply) => {
            const status = await SlidesDB.getSlides(this.db);
            if (status.isError()) return status.getResponse(reply);
            
            const slides = status.getData();
            if (slides.length === 0) return reply.status(404).send({ message: 'No slides found' });
            
            const randomSlide = slides[Math.floor(Math.random() * slides.length)];
            return reply.send({ image: randomSlide.url });
        });

        /**
         * Import a file from the central library into the slideshow.
         */
        this.app.post('/api/slides/import', { preHandler: [check('file.write')] }, async (request: FastifyRequest<{ Body: { fileId: string } }>, reply: FastifyReply) => {
            const { fileId } = request.body;
            if (!fileId) return reply.status(400).send({ message: 'fileId is required' });

            const status = await SlidesDB.addSlide(this.db, fileId);
            return status.getResponse(reply);
        });

        /**
         * Remove a slide from the slideshow.
         */
        this.app.delete('/api/slides', { preHandler: [check('file.write')] }, async (request: FastifyRequest<{ Body: { fileId: string } }>, reply: FastifyReply) => {
            const { fileId } = request.body;
            if (!fileId) return reply.status(400).send({ message: 'fileId is required' });

            const status = await SlidesDB.removeSlide(this.db, fileId);
            return status.getResponse(reply);
        });
    }
}