const { setupTestDb } = require('../utils/db');
const EventsDB = require('../../server/db/eventsDB');

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
});
