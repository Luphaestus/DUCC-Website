// server/db/init/add_dietary_info_to_users.ts
import { DatabaseWrapper } from '../../db/db.js';
import Logger from '../../misc/Logger.js';

export async function migrate(db: DatabaseWrapper) {
    Logger.info('Running migration: add_dietary_info_to_users');
    
    const columns: any[] = await db.all("SHOW COLUMNS FROM users");
    Logger.info(`Columns in users table: ${columns.map(c => c.Field).join(', ')}`);
    const hasOldColumn = columns.some(c => c.Field.toLowerCase() === 'dietary_requirements');
    const hasNewColumn = columns.some(c => c.Field.toLowerCase() === 'dietary_info_details');
    const hasHasDietaryInfo = columns.some(c => c.Field.toLowerCase() === 'has_dietary_info');

    if (hasOldColumn && !hasNewColumn) {
        Logger.info('Renaming dietary_requirements to dietary_info_details');
        await db.run(`
            ALTER TABLE users
            RENAME COLUMN dietary_requirements TO dietary_info_details;
        `);
    } else if (hasOldColumn && hasNewColumn) {
        Logger.warn('Both dietary_requirements and dietary_info_details exist. Skipping rename.');
    } else if (!hasOldColumn && !hasNewColumn) {
        Logger.info('Neither dietary_requirements nor dietary_info_details exist. Adding dietary_info_details.');
        await db.run(`
            ALTER TABLE users
            ADD COLUMN dietary_info_details TEXT;
        `);
    }

    if (!hasHasDietaryInfo) {
        Logger.info('Adding has_dietary_info column');
        await db.run(`
            ALTER TABLE users
            ADD COLUMN has_dietary_info TINYINT(1) NOT NULL DEFAULT 0;
        `);
    }

    Logger.info('Migration complete: add_dietary_info_to_users');
}