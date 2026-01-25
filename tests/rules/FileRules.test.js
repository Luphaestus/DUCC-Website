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
        let file;

        beforeEach(async () => {
            // Create a file marked with 'events' visibility
            await world.db.run(`INSERT INTO files (title, filename, hash, visibility) VALUES (?, ?, ?, ?)`, 
                ['Banner', 'banner.jpg', 'h', 'events']);
            const f = await world.db.get('SELECT id FROM files WHERE filename = "banner.jpg"');
            fileId = f.id;
            file = { id: fileId, visibility: 'events' };
        });

        /**
         * System requirement: event images are private unless they are actually being used by an event.
         */
        test('Denied: if the file is not currently used by any viewable event', async () => {
            const file = { id: fileId, visibility: 'events' };
            expect(await FileRules.canAccessFile(world.db, file, { id: 1 }, 'member')).toBe(false);
        });

        test('Allowed: if the user is authorized to view a linked event', async () => {
            await world.createEvent('E1', { difficulty_level: 1, image_id: fileId });
            expect(await FileRules.canAccessFile(world.db, file, { difficulty_level: 1 }, 'member')).toBe(true);
        });

        test('Denied: if the linked event difficulty is beyond user\'s level', async () => {
            await world.createEvent('Pro Only', { difficulty_level: 5, image_id: fileId });
            expect(await FileRules.canAccessFile(world.db, file, { difficulty_level: 1 }, 'member')).toBe(false);
        });

        test('Logic OR: allowed if at least one of multiple linked events is viewable', async () => {
            await world.createEvent('Hard', { difficulty_level: 5, image_id: fileId });
            await world.createEvent('Easy', { difficulty_level: 1, image_id: fileId });
            expect(await FileRules.canAccessFile(world.db, file, { difficulty_level: 1 }, 'member')).toBe(true);
        });

        test('Exec Override: execs bypass difficulty checks for event images', async () => {
            await world.createEvent('Pro Only', { difficulty_level: 5, image_id: fileId });
            expect(await FileRules.canAccessFile(world.db, file, { difficulty_level: 1 }, 'exec')).toBe(true);
        });

        test('Allowed: if the user can see an event that uses a tag which has this file as default', async () => {
            await world.createTag('T1', { image_id: fileId });
            const tagId = world.data.tags['T1'];
            await world.createEvent('E1', { difficulty_level: 1 });
            await world.assignTag('event', 'E1', 'T1');

            const file = { id: fileId, visibility: 'events' };
            const user = { difficulty_level: 1 };
            expect(await FileRules.canAccessFile(world.db, file, user, 'member')).toBe(true);
        });

        test('Denied: if the only event using the tag (with this default image) is too difficult', async () => {
            await world.createTag('HardTag', { image_id: fileId });
            const tagId = world.data.tags['HardTag'];
            await world.createEvent('HardEvent', { difficulty_level: 5 });
            await world.assignTag('event', 'HardEvent', 'HardTag');

            const file = { id: fileId, visibility: 'events' };
            const user = { difficulty_level: 1 };
            expect(await FileRules.canAccessFile(world.db, file, user, 'member')).toBe(false);
        });

        /**
         * Test integration with the Guest difficulty limit global.
         */
        test('should deny access if guest user level is below all associated event difficulties', async () => {
            const file = { id: fileId, visibility: 'events' };
            
            // 1. Create E1 (difficulty 1) and E2 (difficulty 5)
            await world.createEvent('E1', { difficulty_level: 1, image_id: fileId });
            await world.createEvent('E2', { difficulty_level: 5, image_id: fileId });
            const e1 = await world.db.get('SELECT id FROM events WHERE title = "E1"');

            // Viewable via E1 (diff 1) - Guest max is 2 by default in TestWorld/Globals
            expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(true);

            // Remove E1; now only E2 (diff 5) is left. Since 5 > Guest Max (2), access should be denied.
            await world.db.run('DELETE FROM events WHERE id = ?', [e1.id]);
            expect(await FileRules.canAccessFile(world.db, file, null, 'public')).toBe(false);
        });
    });
});
