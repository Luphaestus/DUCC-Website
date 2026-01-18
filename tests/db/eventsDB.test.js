const { setupTestDb } = require('../utils/db');
const EventsDB = require('../../server/db/eventsDB');
const TagsDB = require('../../server/db/tagsDB');

describe('EventsDB', () => {
    let db;
    let userId;

    beforeEach(async () => {
        db = await setupTestDb();
        // Insert user
        const res = await db.run(`INSERT INTO users (email, first_name, last_name, difficulty_level) VALUES ('u@d.ac.uk', 'U', 'S', 5)`);
        userId = res.lastID;
    });

    afterEach(async () => {
        await db.close();
    });

    test('createEvent creates an event', async () => {
        const eventData = {
            title: 'Test Event',
            description: 'Desc',
            location: 'Loc',
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0
        };
        const result = await EventsDB.createEvent(db, eventData);
        expect(result.getStatus()).toBe(200);

        const events = await EventsDB.get_all_events(db, 5);
        expect(events.length).toBe(1);
        expect(events[0].title).toBe('Test Event');
    });

    test('attend_event allows user to join', async () => {
        // Create event
        const eventData = {
            title: 'Test Event',
            description: 'Desc',
            location: 'Loc',
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0
        };
        const createRes = await EventsDB.createEvent(db, eventData);
        const eventId = createRes.getData().id;

        const req = {
            isAuthenticated: () => true,
            user: { id: userId }
        };

        const result = await EventsDB.attend_event(req, db, eventId);
        expect(result.getStatus()).toBe(200);

        const isAttending = await EventsDB.is_user_attending_event(req, db, eventId);
        expect(isAttending.getData()).toBe(true);
    });

    test('attend_event prevents duplicate joining', async () => {
        // Create event
        const eventData = {
            title: 'Test Event',
            description: 'Desc',
            location: 'Loc',
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0
        };
        const createRes = await EventsDB.createEvent(db, eventData);
        const eventId = createRes.getData().id;

        const req = {
            isAuthenticated: () => true,
            user: { id: userId }
        };

        await EventsDB.attend_event(req, db, eventId);
        const result = await EventsDB.attend_event(req, db, eventId);
        expect(result.getStatus()).toBe(409); // Conflict
    });

    test('leave_event removes user from attendees', async () => {
        // Create event
        const eventData = {
            title: 'Test Event',
            description: 'Desc',
            location: 'Loc',
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0
        };
        const createRes = await EventsDB.createEvent(db, eventData);
        const eventId = createRes.getData().id;

        const req = {
            isAuthenticated: () => true,
            user: { id: userId }
        };

        await EventsDB.attend_event(req, db, eventId);
        const leaveResult = await EventsDB.leave_event(req, db, eventId);
        expect(leaveResult.getStatus()).toBe(200);

        const isAttending = await EventsDB.is_user_attending_event(req, db, eventId);
        expect(isAttending.getData()).toBe(false);
    });

    test('get_events_relative_week should sort events by start time even if some have tags', async () => {
        // Create a tag
        const tagRes = await TagsDB.createTag(db, { name: 'Test Tag', min_difficulty: 1 });
        const tagId = tagRes.getData().id;

        const now = new Date();
        // Calculate next Monday to ensure we are in a clean week
        const daysUntilNextMonday = (8 - now.getDay()) % 7 || 7;
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + daysUntilNextMonday);
        nextMonday.setHours(0, 0, 0, 0);

        const date1 = new Date(nextMonday);
        date1.setHours(10, 0, 0); // 10:00

        const date2 = new Date(nextMonday);
        date2.setHours(11, 0, 0); // 11:00

        const date3 = new Date(nextMonday);
        date3.setHours(12, 0, 0); // 12:00

        // Insert event 1 (10:00) - No Tag
        await EventsDB.createEvent(db, {
            title: 'Event 1',
            start: date1.toISOString(),
            end: new Date(date1.getTime() + 3600000).toISOString(),
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0
        });

        // Insert event 3 (12:00) - No Tag
        await EventsDB.createEvent(db, {
            title: 'Event 3',
            start: date3.toISOString(),
            end: new Date(date3.getTime() + 3600000).toISOString(),
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0
        });

        // Insert event 2 (11:00) - Has Tag
        const event2Res = await EventsDB.createEvent(db, {
            title: 'Event 2',
            start: date2.toISOString(),
            end: new Date(date2.getTime() + 3600000).toISOString(),
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0,
            tags: [tagId]
        });

        // Verify insertion and tags
        const event2 = await EventsDB.get_event_by_id({ isAuthenticated: () => true, user: { id: userId } }, db, event2Res.getData().id);
        expect(event2.getData().tags.length).toBe(1);

        // Fetch events for that week
        const result = await EventsDB.get_events_for_week(db, 5, nextMonday);

        expect(result.getStatus()).toBe(200);
        const events = result.getData();

        expect(events.length).toBe(3);

        // Check order
        expect(events[0].title).toBe('Event 1'); // 10:00
        expect(events[1].title).toBe('Event 2'); // 11:00
        expect(events[2].title).toBe('Event 3'); // 12:00

        // Check actual start times to be sure
        const t1 = new Date(events[0].start).getTime();
        const t2 = new Date(events[1].start).getTime();
        const t3 = new Date(events[2].start).getTime();

        expect(t1).toBeLessThan(t2);
        expect(t2).toBeLessThan(t3);
    });
});
