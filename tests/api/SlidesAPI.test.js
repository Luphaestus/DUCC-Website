/**
 * SlidesAPI.test.js
 * 
 * Functional tests for the slideshow image API.
 * Verifies that the system correctly manages slide images in the database.
 */

const SlidesAPI = require('../../server/api/SlidesAPI');
const TestWorld = require('../utils/TestWorld');

describe('api/SlidesAPI', () => {
    let world;
    let slidesAPI;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        slidesAPI = new SlidesAPI(world.app, world.db);
        slidesAPI.registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('GET /api/slides/count', async () => {
        const fileId = await world.createFile('Slide1');
        await world.db.run('INSERT INTO slides (file_id) VALUES (?)', [fileId]);

        const res = await world.request.get('/api/slides/count');
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toBe(1);
    });

    test('GET /api/slides/images', async () => {
        const fileId = await world.createFile('Slide1');
        await world.db.run('INSERT INTO slides (file_id) VALUES (?)', [fileId]);

        const res = await world.request.get('/api/slides/images');
        expect(res.statusCode).toBe(200);
        expect(res.body.images).toContain(`/api/files/${fileId}/download?view=true`);
    });

    test('GET /api/slides/random', async () => {
        const fileId = await world.createFile('Slide1');
        await world.db.run('INSERT INTO slides (file_id) VALUES (?)', [fileId]);

        const res = await world.request.get('/api/slides/random');
        expect(res.statusCode).toBe(200);
        expect(res.body.image).toBe(`/api/files/${fileId}/download?view=true`);
    });

    test('POST /api/slides/import and DELETE /api/slides', async () => {
        await world.createRole('admin', ['file.write']);
        await world.createUser('admin', {}, ['admin']);
        const fileId = await world.createFile('Slide1');

        // Import
        const resImport = await world.as('admin').post('/api/slides/import').send({ fileId });
        expect(resImport.statusCode).toBe(201);

        const countRes = await world.request.get('/api/slides/count');
        expect(countRes.body.data).toBe(1);

        // Delete
        const resDelete = await world.as('admin').delete('/api/slides').send({ fileId });
        expect(resDelete.statusCode).toBe(200);

        const countRes2 = await world.request.get('/api/slides/count');
        expect(countRes2.body.data).toBe(0);
    });
});
