/**
 * FilesAPI_hashing.test.js
 * 
 * Tests for file content deduplication.
 * Verifies that the system calculates SHA-256 hashes correctly and reuses existing file storage 
 * when identical content is uploaded.
 */

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
        
        const filesAPI = new FilesAPI(world.app, world.db);
        filesAPI.registerRoutes();

        // Create a dummy physical file for testing
        if (!fs.existsSync(testFile1)) {
            fs.writeFileSync(testFile1, 'dummy image content');
        }
    });

    afterAll(async () => {
        await world.tearDown();
    });

    /**
     * Test logic: 
     * 1. Upload a file.
     * 2. Upload the same file again.
     * 3. Verify that both DB records point to the same physical filename.
     */
    it('should reuse the same filename for identical content (deduplication)', async () => {
        await world.createRole('admin_role', ['file.write']);
        await world.createUser('admin', {}, ['admin_role']);
        
        // First upload
        const res1 = await world.as('admin')
            .post('/api/files')
            .attach('files', testFile1)
            .field('title', 'First Upload');
        
        expect(res1.status).toBe(201);
        const fileId1 = res1.body.ids[0];
        
        const file1 = await world.db.get('SELECT * FROM files WHERE id = ?', fileId1);
        const filename1 = file1.filename;

        // Second upload (identical content)
        const res2 = await world.as('admin')
            .post('/api/files')
            .attach('files', testFile1)
            .field('title', 'Second Upload');
        
        expect(res2.status).toBe(201);
        const fileId2 = res2.body.ids[0];
        
        const file2 = await world.db.get('SELECT * FROM files WHERE id = ?', fileId2);
        const filename2 = file2.filename;

        // Filenames should match, but IDs should be unique
        expect(filename1).toBe(filename2);
        expect(fileId1).not.toBe(fileId2);
        expect(file1.hash).toBe(file2.hash);
    });

    /**
     * Test logic:
     * 1. Upload two different files.
     * 2. Verify that they receive unique filenames and hashes.
     */
    it('should use unique filenames for different content', async () => {
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

        // Cleanup
        if (fs.existsSync(testFile2)) fs.unlinkSync(testFile2);
    });
});