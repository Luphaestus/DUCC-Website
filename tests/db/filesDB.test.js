const TestWorld = require('../utils/TestWorld');
const FilesDB = require('../../server/db/filesDB');

describe('db/filesDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('createFile and getFileById', async () => {
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

    test('getFiles filters by role', async () => {
        await FilesDB.createFile(world.db, { title: 'Public', filename: 'pub.txt', visibility: 'public' });
        await FilesDB.createFile(world.db, { title: 'Member', filename: 'mem.txt', visibility: 'members' });
        await FilesDB.createFile(world.db, { title: 'Exec', filename: 'exe.txt', visibility: 'execs' });

        const pubRes = await FilesDB.getFiles(world.db, {}, 'public');
        expect(pubRes.getData().files.length).toBe(1);

        const memRes = await FilesDB.getFiles(world.db, {}, 'member');
        expect(memRes.getData().files.length).toBe(2);

        const exeRes = await FilesDB.getFiles(world.db, {}, 'exec');
        expect(exeRes.getData().files.length).toBe(3);
    });
});
