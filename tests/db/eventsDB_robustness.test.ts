import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import TestWorld from '../utils/TestWorld.js';
import EventsDB from '../../server/db/eventsDB';
import TagsDB from '../../server/db/tagsDB';

describe('EventsDB Robustness', () => {
    let world: TestWorld;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('updateEvent should merge partial data', async () => {
        const eventId = await world.createEvent('Original Event', {
            description: 'Original Desc',
            location: 'Original Loc'
        });

        // Partial update
        const updateRes = await EventsDB.updateEvent(world.db, eventId, {
            start: '2026-02-11 10:00:00',
            end: '2026-02-11 11:00:00'
        });
        expect(updateRes.isError()).toBe(false);

        const event = await EventsDB.getEventById(world.db, eventId);
        expect(event.title).toBe('Original Event');
        // Check if it's the right day at least
        const startStr = event.start instanceof Date ? event.start.toISOString() : String(event.start);
        expect(startStr).toContain('2026-02-11');
    });

    test('createEvent and updateEvent should handle tag objects', async () => {
        await world.createTag('Test Tag');
        const tag = (await TagsDB.getAllTags(world.db)).getData()[0];
        
        const createRes = await EventsDB.createEvent(world.db, {
            title: 'Tag Test',
            description: 'Desc',
            location: 'Loc',
            start: '2026-02-12 10:00:00',
            end: '2026-02-12 11:00:00',
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0,
            signup_required: true,
            is_offsite: false,
            tags: [tag] // Passing object instead of ID
        });
        expect(createRes.isError()).toBe(false);
        const eventId = createRes.getData().id;

        const tags = await TagsDB.getTagsForEvent(world.db, eventId);
        expect(tags.length).toBe(1);
        expect(tags[0].id).toBe(tag.id);

        // Update with tag object
        const updateRes = await EventsDB.updateEvent(world.db, eventId, {
            tags: [tag]
        });
        expect(updateRes.isError()).toBe(false);
    });
});