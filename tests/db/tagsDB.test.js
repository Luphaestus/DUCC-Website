/**
 * tagsDB.test.js
 * 
 * Database layer tests for event tags and whitelists.
 * Verifies tag management, user whitelisting, and event-tag associations.
 */

import TestWorld from '../utils/TestWorld.js';
import TagsDB from '../../server/db/tagsDB.js';

describe('db/tagsDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('createTag and getTagById lifecycle', async () => {
        const tagData = {
            name: 'Intermediate',
            color: '#FFA500',
            description: 'Intermediate paddlers',
            min_difficulty: 2
        };
        const createRes = await TagsDB.createTag(world.db, tagData);
        expect(createRes.getStatus()).toBe(200);
        const tagId = createRes.getData().id;

        const getRes = await TagsDB.getTagById(world.db, tagId);
        expect(getRes.getStatus()).toBe(200);
        const tag = getRes.getData();
        expect(tag.name).toBe('Intermediate');
    });

    /**
     * Test whitelist addition, lookup, and removal.
     */
    test('Whitelist operations correctly modify user access lists', async () => {
        await world.createTag('Tag1');
        const tagId = world.data.tags['Tag1'];

        await world.createUser('user', {});
        const userId = world.data.users['user'];

        // 1. Add
        await TagsDB.addToWhitelist(world.db, tagId, userId);
        
        // 2. Fetch full list
        const list = await TagsDB.getWhitelist(world.db, tagId);
        expect(list.getData().some(u => u.id === userId)).toBe(true);

        // 3. Direct check
        expect(await TagsDB.isWhitelisted(world.db, tagId, userId)).toBe(true);

        // 4. Remove
        await TagsDB.removeFromWhitelist(world.db, tagId, userId);
        expect(await TagsDB.isWhitelisted(world.db, tagId, userId)).toBe(false);
    });

    /**
     * Test mapping events to tags.
     */
    test('associateTag correctly links an event to a tag', async () => {
        await world.createTag('Tag1');
        const tagId = world.data.tags['Tag1'];

        await world.createEvent('Event1');
        const eventId = world.data.events['Event1'];

        await TagsDB.associateTag(world.db, eventId, tagId);

        // Verification: tag list for the event includes our tag
        const tags = await TagsDB.getTagsForEvent(world.db, eventId);
        expect(tags.some(t => t.id === tagId)).toBe(true);
    });
});
