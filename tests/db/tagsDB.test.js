const { setupTestDb } = require('/js/utils/db');
const TagsDB = require('../../server/db/tagsDB');

describe('TagsDB', () => {
    let db;

    beforeEach(async () => {
        db = await setupTestDb();
    });

    afterEach(async () => {
        await db.close();
    });

    test('createTag and getTagById', async () => {
        const tagData = {
            name: 'Intermediate',
            color: '#FFA500',
            description: 'Intermediate paddlers',
            min_difficulty: 2
        };
        const createRes = await TagsDB.createTag(db, tagData);
        expect(createRes.getStatus()).toBe(200);
        const tagId = createRes.getData().id;

        const getRes = await TagsDB.getTagById(db, tagId);
        expect(getRes.getStatus()).toBe(200);
        const tag = getRes.getData();
        expect(tag.name).toBe('Intermediate');
        expect(tag.color).toBe('#FFA500');
    });

    test('getAllTags', async () => {
        await TagsDB.createTag(db, { name: 'B', color: '#000', description: 'desc', min_difficulty: 1 });
        await TagsDB.createTag(db, { name: 'A', color: '#000', description: 'desc', min_difficulty: 1 });

        const res = await TagsDB.getAllTags(db);
        expect(res.getStatus()).toBe(200);
        const tags = res.getData();
        expect(tags.length).toBe(2);
        expect(tags[0].name).toBe('A'); // Ordered by name ASC
        expect(tags[1].name).toBe('B');
    });

    test('updateTag', async () => {
        const createRes = await TagsDB.createTag(db, { name: 'Old', color: '#000', description: 'desc', min_difficulty: 1 });
        const tagId = createRes.getData().id;

        const updateRes = await TagsDB.updateTag(db, tagId, {
            name: 'New',
            color: '#FFF',
            description: 'Updated',
            min_difficulty: 3
        });
        expect(updateRes.getStatus()).toBe(200);

        const getRes = await TagsDB.getTagById(db, tagId);
        const tag = getRes.getData();
        expect(tag.name).toBe('New');
        expect(tag.color).toBe('#FFF');
    });

    test('deleteTag', async () => {
        const createRes = await TagsDB.createTag(db, { name: 'DeleteMe', color: '#000', description: 'desc', min_difficulty: 1 });
        const tagId = createRes.getData().id;

        const deleteRes = await TagsDB.deleteTag(db, tagId);
        expect(deleteRes.getStatus()).toBe(200);

        const getRes = await TagsDB.getTagById(db, tagId);
        expect(getRes.getStatus()).toBe(404);
    });

    test('whitelist operations', async () => {
        // Create a tag
        const tagRes = await TagsDB.createTag(db, { name: 'Whitelisted', color: '#000', description: 'desc', min_difficulty: 1 });
        const tagId = tagRes.getData().id;

        // Create a user
        const userRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['test@durham.ac.uk', 'Test', 'User', 1]
        );
        const userId = userRes.lastID;

        // Add to whitelist
        const addRes = await TagsDB.addToWhitelist(db, tagId, userId);
        expect(addRes.getStatus()).toBe(200);

        // Get whitelist
        const listRes = await TagsDB.getWhitelist(db, tagId);
        expect(listRes.getStatus()).toBe(200);
        expect(listRes.getData().length).toBe(1);
        expect(listRes.getData()[0].id).toBe(userId);

        // Get tags for user
        const userTags = await TagsDB.getTagsForUser(db, userId);
        expect(userTags.length).toBe(1);
        expect(userTags[0].id).toBe(tagId);

        // Remove from whitelist
        const removeRes = await TagsDB.removeFromWhitelist(db, tagId, userId);
        expect(removeRes.getStatus()).toBe(200);

        const listRes2 = await TagsDB.getWhitelist(db, tagId);
        expect(listRes2.getData().length).toBe(0);
    });

    test('event tag association', async () => {
        // Create tag
        const tagRes = await TagsDB.createTag(db, { name: 'EventTag', color: '#000', description: 'desc', min_difficulty: 1 });
        const tagId = tagRes.getData().id;

        // Create event
        const eventRes = await db.run(
            'INSERT INTO events (title, start, end, difficulty_level) VALUES (?, ?, ?, ?)',
            ['Test Event', '2025-01-01 10:00:00', '2025-01-01 12:00:00', 1]
        );
        const eventId = eventRes.lastID;

        // Associate
        await TagsDB.associateTag(db, eventId, tagId);

        // Get tags for event
        const eventTags = await TagsDB.getTagsForEvent(db, eventId);
        expect(eventTags.length).toBe(1);
        expect(eventTags[0].id).toBe(tagId);

        // Clear tags
        await TagsDB.clearEventTags(db, eventId);
        const eventTags2 = await TagsDB.getTagsForEvent(db, eventId);
        expect(eventTags2.length).toBe(0);
    });
});
