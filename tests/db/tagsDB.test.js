const TestWorld = require('../utils/TestWorld');
const TagsDB = require('../../server/db/tagsDB');

describe('db/tagsDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('createTag and getTagById', async () => {
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

    test('whitelist operations', async () => {
        await world.createTag('Tag1');
        const tagId = world.data.tags['Tag1'];

        await world.createUser('user', {});
        const userId = world.data.users['user'];

        await TagsDB.addToWhitelist(world.db, tagId, userId);
        
        const list = await TagsDB.getWhitelist(world.db, tagId);
        expect(list.getData().some(u => u.id === userId)).toBe(true);

        expect(await TagsDB.isWhitelisted(world.db, tagId, userId)).toBe(true);

        await TagsDB.removeFromWhitelist(world.db, tagId, userId);
        expect(await TagsDB.isWhitelisted(world.db, tagId, userId)).toBe(false);
    });

    test('event tag association', async () => {
        await world.createTag('Tag1');
        const tagId = world.data.tags['Tag1'];

        await world.createEvent('Event1');
        const eventId = world.data.events['Event1'];

        await TagsDB.associateTag(world.db, eventId, tagId);

        const tags = await TagsDB.getTagsForEvent(world.db, eventId);
        expect(tags.some(t => t.id === tagId)).toBe(true);
    });
});