/**
 * update_swim_history_schema.ts
 * 
 * Migration to add message and is_bootie columns to swim_history.
 */

import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

export async function migrate(db: DatabaseWrapper) {
    Logger.info('Running migration: update_swim_history_schema');

    try {
        const columns: any[] = await db.all("SHOW COLUMNS FROM swim_history");
        
        if (!columns.some(c => c.Field === 'message')) {
            await db.exec("ALTER TABLE swim_history ADD COLUMN message TEXT AFTER count");
            Logger.info('Added column: message to swim_history');
        }

        if (!columns.some(c => c.Field === 'is_bootie')) {
            await db.exec("ALTER TABLE swim_history ADD COLUMN is_bootie TINYINT(1) DEFAULT 0 AFTER message");
            Logger.info('Added column: is_bootie to swim_history');
        }

    } catch (e: any) {
        Logger.error('Failed to update swim_history schema:', e.message);
    }

    Logger.info('Migration complete: update_swim_history_schema');
}
