/**
 * FilesAPI.test.js
 * 
 * File management tests.
 */

import TestWorld from '../utils/TestWorld.js';
import FilesAPI from '../../server/api/FilesAPI.js';
import FilesDB from '../../server/db/filesDB.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

describe('api/FilesAPI', () => {
    let world;
    let testUploadDir;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        // Use a temporary directory for file uploads during tests
        testUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ducc-files-test-'));
        
        await world.createRole('Admin', ['file.read', 'file.write', 'file.edit', 'file.category.manage']);
        await world.createRole('Exec', ['event.read.all']); 

        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('exec', {}, ['Exec']);
        await world.createUser('member', { is_member: 1 }, []);
        await world.createUser('guest', { is_member: 0 });

        new FilesAPI(world.app, world.db, null, testUploadDir).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
        // Cleanup test files
        if (fs.existsSync(testUploadDir)) {
            fs.rmSync(testUploadDir, { recursive: true, force: true });
        }
    });

    describe('Visibility & Listing', () => {
        beforeEach(async () => {
            await world.db.run('INSERT INTO file_categories (name, default_visibility) VALUES ("PublicCat", "public"), ("MemberCat", "members")');
            const cats = await world.db.all('SELECT * FROM file_categories');
            const pubCat = cats.find(c => c.name === 'PublicCat').id;
            const memCat = cats.find(c => c.name === 'MemberCat').id;

            await FilesDB.createFile(world.db, { title: 'PubFile', filename: 'p.txt', visibility: 'public', category_id: pubCat });
            await FilesDB.createFile(world.db, { title: 'MemFile', filename: 'm.txt', visibility: 'members', category_id: memCat });
            await FilesDB.createFile(world.db, { title: 'ExeFile', filename: 'e.txt', visibility: 'execs' });
        });

        test('Guest sees only public files', async () => {
            const res = await world.request.get('/api/files');
            const body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(1);
            expect(body.data.files[0].title).toBe('PubFile');
        });

        test('Member sees public and member-only files', async () => {
            const res = await world.as('member').get('/api/files');
            const body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(2);
        });

        test('Exec sees all files (including exec-only)', async () => {
            const res = await world.as('exec').get('/api/files');
            const body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(3);
        });

        test('Category listing filters based on user role', async () => {
            const resGuest = await world.request.get('/api/file-categories');
            const bodyGuest = JSON.parse(resGuest.body);
            expect(bodyGuest.data).toHaveLength(1);

            const resMem = await world.as('member').get('/api/file-categories');
            const bodyMem = JSON.parse(resMem.body);
            expect(bodyMem.data).toHaveLength(2);
        });
    });

    describe('Upload & Management', () => {
        test('Admin can update file metadata', async () => {
            await world.db.run('INSERT INTO file_categories (name) VALUES ("Cat")');
            const catId = (await world.db.get('SELECT id FROM file_categories')).id;
            const fileRes = await FilesDB.createFile(world.db, { title: 'Old', filename: 'f.txt' });
            const fileId = fileRes.getData().id;

            const res = await world.as('admin').put(`/api/files/${fileId}`, {
                title: 'New Title',
                categoryId: catId
            });
            expect(res.statusCode).toBe(200);

            const updated = await world.db.get('SELECT * FROM files WHERE id = ?', [fileId]);
            expect(updated.title).toBe('New Title');
        });

        test('Unauthorized users cannot perform uploads', async () => {
            const res = await world.request.post('/api/files', {});
            expect(res.statusCode).toBe(401);
        });

        test('Members without write permission cannot upload', async () => {
            const res = await world.as('member').post('/api/files', {});
            expect(res.statusCode).toBe(403);
        });
    });

    describe('Download & Access', () => {
        let fileId;
        beforeEach(async () => {
            const res = await FilesDB.createFile(world.db, { title: 'Secret', filename: 'secret.txt', visibility: 'execs' });
            fileId = res.getData().id;
            fs.writeFileSync(path.join(testUploadDir, 'secret.txt'), 'content');
        });

        test('Unauthorized users cannot download restricted files', async () => {
            const res = await world.request.get(`/api/files/${fileId}/download`);
            expect(res.statusCode).toBe(403);
        });

        test('Authorized users can download restricted files', async () => {
            const res = await world.as('exec').get(`/api/files/${fileId}/download`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toBe('content');
        });

        /** Test visibility: events logic. */
        test('Event image visibility is restricted by the user\'s event access', async () => {
            const filename = 'event_img.txt';
            const filePath = path.join(testUploadDir, filename);
            fs.writeFileSync(filePath, 'fake image content');

            const fileRes = await FilesDB.createFile(world.db, {
                title: 'Event Image',
                filename: filename,
                visibility: 'events'
            });
            const eventFileId = fileRes.getData().id;
            const imageUrl = `/api/files/${eventFileId}/download`;

            // Create an event that is too difficult for the current user
            await world.createEvent('Hard Event', {
                difficulty_level: 5,
                image_id: eventFileId
            });

            // Guests should be blocked
            expect((await world.request.get(imageUrl)).statusCode).toBe(403);

            // Beginners (difficulty 1) should be blocked
            expect((await world.as('member').get(imageUrl)).statusCode).toBe(403);

            // After promoting user to difficulty 5, they should gain access
            await world.db.run('UPDATE users SET difficulty_level = 5 WHERE id = ?', [world.data.users['member']]);
            const resMemberHigh = await world.as('member').get(imageUrl);
            expect(resMemberHigh.statusCode).toBe(200);
            expect(resMemberHigh.body).toBe('fake image content');

            // Execs should always have access
            expect((await world.as('exec').get(imageUrl)).statusCode).toBe(200);
        });

        /** Test orphaned event images. */
        test('Orphaned event images are accessible only to execs', async () => {
            const filename = 'orphan.jpg';
            const filePath = path.join(testUploadDir, filename);
            fs.writeFileSync(filePath, 'orphan content');

            const fileRes = await FilesDB.createFile(world.db, {
                title: 'Orphan Image',
                filename: filename,
                visibility: 'events'
            });
            const orphanFileId = fileRes.getData().id;
            const imageUrl = `/api/files/${orphanFileId}/download`;

            expect((await world.as('member').get(imageUrl)).statusCode).toBe(403);
            expect((await world.as('exec').get(imageUrl)).statusCode).toBe(200);
        });

        test('Global default event image is accessible to everyone', async () => {
            const filename = 'default_event.txt';
            const filePath = path.join(testUploadDir, filename);
            fs.writeFileSync(filePath, 'default image content');

            const fileRes = await FilesDB.createFile(world.db, {
                title: 'Default Image',
                filename: filename,
                visibility: 'events'
            });
            const defaultFileId = fileRes.getData().id;
            const imageUrl = `/api/files/${defaultFileId}/download`;

            world.mockGlobalObject('DefaultEventImage', { data: imageUrl });

            const resGuest = await world.request.get(imageUrl);
            expect(resGuest.statusCode).toBe(200);
            expect(resGuest.body).toBe('default image content');
        });

        test('Whitelisted tag visibility is enforced for event images', async () => {
            const filename = 'secret_event.txt';
            const filePath = path.join(testUploadDir, filename);
            fs.writeFileSync(filePath, 'secret content');

            const fileRes = await FilesDB.createFile(world.db, {
                title: 'Secret Image',
                filename: filename,
                visibility: 'events'
            });
            const secretFileId = fileRes.getData().id;
            const imageUrl = `/api/files/${secretFileId}/download`;

            // Create a tag with whitelist view policy
            await world.createTag('SecretTag', { view_policy: 'whitelist' });
            const tagId = world.data.tags['SecretTag'];

            // Create an event with this tag and image
            await world.createEvent('Secret Event', { image_id: secretFileId });
            await world.assignTag('event', 'Secret Event', 'SecretTag');

            // User not on whitelist should be blocked
            expect((await world.as('member').get(imageUrl)).statusCode).toBe(403);

            // Add user to whitelist
            await world.db.run('INSERT INTO tag_whitelists (tag_id, user_id) VALUES (?, ?)', [tagId, world.data.users['member']]);
            
            // User on whitelist should gain access
            const resOk = await world.as('member').get(imageUrl);
            expect(resOk.statusCode).toBe(200);
            expect(resOk.body).toBe('secret content');
        });
    });

    describe('Search capabilities', () => {
        beforeEach(async () => {
            await FilesDB.createFile(world.db, { title: 'Technical Guide', author: 'Coach', filename: 'guide.txt', visibility: 'public', content: 'This is a guide about canoeing techniques.' });
            await FilesDB.createFile(world.db, { title: 'Safety Protocol', author: 'Officer', filename: 'safety.pdf', visibility: 'public', content: 'Always wear a buoyancy aid.' });
            await FilesDB.createFile(world.db, { title: 'Meeting Minutes', author: 'Sec', filename: 'minutes_2023.txt', visibility: 'public', content: 'Discussed club finances and upcoming trips.' });
        });

        test('Search matches title, filename, and content by default', async () => {
            let res = await world.request.get('/api/files?search=Technical');
            let body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(1);
            expect(body.data.files[0].title).toBe('Technical Guide');

            res = await world.request.get('/api/files?search=buoyancy');
            body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(1);
            expect(body.data.files[0].title).toBe('Safety Protocol');

            res = await world.request.get('/api/files?search=minutes_2023');
            body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(1);
            expect(body.data.files[0].filename).toBe('minutes_2023.txt');
        });

        test('Prefix filename: searches only by filename', async () => {
            let res = await world.request.get('/api/files?search=filename:safety');
            let body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(1);
            expect(body.data.files[0].filename).toBe('safety.pdf');

            res = await world.request.get('/api/files?search=filename:Technical');
            body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(0);
        });

        test('Prefix content: searches only by content', async () => {
            let res = await world.request.get('/api/files?search=content:canoeing');
            let body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(1);
            expect(body.data.files[0].title).toBe('Technical Guide');

            res = await world.request.get('/api/files?search=content:Safety');
            body = JSON.parse(res.body);
            expect(body.data.files).toHaveLength(0);
        });
    });
});