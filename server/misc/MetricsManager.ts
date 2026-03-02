import { DatabaseWrapper } from '../db/db.js';
import Logger from './Logger.js';
import EventHub from './EventHub.js';

export default class MetricsManager {
    private static interval: NodeJS.Timeout | null = null;
    private static db: DatabaseWrapper;

    static init(db: DatabaseWrapper) {
        this.db = db;
        if (this.interval) clearInterval(this.interval);

        // Collect metrics every minute
        this.interval = setInterval(() => this.collect(), 60000);
        // Initial collection
        this.collect();
    }

    static async collect() {
        try {
            // DB Connections (Server-wide)
            const dbStatus = await this.db.all('SHOW STATUS LIKE "Threads_connected"');
            const connectedRow = dbStatus.find(r => r.Variable_name === 'Threads_connected');
            const dbConnections = parseInt(connectedRow?.Value || '0');

            // Active Sessions (Unexpired in DB)
            const sessionsRes = await this.db.get('SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()');
            const dbActiveSessions = sessionsRes?.count || 0;

            // Real-time Online Users (Currently connected to SSE)
            const onlineNow = EventHub.getClientCount();
            const liveSessionCount = EventHub.getUniqueSessionCount();
            const activeSessions = Math.max(dbActiveSessions, liveSessionCount);

            const metrics = {
                db_connections: dbConnections,
                active_sessions: activeSessions,
                online_now: onlineNow,
                timestamp: new Date().toISOString()
            };

            // Debug log to verify collection (only in dev)
            if (process.env.NODE_ENV !== 'production') {
                Logger.debug(`[Metrics] Collected: DB ${metrics.db_connections}, Sess ${metrics.active_sessions}, Online ${metrics.online_now}`);
            }

            // Save to DB (keep schema compatible, set 0 for removed system metrics)
            await this.db.run(`
                INSERT INTO system_metrics (cpu_usage, memory_usage, db_connections, active_sessions, user_activity_count)
                VALUES (0, 0, ?, ?, ?)
            `, [metrics.db_connections, metrics.active_sessions, metrics.online_now]);

            // Broadcast to real-time clients
            EventHub.broadcast('system_metrics', metrics);
        } catch (error) {
            Logger.error('Failed to collect system metrics:', error);
        }
    }

    static async getHistorical(db: DatabaseWrapper, hours: number = 24) {
        return await db.all(`
            SELECT * FROM system_metrics 
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            ORDER BY timestamp ASC
        `, [hours]);
    }
}
