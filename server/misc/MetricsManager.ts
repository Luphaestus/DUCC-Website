/**
 * MetricsManager.ts
 * 
 * Background task to collect and store system metrics.
 */

import os from 'os';
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

    private static async getCpuUsage(): Promise<number> {
        const cpus = os.cpus();
        let totalIdle = 0, totalTick = 0;
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += (cpu.times as any)[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        // Simple approximation by comparing two snapshots
        const startIdle = totalIdle;
        const startTick = totalTick;

        return new Promise(resolve => {
            setTimeout(() => {
                const cpusEnd = os.cpus();
                let endIdle = 0, endTick = 0;
                cpusEnd.forEach(cpu => {
                    for (const type in cpu.times) {
                        endTick += (cpu.times as any)[type];
                    }
                    endIdle += cpu.times.idle;
                });

                const idle = endIdle - startIdle;
                const total = endTick - startTick;
                const usage = 1 - (idle / total);
                resolve(usage * 100);
            }, 1000);
        });
    }

    static async collect() {
        try {
            const cpu = await this.getCpuUsage();
            const memTotal = os.totalmem();
            const memFree = os.freemem();
            const memUsage = ((memTotal - memFree) / memTotal) * 100;

            const dbStatus = await this.db.get('SHOW STATUS LIKE "Threads_connected"');
            const dbConnections = parseInt(dbStatus?.Value || '0');

            const sessionsRes = await this.db.get('SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()');
            const activeSessions = sessionsRes?.count || 0;

            // In a real app, you might track recent API hits in memory
            const userActivity = 0; // Placeholder for real-time tracking

            const metrics = {
                cpu_usage: cpu,
                memory_usage: memUsage,
                db_connections: dbConnections,
                active_sessions: activeSessions,
                user_activity_count: userActivity,
                timestamp: new Date().toISOString()
            };

            // Save to DB
            await this.db.run(`
                INSERT INTO system_metrics (cpu_usage, memory_usage, db_connections, active_sessions, user_activity_count)
                VALUES (?, ?, ?, ?, ?)
            `, [metrics.cpu_usage, metrics.memory_usage, metrics.db_connections, metrics.active_sessions, metrics.user_activity_count]);

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
