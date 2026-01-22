/**
 * FileRules.test.js
 * 
 * Logic tests for file access authorization.
 * Covers visibility levels (public, member, exec) and dynamic event-linked visibility logic.
 */

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

    test('Access Logic: public files are open to all', async () => {
        const file = { visibility: 'public' };
        expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(true);
        expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(true);
    });

    test('Access Logic: member-only files restricted to members and execs', async () => {
        const file = { visibility: 'members' };
        // Guests blocked
        expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(false);
        // Members allowed
        expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(true);
        // Execs allowed
        expect(await FileRules.canAccessFile(world.db, file, { id: 2 }, 'exec')).toBe(true);
    });

    test('Access Logic: exec-only files restricted exclusively to execs', async () => {
        const file = { visibility: 'execs' };
        expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(false);
        expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(false);
        expect(await FileRules.canAccessFile(world.db, file, { id: 2 }, 'exec')).toBe(true);
    });

    describe('Access Logic: visibility: events (Dynamic Lookups)', () => {
        let fileId;

        beforeEach(async () => {
            // Create a file marked with 'events' visibility
            await world.db.run(`INSERT INTO files (title, filename, hash, visibility) VALUES (?, ?, ?, ?)`, 
                ['Banner', 'banner.jpg', 'h', 'events']);
            const f = await world.db.get('SELECT id FROM files WHERE filename = "banner.jpg"');
            fileId = f.id;
        });

        /**
         * System requirement: event images are private unless they are actually being used by an event.
         */
        test('Denied: if the file is not currently used by any viewable event', async () => {
            const file = { id: fileId, visibility: 'events' };
            expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(false);
        });

        test('Allowed: if the user is authorized to view a linked event', async () => {
            // Link file to a public event
            await world.createEvent('E1', { difficulty_level: 1, image_url: `/api/files/${fileId}/download` });
            const file = { id: fileId, visibility: 'events' };
            const user = { difficulty_level: 1 };
            
            expect(await FileRules.canAccessFile(world.db, file, user, 'member')).toBe(true);
        });

        test('Denied: if the linked event difficulty is beyond user\'s level', async () => {
            // Link file to a difficult event
            await world.createEvent('Pro Only', { difficulty_level: 5, image_url: `/api/files/${fileId}/download` });
            const file = { id: fileId, visibility: 'events' };
            const user = { difficulty_level: 1 };
            
            expect(await FileRules.canAccessFile(world.db, file, user, 'member')).toBe(false);
        });

        /**
         * Test logical OR: if a file is used by multiple events, one accessible event is enough.
         */
        test('Logic OR: allowed if at least one of multiple linked events is viewable', async () => {
            await world.createEvent('Hard', { difficulty_level: 5, image_url: `/api/files/${fileId}/download` });
            await world.createEvent('Easy', { difficulty_level: 1, image_url: `/api/files/${fileId}/download` });
            
            const file = { id: fileId, visibility: 'events' };
            const user = { difficulty_level: 1 };
            expect(await FileRules.canAccessFile(world.db, file, user, 'member')).toBe(true);
        });

        test('Exec Override: execs bypass difficulty checks for event images', async () => {
            await world.createEvent('Pro Only', { difficulty_level: 5, image_url: `/api/files/${fileId}/download` });
            const file = { id: fileId, visibility: 'events' };
            
            expect(await FileRules.canAccessFile(world.db, file, null, 'exec')).toBe(true);
        });

        /**
         * Test integration with the Guest difficulty limit global.
         */
        test('Guest Access: correctly evaluates visibility using global guest difficulty limit', async () => {
            world.mockGlobalInt('Unauthorized_max_difficulty', 1);
            await world.createEvent('E1', { difficulty_level: 1, image_url: `/api/files/${fileId}/download` });
            await world.createEvent('E2', { difficulty_level: 2, image_url: `/api/files/${fileId}/download` });

            const file = { id: fileId, visibility: 'events' };
            
            // 1. Viewable via E1 (diff 1)
            expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(true);

            // 2. Remove E1; now only E2 (diff 2) is left. Since 2 > Guest Max (1), access should be denied.
            await world.db.run('DELETE FROM events WHERE title = "E1"');
            expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(false);
        });
    });
});
