/**
 * filesDB.test.js
 * 
 * Database layer tests for file metadata and categories.
 * Verifies insertion, retrieval by ID, and role-based visibility filtering.
 */

import TestWorld from '../utils/TestWorld.js';
import FilesDB from '../../server/db/filesDB.js';

describe('db/filesDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('createFile and getFileById correctly stores and retrieves metadata', async () => {
        const fileData = {
            title: 'Test File',
            filename: 'test.png',
            size: 1024,
            visibility: 'public'
        };
        const res = await FilesDB.createFile(world.db, fileData);
        expect(res.getStatus()).toBe(201);
        const fileId = res.getData().id;

        const getRes = await FilesDB.getFileById(world.db, fileId);
        expect(getRes.getData().title).toBe('Test File');
    });

    /**
     * Verifies that the SQL filtering correctly applies role-based visibility.
     */
    test('getFiles correctly applies role-based visibility filters', async () => {
        await FilesDB.createFile(world.db, { title: 'Public', filename: 'pub.txt', visibility: 'public' });
        await FilesDB.createFile(world.db, { title: 'Member', filename: 'mem.txt', visibility: 'members' });
        await FilesDB.createFile(world.db, { title: 'Exec', filename: 'exe.txt', visibility: 'execs' });

        // Guest sees only 1 file (public)
        const pubRes = await FilesDB.getFiles(world.db, {}, 'public');
        expect(pubRes.getData().files.length).toBe(1);

        // Member sees 2 files (public + members)
        const memRes = await FilesDB.getFiles(world.db, {}, 'member');
        expect(memRes.getData().files.length).toBe(2);

        // Exec sees all 3 files
        const exeRes = await FilesDB.getFiles(world.db, {}, 'exec');
        expect(exeRes.getData().files.length).toBe(3);
    });
});
