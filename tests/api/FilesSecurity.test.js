/**
 * FilesSecurity.test.js
 * 
 * Security and out-of-bounds tests for Files API.
 */

import TestWorld from '../utils/TestWorld.js';
import FilesAPI from '../../server/api/FilesAPI.js';
import FilesDB from '../../server/db/filesDB.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('api/FilesSecurity', () => {
    let world;
    let testUploadDir;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        testUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ducc-files-security-test-'));
        
        await world.createRole('Admin', ['file.read', 'file.write', 'file.edit']);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('member', { is_member: 1 }, []);

        new FilesAPI(world.app, world.db, null, testUploadDir).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
        if (fs.existsSync(testUploadDir)) {
            fs.rmSync(testUploadDir, { recursive: true, force: true });
        }
    });

    describe('System File Protection', () => {
        test('Admin cannot delete system-authored files', async () => {
            const fileId = await world.createFile('SystemLogo', { author: 'System', filename: 'logo.png' });
            fs.writeFileSync(path.join(testUploadDir, 'logo.png'), 'logo content');

            const res = await world.as('admin').delete(`/api/files/${fileId}`);
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toContain('Cannot delete system-authored files');

            // Verify file still exists in DB and disk
            const file = await world.db.get('SELECT * FROM files WHERE id = ?', [fileId]);
            expect(file).toBeDefined();
            expect(fs.existsSync(path.join(testUploadDir, 'logo.png'))).toBe(true);
        });

        test('Normal users cannot delete any files', async () => {
            const fileId = await world.createFile('UserFile', { author: 'User', filename: 'user.png' });
            const res = await world.as('member').delete(`/api/files/${fileId}`);
            expect(res.statusCode).toBe(403);
        });
    });

    describe('File Replacement Security', () => {
        test('Admin can replace a file using libraryFileId', async () => {
            const targetId = await world.createFile('Target', { filename: 'target.png', hash: 'h1' });
            const sourceId = await world.createFile('Source', { filename: 'source.png', hash: 'h2' });
            
            fs.writeFileSync(path.join(testUploadDir, 'target.png'), 'old content');
            fs.writeFileSync(path.join(testUploadDir, 'source.png'), 'new content');

            const res = await world.as('admin').put(`/api/files/${targetId}`, {
                libraryFileId: sourceId,
                title: 'Still Target'
            });
            
            expect(res.statusCode).toBe(200);

            const updated = await world.db.get('SELECT * FROM files WHERE id = ?', [targetId]);
            expect(updated.title).toBe('Still Target');
            expect(updated.hash).toBe('h2');
            expect(updated.filename).not.toBe('target.png');
            expect(updated.filename).not.toBe('source.png'); // Should be a new unique filename
            
            expect(fs.existsSync(path.join(testUploadDir, updated.filename))).toBe(true);
            expect(fs.readFileSync(path.join(testUploadDir, updated.filename), 'utf8')).toBe('new content');
            
            // Old file should be deleted from disk
            expect(fs.existsSync(path.join(testUploadDir, 'target.png'))).toBe(false);
        });
    });

    describe('Out of Bounds & Invalid Inputs', () => {
        test('GET /api/files with invalid page/limit', async () => {
            const res = await world.request.get('/api/files?page=abc&limit=xyz');
            expect(res.statusCode).toBe(200); // Should fallback to defaults
            const body = JSON.parse(res.body);
            expect(body.data.currentPage).toBe(1);
        });

        test('GET /api/files/:id/download with non-existent ID', async () => {
            const res = await world.as('admin').get('/api/files/99999/download');
            expect(res.statusCode).toBe(404);
        });

        test('PUT /api/files/:id with invalid ID', async () => {
            const res = await world.as('admin').put('/api/files/notanid', { title: 'New' });
            expect(res.statusCode).toBe(404);
        });
    });
});
