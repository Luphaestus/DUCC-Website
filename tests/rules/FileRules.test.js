const FileRules = require('../../server/rules/FileRules');
const TestWorld = require('../utils/TestWorld');

describe('rules/FileRules', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('Visibility: public', async () => {
        const file = { visibility: 'public' };
        expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(true);
        expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(true);
    });

    test('Visibility: members', async () => {
        const file = { visibility: 'members' };
        expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(false);
        expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(true);
        expect(await FileRules.canAccessFile(world.db, file, { id: 2 }, 'exec')).toBe(true);
    });

    test('Visibility: execs', async () => {
        const file = { visibility: 'execs' };
        expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(false);
        expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(false);
        expect(await FileRules.canAccessFile(world.db, file, { id: 2 }, 'exec')).toBe(true);
    });

    describe('Visibility: events', () => {
        let fileId;

        beforeEach(async () => {
            await world.db.run(`INSERT INTO files (title, filename, hash, visibility) VALUES (?, ?, ?, ?)`, 
                ['Image', 'img.jpg', 'h', 'events']);
            const f = await world.db.get('SELECT id FROM files WHERE filename = "img.jpg"');
            fileId = f.id;
        });

        test('Access denied if no event linked', async () => {
            const file = { id: fileId, visibility: 'events' };
            expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(false);
        });

        test('Access allowed if user can view linked event', async () => {
            await world.createEvent('E1', { difficulty_level: 1, image_url: `/api/files/${fileId}/download` });
            const file = { id: fileId, visibility: 'events' };
            const user = { difficulty_level: 1 };
            expect(await FileRules.canAccessFile(world.db, file, user, 'member')).toBe(true);
        });

        test('Access denied if linked event difficulty too high', async () => {
            await world.createEvent('E1', { difficulty_level: 5, image_url: `/api/files/${fileId}/download` });
            const file = { id: fileId, visibility: 'events' };
            const user = { difficulty_level: 1 };
            expect(await FileRules.canAccessFile(world.db, file, user, 'member')).toBe(false);
        });

        test('Multiple events: allowed if ANY event is viewable', async () => {
            await world.createEvent('Hard', { difficulty_level: 5, image_url: `/api/files/${fileId}/download` });
            await world.createEvent('Easy', { difficulty_level: 1, image_url: `/api/files/${fileId}/download` });
            
            const file = { id: fileId, visibility: 'events' };
            const user = { difficulty_level: 1 };
            expect(await FileRules.canAccessFile(world.db, file, user, 'member')).toBe(true);
        });

        test('Execs bypass event difficulty check', async () => {
            await world.createEvent('Hard', { difficulty_level: 5, image_url: `/api/files/${fileId}/download` });
            const file = { id: fileId, visibility: 'events' };
            expect(await FileRules.canAccessFile(world.db, file, null, 'exec')).toBe(true);
        });

        test('Unauthorized user vs global max difficulty', async () => {
            world.mockGlobalInt('Unauthorized_max_difficulty', 1);
            await world.createEvent('E1', { difficulty_level: 1, image_url: `/api/files/${fileId}/download` });
            await world.createEvent('E2', { difficulty_level: 2, image_url: `/api/files/${fileId}/download` });

            const file = { id: fileId, visibility: 'events' };
            
            // E1 is viewable
            expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(true);

            // Now only E2 exists for this file
            await world.db.run('DELETE FROM events WHERE title = "E1"');
            expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(false);
        });
    });
});