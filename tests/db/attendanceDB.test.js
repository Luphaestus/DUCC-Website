/**
 * attendanceDB.test.js
 * 
 * Database layer tests for event attendance.
 * Verifies low-level CRUD operations for event participation and instructor auditing.
 */

const TestWorld = require('../utils/TestWorld');
const AttendanceDB = require('../../server/db/attendanceDB');

describe('db/attendanceDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        await world.createUser('user', {});
        await world.createEvent('Event1');
    });

    afterEach(async () => {
        await world.tearDown();
    });

    /**
     * Test the toggle-join workflow.
     */
    test('attend_event correctly records participation and is_user_attending_event detects it', async () => {
        const userId = world.data.users['user'];
        const eventId = world.data.events['Event1'];

        // 1. Initial state check
        let res = await AttendanceDB.is_user_attending_event(world.db, userId, eventId);
        expect(res.getData()).toBe(false);

        // 2. Action: join
        await AttendanceDB.attend_event(world.db, userId, eventId);
        
        // 3. Final state check
        res = await AttendanceDB.is_user_attending_event(world.db, userId, eventId);
        expect(res.getData()).toBe(true);
    });

    /**
     * Test the exit workflow.
     */
    test('leave_event correctly marks the user as no longer attending', async () => {
        const userId = world.data.users['user'];
        const eventId = world.data.events['Event1'];

        await AttendanceDB.attend_event(world.db, userId, eventId);
        await AttendanceDB.leave_event(world.db, userId, eventId);

        const res = await AttendanceDB.is_user_attending_event(world.db, userId, eventId);
        expect(res.getData()).toBe(false);
    });

    /**
     * Test coach count aggregation logic.
     */
    test('getCoachesAttendingCount correctly filters and counts instructors', async () => {
        const eventId = world.data.events['Event1'];
        
        await world.createUser('coach', { is_instructor: 1 });
        const coachId = world.data.users['coach'];
        
        // 1. Zero state
        expect(await AttendanceDB.getCoachesAttendingCount(world.db, eventId)).toBe(0);

        // 2. Joined state
        await AttendanceDB.attend_event(world.db, coachId, eventId);
        expect(await AttendanceDB.getCoachesAttendingCount(world.db, eventId)).toBe(1);
    });
});