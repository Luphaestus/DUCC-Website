const TestWorld = require('../utils/TestWorld');
const FilesAPI = require('../../server/api/FilesAPI');
const path = require('path');
const fs = require('fs');

describe('FilesAPI Hashing and Deduplication', () => {
    let world;
    const testFile1 = path.join(__dirname, '../utils/test_image.png');
    
    beforeAll(async () => {
        world = new TestWorld();
        await world.setUp();
        
        // Initialize the API in the app
        const filesAPI = new FilesAPI(world.app, world.db);
        filesAPI.registerRoutes();

        if (!fs.existsSync(testFile1)) {
            fs.writeFileSync(testFile1, 'dummy image content');
        }
    });

    afterAll(async () => {
        await world.tearDown();
    });

    it('should reuse the same filename for identical content', async () => {
        await world.createRole('admin_role', ['file.write']);
        await world.createUser('admin', {}, ['admin_role']);
        
        const res1 = await world.as('admin')
            .post('/api/files')
            .attach('files', testFile1)
            .field('title', 'First Upload');
        
        expect(res1.status).toBe(201);
        const fileId1 = res1.body.ids[0];
        
        const file1 = await world.db.get('SELECT * FROM files WHERE id = ?', fileId1);
        const filename1 = file1.filename;

        const res2 = await world.as('admin')
            .post('/api/files')
            .attach('files', testFile1)
            .field('title', 'Second Upload');
        
        expect(res2.status).toBe(201);
        const fileId2 = res2.body.ids[0];
        
        const file2 = await world.db.get('SELECT * FROM files WHERE id = ?', fileId2);
        const filename2 = file2.filename;

        expect(filename1).toBe(filename2);
        expect(fileId1).not.toBe(fileId2);
        expect(file1.hash).toBe(file2.hash);
    });

    it('should use different filenames for different content', async () => {
        const testFile2 = path.join(__dirname, '../utils/test_image_2.png');
        fs.writeFileSync(testFile2, 'different content');

        const res1 = await world.as('admin')
            .post('/api/files')
            .attach('files', testFile1);
        
        const fileId1 = res1.body.ids[0];
        const file1 = await world.db.get('SELECT * FROM files WHERE id = ?', fileId1);

        const res2 = await world.as('admin')
            .post('/api/files')
            .attach('files', testFile2);
        
        const fileId2 = res2.body.ids[0];
        const file2 = await world.db.get('SELECT * FROM files WHERE id = ?', fileId2);

        expect(file1.filename).not.toBe(file2.filename);
        expect(file1.hash).not.toBe(file2.hash);

        if (fs.existsSync(testFile2)) fs.unlinkSync(testFile2);
    });
});
