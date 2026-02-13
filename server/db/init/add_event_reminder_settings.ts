import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

/**
 * Migration to add event reminder settings to user_notification_settings table.
 */
export async function migrate(db: DatabaseWrapper) {
    try {
        const columns: any[] = await db.all("SHOW COLUMNS FROM user_notification_settings");
        const hasEmailReminders = columns.some(c => c.Field === 'email_event_reminders');
        const hasPushReminders = columns.some(c => c.Field === 'push_event_reminders');

        if (!hasEmailReminders) {
            Logger.info('Adding email_event_reminders column to user_notification_settings...');
            await db.run("ALTER TABLE user_notification_settings ADD COLUMN email_event_reminders TINYINT(1) NOT NULL DEFAULT 1");
        }

        if (!hasPushReminders) {
            Logger.info('Adding push_event_reminders column to user_notification_settings...');
            await db.run("ALTER TABLE user_notification_settings ADD COLUMN push_event_reminders TINYINT(1) NOT NULL DEFAULT 1");
        }
    } catch (e: any) {
        Logger.error('Failed to migrate user_notification_settings:', e.message);
    }
}
