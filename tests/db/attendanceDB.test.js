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

    test('attend_event and is_user_attending_event', async () => {
        const userId = world.data.users['user'];
        const eventId = world.data.events['Event1'];

        let res = await AttendanceDB.is_user_attending_event(world.db, userId, eventId);
        expect(res.getData()).toBe(false);

        await AttendanceDB.attend_event(world.db, userId, eventId);
        
        res = await AttendanceDB.is_user_attending_event(world.db, userId, eventId);
        expect(res.getData()).toBe(true);
    });

    test('leave_event', async () => {
        const userId = world.data.users['user'];
        const eventId = world.data.events['Event1'];

        await AttendanceDB.attend_event(world.db, userId, eventId);
        await AttendanceDB.leave_event(world.db, userId, eventId);

        const res = await AttendanceDB.is_user_attending_event(world.db, userId, eventId);
        expect(res.getData()).toBe(false);
    });

    test('getCoachesAttendingCount', async () => {
        const eventId = world.data.events['Event1'];
        
        await world.createUser('coach', { is_instructor: 1 });
        const coachId = world.data.users['coach'];
        
        expect(await AttendanceDB.getCoachesAttendingCount(world.db, eventId)).toBe(0);

        await AttendanceDB.attend_event(world.db, coachId, eventId);
        expect(await AttendanceDB.getCoachesAttendingCount(world.db, eventId)).toBe(1);
    });
});
