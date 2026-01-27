/**
 * slidesDB.test.js
 * 
 * Database layer tests for slideshow images.
 * Covers slide addition, retrieval, and removal.
 */

import TestWorld from '../utils/TestWorld.js';
import SlidesDB from '../../server/db/slidesDB.js';

describe('db/slidesDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('addSlide and getSlides', async () => {
        const fileId = await world.createFile('Slide1');
        await SlidesDB.addSlide(world.db, fileId);

        const res = await SlidesDB.getSlides(world.db);
        const data = res.getData();
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(fileId);
        expect(data[0].url).toBe(`/api/files/${fileId}/download?view=true`);
    });

    test('removeSlide', async () => {
        const fileId = await world.createFile('Slide1');
        await SlidesDB.addSlide(world.db, fileId);
        
        await SlidesDB.removeSlide(world.db, fileId);
        const res = await SlidesDB.getSlides(world.db);
        expect(res.getData()).toHaveLength(0);
    });

    test('getSlideCount', async () => {
        const fileId1 = await world.createFile('Slide1');
        const fileId2 = await world.createFile('Slide2');
        await SlidesDB.addSlide(world.db, fileId1);
        await SlidesDB.addSlide(world.db, fileId2);

        const res = await SlidesDB.getSlideCount(world.db);
        expect(res.getData()).toBe(2);
    });
});