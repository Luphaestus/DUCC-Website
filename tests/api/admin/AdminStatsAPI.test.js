import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import TestWorld from '../../utils/TestWorld.js';
import AdminStatsAPI from '../../../server/api/admin/AdminStatsAPI.js';

describe('api/admin/AdminStatsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        new AdminStatsAPI(world.app, world.db).registerRoutes();
        await world.app.ready();

        // Setup initial data for stats
        await world.createRole('Admin', ['user.manage', 'event.manage.all', 'transaction.manage']);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('user', {}, []);
        
        await world.createEvent('Past Event', { start: '2023-01-01 12:00:00', end: '2023-01-01 14:00:00', upfront_cost: 10 });
        await world.createEvent('Future Event', { start: '2026-01-01 12:00:00', end: '2026-01-01 14:00:00' });
        
        await world.addTransaction('user', -10, 'Trip Payment', 1);
        await world.addTransaction('user', 50, 'Top Up');
        
        await world.joinEvent('user', 'Past Event');
    });

    afterEach(async () => {
        await world.tearDown();
    });

    it('GET /api/admin/stats/summary - Returns summary metrics', async () => {
        const res = await world.as('admin').get('/api/admin/stats/summary');
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body).toHaveProperty('members');
        expect(body).toHaveProperty('club_balance');
        expect(body.club_balance).toBe(40); // 50 - 10
    });

    it('GET /api/admin/stats/finance - Returns finance data', async () => {
        const res = await world.as('admin').get('/api/admin/stats/finance');
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body).toHaveProperty('monthly');
        expect(body).toHaveProperty('categories');
        expect(Array.isArray(body.monthly)).toBe(true);
    });

    it('GET /api/admin/stats/attendance - Returns attendance data', async () => {
        const res = await world.as('admin').get('/api/admin/stats/attendance');
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body).toHaveProperty('monthly');
        expect(body).toHaveProperty('types');
    });

    it('GET /api/admin/stats/user/:id - Returns user stats', async () => {
        const userId = world.data.users['user'];
        const res = await world.as('admin').get(`/api/admin/stats/user/${userId}`);
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body).toHaveProperty('finance');
        expect(body.finance.total_spent).toBe(10);
        expect(body.attendance.total_events).toBe(1);
    });

    it('GET /api/admin/stats/summary - Forbidden for standard user', async () => {
        const res = await world.as('user').get('/api/admin/stats/summary');
        expect(res.statusCode).toBe(403);
    });
});
