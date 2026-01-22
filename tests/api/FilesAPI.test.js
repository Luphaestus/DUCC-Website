const TestWorld = require('../utils/TestWorld');
const FilesAPI = require('../../server/api/FilesAPI');
const FilesDB = require('../../server/db/filesDB');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('api/FilesAPI', () => {
    let world;
    let testUploadDir;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        testUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ducc-files-test-'));
        
        await world.createRole('Admin', ['file.read', 'file.write', 'file.edit', 'file.category.manage']);
        await world.createRole('Exec', ['event.read.all']); 

        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('exec', {}, ['Exec']);
        await world.createUser('member', { is_member: 1 }, []);
        await world.createUser('guest', { is_member: 0 });

        new FilesAPI(world.app, world.db, null, testUploadDir).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
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

        test('Guest sees only public', async () => {
            const res = await world.request.get('/api/files');
            expect(res.body.data.files).toHaveLength(1);
            expect(res.body.data.files[0].title).toBe('PubFile');
        });

        test('Member sees public and members', async () => {
            const res = await world.as('member').get('/api/files');
            expect(res.body.data.files).toHaveLength(2);
        });

        test('Exec sees everything', async () => {
            const res = await world.as('exec').get('/api/files');
            expect(res.body.data.files).toHaveLength(3);
        });

        test('Category listing filters by role', async () => {
            const resGuest = await world.request.get('/api/file-categories');
            expect(resGuest.body.data).toHaveLength(1);

            const resMem = await world.as('member').get('/api/file-categories');
            expect(resMem.body.data).toHaveLength(2);
        });
    });

    describe('Upload & Management', () => {
        test('Admin can edit metadata', async () => {
            await world.db.run('INSERT INTO file_categories (name) VALUES ("Cat")');
            const catId = (await world.db.get('SELECT id FROM file_categories')).id;
            const fileRes = await FilesDB.createFile(world.db, { title: 'Old', filename: 'f.txt' });
            const fileId = fileRes.getData().id;

            const res = await world.as('admin').put(`/api/files/${fileId}`).send({
                title: 'New Title',
                categoryId: catId
            });
            expect(res.statusCode).toBe(200);

            const updated = await world.db.get('SELECT * FROM files WHERE id = ?', [fileId]);
            expect(updated.title).toBe('New Title');
        });

        test('Guest cannot upload', async () => {
            const res = await world.request.post('/api/files');
            expect(res.statusCode).toBe(401);
        });

        test('Member cannot upload without permission', async () => {
            const res = await world.as('member').post('/api/files');
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

        test('Guest cannot download exec file', async () => {
            const res = await world.request.get(`/api/files/${fileId}/download`);
            expect(res.statusCode).toBe(403);
        });

        test('Exec can download exec file', async () => {
            const res = await world.as('exec').get(`/api/files/${fileId}/download`);
            expect(res.statusCode).toBe(200);
            expect(res.text).toBe('content');
        });
    });
});