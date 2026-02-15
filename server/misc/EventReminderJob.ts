import { DatabaseWrapper } from '../db/db.js';
import Logger from './Logger.js';
import NotificationsAPI from '../api/NotificationsAPI.js';
import { NotificationType } from '../types/notifications.js';
import EventHub from './EventHub.js';

/**
 * Background job to check for upcoming events and send reminders.
 */
export class EventReminderJob {
    private db: DatabaseWrapper;
    private interval: NodeJS.Timeout | null = null;

    constructor(db: DatabaseWrapper) {
        this.db = db;
    }

    /**
     * Start the background job.
     */
    start() {
        if (this.interval) return;
        
        // Run every 5 minutes
        this.interval = setInterval(() => this.checkAndSendReminders(), 5 * 60 * 1000);
        Logger.info('[EventReminderJob] Background job started (5m interval)');
        
        // Initial run
        this.checkAndSendReminders().catch(err => Logger.error('[EventReminderJob] Initial check failed:', err));
    }

    /**
     * Stop the background job.
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Core logic: Find events starting in ~30 minutes and notify attendees.
     */
    private async checkAndSendReminders() {
        try {
            // Find events starting between 25 and 35 minutes from now
            // and where we haven't sent a reminder yet.
            // We use a separate column or a new table to track sent reminders to avoid duplicates.
            // For simplicity, let's add a 'reminder_sent' column to event_attendees.
            
            const eventsStartingSoon = await this.db.all(`
                SELECT e.id, e.title, e.start, ea.user_id, ea.id as attendance_id
                FROM events e
                JOIN event_attendees ea ON e.id = ea.event_id
                WHERE e.start BETWEEN DATE_ADD(NOW(), INTERVAL 25 MINUTE) AND DATE_ADD(NOW(), INTERVAL 35 MINUTE)
                AND ea.is_attending = 1
                AND ea.reminder_sent = 0
                AND e.is_canceled = 0
            `);

            if (eventsStartingSoon.length === 0) return;

            Logger.info(`[EventReminderJob] Found ${eventsStartingSoon.length} attendees to notify.`);

            for (const row of eventsStartingSoon) {
                try {
                    const startTime = new Date(row.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    
                    await NotificationsAPI.sendNotificationToUser(
                        this.db,
                        row.user_id,
                        `${row.title} starts in 30 minutes - DUCC`,
                        `Reminder: "${row.title}" starts at ${startTime}!`,
                        `/event/${row.id}`,
                        NotificationType.EVENT_REMINDERS,
                        'notification'
                    );

                    // Live update via SSE
                    EventHub.sendToUser(row.user_id, 'upcoming_event', {
                        eventId: row.id,
                        title: row.title,
                        startTime: startTime
                    });

                    // Mark as sent
                    await this.db.run('UPDATE event_attendees SET reminder_sent = 1 WHERE id = ?', [row.attendance_id]);
                } catch (err: any) {
                    Logger.error(`[EventReminderJob] Failed to notify user ${row.user_id} for event ${row.id}:`, err.message);
                }
            }
        } catch (error: any) {
            Logger.error('[EventReminderJob] Error in checkAndSendReminders:', error.message);
        }
    }
}
