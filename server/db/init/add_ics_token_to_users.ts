import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

/**
 * Migration to add ics_token column to users table.
 */
export async function migrate(db: DatabaseWrapper) {
    try {
        const columns: any[] = await db.all("SHOW COLUMNS FROM users");
        const hasIcsToken = columns.some(c => c.Field === 'ics_token');

        if (!hasIcsToken) {
            Logger.info('Adding ics_token column to users...');
            await db.run("ALTER TABLE users ADD COLUMN ics_token VARCHAR(255)");
        }
    } catch (e: any) {
        Logger.error('Failed to migrate users (ics_token):', e.message);
    }
}
