/**
 * AdminStatsAPI.ts
 * 
 * Provides statistical data for the admin dashboard.
 */

import { FastifyInstance, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import check from '../../misc/authentication.js';
import Logger from '../../misc/Logger.js';
import Globals from '../../misc/globals.js';

export default class AdminStats {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        /**
         * GET /api/admin/stats/summary
         * Returns high-level metrics for dashboard cards.
         */
        this.app.get('/api/admin/stats/summary', { preHandler: [check('perm:user.manage | perm:event.manage.all | perm:transaction.manage')] }, async (request: any, reply: FastifyReply) => {
            try {
                const [
                    memberCount,
                    totalBalance,
                    activeEvents,
                    pendingApprovals
                ] = await Promise.all([
                    this.db.get('SELECT COUNT(*) as count FROM users WHERE is_member = 1'),
                    this.db.get('SELECT SUM(amount) as total FROM transactions'),
                    this.db.get('SELECT COUNT(*) as count FROM events WHERE start >= NOW() AND is_canceled = 0'),
                    this.db.get('SELECT COUNT(*) as count FROM event_drivers WHERE status = "pending"')
                ]);

                return reply.send({
                    members: memberCount?.count || 0,
                    club_balance: totalBalance?.total || 0,
                    upcoming_events: activeEvents?.count || 0,
                    pending_driver_approvals: pendingApprovals?.count || 0
                });
            } catch (e: any) {
                Logger.error('Stats Summary Error', e);
                return reply.status(500).send({ message: 'Database error' });
            }
        });

        /**
         * GET /api/admin/stats/finance
         * Returns financial data for charts.
         */
        this.app.get('/api/admin/stats/finance', { preHandler: [check('perm:transaction.manage')] }, async (request: any, reply: FastifyReply) => {
            try {
                // Monthly Income/Expenses (Last 12 Months)
                const monthlyStats = await this.db.all(`
                    SELECT 
                        DATE_FORMAT(created_at, '%Y-%m') as month,
                        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expense
                    FROM transactions
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                    ORDER BY month ASC
                `);

                // Total Spend by Category (Inferred from description keywords)
                // This is a rough estimation as we don't have a strict category column on transactions yet
                const categoryStats = await this.db.all(`
                    SELECT 
                        CASE 
                            WHEN description LIKE '%membership%' THEN 'Membership'
                            WHEN description LIKE '%pool%' OR description LIKE '%swim%' THEN 'Pool/Swims'
                            WHEN description LIKE '%trip%' OR description LIKE '%event%' THEN 'Trips'
                            WHEN description LIKE '%kit%' OR description LIKE '%repair%' THEN 'Kit/Repairs'
                            ELSE 'Other'
                        END as category,
                        SUM(ABS(amount)) as total
                    FROM transactions
                    WHERE amount < 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
                    GROUP BY category
                `);

                return reply.send({
                    monthly: monthlyStats,
                    categories: categoryStats
                });
            } catch (e: any) {
                Logger.error('Finance Stats Error', e);
                return reply.status(500).send({ message: 'Database error' });
            }
        });

        /**
         * GET /api/admin/stats/attendance
         * Returns attendance data for charts.
         */
        this.app.get('/api/admin/stats/attendance', { preHandler: [check('perm:event.manage.all | perm:event.read.all')] }, async (request: any, reply: FastifyReply) => {
            try {
                // Monthly Attendance (Last 12 Months)
                const monthlyAttendance = await this.db.all(`
                    SELECT 
                        DATE_FORMAT(e.start, '%Y-%m') as month,
                        COUNT(ea.id) as attendees
                    FROM event_attendees ea
                    JOIN events e ON ea.event_id = e.id
                    WHERE e.start >= DATE_SUB(NOW(), INTERVAL 12 MONTH) 
                      AND ea.is_attending = 1
                    GROUP BY DATE_FORMAT(e.start, '%Y-%m')
                    ORDER BY month ASC
                `);

                // Event Type Breakdown (Based on primary tag)
                // Assuming priority 0 tag is primary or just grouping by all tags
                // Grouping by unique event count per tag might be better
                const typeBreakdown = await this.db.all(`
                    SELECT t.name, COUNT(DISTINCT e.id) as count
                    FROM events e
                    JOIN event_tags et ON e.id = et.event_id
                    JOIN tags t ON et.tag_id = t.id
                    WHERE e.start >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
                    GROUP BY t.id
                    ORDER BY count DESC
                    LIMIT 10
                `);

                return reply.send({
                    monthly: monthlyAttendance,
                    types: typeBreakdown
                });
            } catch (e: any) {
                Logger.error('Attendance Stats Error', e);
                return reply.status(500).send({ message: 'Database error' });
            }
        });

        /**
         * GET /api/admin/stats/leaderboards
         * Returns Top Spenders and Most Active Members.
         */
        this.app.get('/api/admin/stats/leaderboards', { preHandler: [check('perm:user.manage | perm:transaction.manage')] }, async (request: any, reply: FastifyReply) => {
            try {
                const [topSpenders, mostActive] = await Promise.all([
                    this.db.all(`
                        SELECT u.id, u.first_name, u.last_name, SUM(ABS(t.amount)) as total_spent
                        FROM users u
                        JOIN transactions t ON u.id = t.user_id
                        WHERE t.amount < 0
                        GROUP BY u.id
                        ORDER BY total_spent DESC
                        LIMIT 5
                    `),
                    this.db.all(`
                        SELECT u.id, u.first_name, u.last_name, COUNT(ea.id) as event_count
                        FROM users u
                        JOIN event_attendees ea ON u.id = ea.user_id
                        WHERE ea.is_attending = 1
                        GROUP BY u.id
                        ORDER BY event_count DESC
                        LIMIT 5
                    `)
                ]);

                return reply.send({
                    top_spenders: topSpenders,
                    most_active: mostActive
                });
            } catch (e: any) {
                Logger.error('Leaderboards Stats Error', e);
                return reply.status(500).send({ message: 'Database error' });
            }
        });

        this.app.get('/api/admin/stats/user/:id', { preHandler: [check('perm:user.manage | perm:transaction.manage')] }, async (request: any, reply: FastifyReply) => {
            try {
                const userId = parseInt(request.params.id);
                const mileageCost = new Globals().getFloat('MileageCost') || 0.45;
                
                const [totalSpent, yearSpent, totalEvents, yearEvents, fuelCost, attendanceStats] = await Promise.all([
                    this.db.get('SELECT SUM(ABS(amount)) as val FROM transactions WHERE user_id = ? AND amount < 0', [userId]),
                    this.db.get('SELECT SUM(ABS(amount)) as val FROM transactions WHERE user_id = ? AND amount < 0 AND YEAR(created_at) = YEAR(NOW())', [userId]),
                    this.db.get('SELECT COUNT(*) as val FROM event_attendees WHERE user_id = ? AND is_attending = 1', [userId]),
                    this.db.get('SELECT COUNT(*) as val FROM event_attendees ea JOIN events e ON ea.event_id = e.id WHERE ea.user_id = ? AND ea.is_attending = 1 AND YEAR(e.start) = YEAR(NOW())', [userId]),
                    this.db.get(`
                        SELECT SUM(share) as val FROM (
                            SELECT 
                                (SELECT SUM((ed.end_mileage - ed.start_mileage) * ?) 
                                 FROM event_drivers ed 
                                 JOIN trips t ON ed.trip_id = t.id 
                                 WHERE t.event_id = e.id AND ed.status = 'accepted' AND ed.end_mileage IS NOT NULL AND ed.start_mileage IS NOT NULL
                                ) / 
                                (SELECT COUNT(*) 
                                 FROM event_attendees ea2 
                                 WHERE ea2.event_id = e.id AND ea2.is_attending = 1
                                ) as share
                            FROM event_attendees ea
                            JOIN events e ON ea.event_id = e.id
                            WHERE ea.user_id = ? AND ea.is_attending = 1
                        ) summary
                    `, [mileageCost, userId]),
                    this.db.get(`
                        SELECT 
                            COUNT(CASE WHEN is_attending = 1 THEN 1 END) as attended,
                            COUNT(CASE WHEN is_attending = 0 AND left_at >= DATE_SUB(e.start, INTERVAL 24 HOUR) THEN 1 END) as late_unsigns,
                            AVG(CASE WHEN is_attending = 1 THEN e.difficulty_level END) as avg_diff
                        FROM event_attendees ea
                        JOIN events e ON ea.event_id = e.id
                        WHERE ea.user_id = ? AND e.start < NOW()
                    `, [userId])
                ]);

                const total_spent = totalSpent?.val || 0;
                const total_events = totalEvents?.val || 0;
                const attended = attendanceStats?.attended || 0;
                const late_unsigns = attendanceStats?.late_unsigns || 0;
                const total_attempted = attended + late_unsigns;

                return reply.send({
                    finance: {
                        total_spent: total_spent,
                        year_spent: yearSpent?.val || 0,
                        avg_cost_per_event: total_events > 0 ? total_spent / total_events : 0,
                        total_fuel_cost: fuelCost?.val || 0
                    },
                    attendance: {
                        total_events: total_events,
                        year_events: yearEvents?.val || 0,
                        attendance_rate: total_attempted > 0 ? (attended / total_attempted) * 100 : 100,
                        late_unsigns: late_unsigns,
                        avg_difficulty: attendanceStats?.avg_diff || 0
                    }
                });
            } catch (e: any) {
                Logger.error('User Stats Error', e);
                return reply.status(500).send({ message: 'Database error' });
            }
        });
    }
}