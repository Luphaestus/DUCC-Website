import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

/**
 * Migration to add reminder_sent column to event_attendees table.
 */
export async function migrate(db: DatabaseWrapper) {
    try {
        const columns: any[] = await db.all("SHOW COLUMNS FROM event_attendees");
        const hasReminderSent = columns.some(c => c.Field === 'reminder_sent');

        if (!hasReminderSent) {
            Logger.info('Adding reminder_sent column to event_attendees...');
            await db.run("ALTER TABLE event_attendees ADD COLUMN reminder_sent TINYINT(1) NOT NULL DEFAULT 0");
        }
    } catch (e: any) {
        Logger.error('Failed to migrate event_attendees:', e.message);
    }
}
