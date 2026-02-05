import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import TestWorld from '../../utils/TestWorld.js';
import AdminStatsAPI from '../../../server/api/admin/AdminStatsAPI.js';

describe('api/admin/AdminStatsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        new AdminStatsAPI(world.app, world.db).registerRoutes();

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
        await world.as('admin').get('/api/admin/stats/summary')
            .expect(200)
            .then(res => {
                expect(res.body).toHaveProperty('members');
                expect(res.body).toHaveProperty('club_balance');
                expect(res.body.club_balance).toBe(40); // 50 - 10
            });
    });

    it('GET /api/admin/stats/finance - Returns finance data', async () => {
        await world.as('admin').get('/api/admin/stats/finance')
            .expect(200)
            .then(res => {
                expect(res.body).toHaveProperty('monthly');
                expect(res.body).toHaveProperty('categories');
                expect(Array.isArray(res.body.monthly)).toBe(true);
            });
    });

    it('GET /api/admin/stats/attendance - Returns attendance data', async () => {
        await world.as('admin').get('/api/admin/stats/attendance')
            .expect(200)
            .then(res => {
                expect(res.body).toHaveProperty('monthly');
                expect(res.body).toHaveProperty('types');
            });
    });

    it('GET /api/admin/stats/user/:id - Returns user stats', async () => {
        const userId = world.data.users['user'];
        await world.as('admin').get(`/api/admin/stats/user/${userId}`)
            .expect(200)
            .then(res => {
                expect(res.body).toHaveProperty('finance');
                expect(res.body.finance.total_spent).toBe(10);
                expect(res.body.attendance.total_events).toBe(1);
            });
    });

    it('GET /api/admin/stats/summary - Forbidden for standard user', async () => {
        await world.as('user').get('/api/admin/stats/summary')
            .expect(403);
    });
});