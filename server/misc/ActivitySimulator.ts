import { DatabaseWrapper } from '../db/db.js';
import EventHub from './EventHub.js';
import AttendanceDB from '../db/attendanceDB.js';
import TransactionsDB from '../db/transactionDB.js';
import EventsDB from '../db/eventsDB.js';
import Logger from './Logger.js';

/**
 * ActivitySimulator.ts
 * 
 * Periodically generates random user activity to test live updates.
 */

export class ActivitySimulator {
    private db: DatabaseWrapper;
    private interval: NodeJS.Timeout | null = null;

    constructor(db: DatabaseWrapper) {
        this.db = db;
    }

    start(frequencyMs: number = 1000) {
        if (this.interval) return;
        Logger.info('Activity Simulator Started (High Frequency)');
        this.interval = setInterval(() => this.tick(), frequencyMs);
    }

    stop() {
        if (this.interval) clearInterval(this.interval);
        this.interval = null;
    }

    private async tick() {
        try {
            await this.simulateAttendance();
            
            // Occasionally do other things
            if (Math.random() < 0.2) await this.simulateTransaction();
            if (Math.random() < 0.1) await this.simulateEventCreation();
        } catch (e) {
            Logger.error('Simulator Error:', e);
        }
    }

    private async simulateAttendance() {
        const users = await this.db.all('SELECT id FROM users ORDER BY RAND() LIMIT 1');
        // Target events that are happening today or very soon
        const events = await this.db.all('SELECT id, title FROM events WHERE start >= CURDATE() AND start < DATE_ADD(CURDATE(), INTERVAL 1 DAY) AND is_canceled = 0 ORDER BY RAND() LIMIT 1');
        
        if (users.length && events.length) {
            const userId = users[0].id;
            const eventId = events[0].id;
            
            const attending = await this.db.get('SELECT 1 FROM event_attendees WHERE user_id = ? AND event_id = ? AND is_attending = 1', [userId, eventId]);
            
            if (attending) {
                await this.db.run('UPDATE event_attendees SET is_attending = 0 WHERE user_id = ? AND event_id = ?', [userId, eventId]);
                Logger.info(`Simulator: User ${userId} LEFT event ${eventId} (${events[0].title})`);
                
                EventHub.broadcast('attendance_update', { eventId, userId, action: 'left' });
            } else {
                await this.db.run('INSERT INTO event_attendees (user_id, event_id, is_attending) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE is_attending = 1', [userId, eventId]);
                Logger.info(`Simulator: User ${userId} JOINED event ${eventId} (${events[0].title})`);
                
                const user = await this.db.get(`
                    SELECT id, first_name, last_name, profile_picture_color, profile_picture_font, profile_picture_initials,
                    (SELECT CONCAT("/api/files/", f.id, "/download", CHAR(63 USING utf8mb4), "view=true") FROM files f WHERE f.id = u.profile_picture_id) as profile_picture_path
                    FROM users u WHERE id = ?
                `, [userId]);

                EventHub.broadcast('attendance_update', { eventId, user, action: 'joined' });
            }
        }
    }

    private async simulateTransaction() {
        const users = await this.db.all('SELECT id FROM users ORDER BY RAND() LIMIT 1');
        if (users.length) {
            const userId = users[0].id;
            const amount = (Math.random() * 20 - 10).toFixed(2);
            const desc = 'Simulated Transaction';
            
            await TransactionsDB.add_transaction(this.db, userId, Number(amount), desc);
            Logger.info(`Simulator: Added £${amount} transaction for user ${userId}`);
            
            EventHub.sendToUser(userId, 'balance_update', { userId, amount });
            EventHub.broadcast('admin_transaction_update', { userId });
        }
    }

    private async simulateEventCreation() {
        const titles = ['River Trip', 'Pool Session', 'Pub Social', 'Erg Session'];
        const title = titles[Math.floor(Math.random() * titles.length)] + ' (Simulated)';
        
        const start = new Date();
        start.setDate(start.getDate() + Math.floor(Math.random() * 7));
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

        const result = await this.db.run(
            'INSERT INTO events (title, description, location, start, end, difficulty_level) VALUES (?, ?, ?, ?, ?, ?)',
            [title, 'This event was automatically generated.', 'Tees Barrage', start.toISOString().slice(0, 19).replace('T', ' '), end.toISOString().slice(0, 19).replace('T', ' '), 1]
        );

        Logger.info(`Simulator: Created event ${result.lastID}`);
        EventHub.broadcast('event_update', { eventId: result.lastID, action: 'created' });
    }
}
