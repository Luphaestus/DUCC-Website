/**
 * add_completed_to_election_phase.ts
 * 
 * Migration to add 'completed' to the election phase ENUM.
 */

import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

export async function migrate(db: DatabaseWrapper) {
    Logger.info('Running migration: add_completed_to_election_phase');

    try {
        // MySQL specific syntax to modify enum
        await db.exec("ALTER TABLE elections MODIFY COLUMN phase ENUM('setup', 'nominations', 'voting', 'closed', 'results_revealed', 'roles_transferred', 'completed') NOT NULL DEFAULT 'setup'");
        Logger.info('Updated phase ENUM in elections table');
    } catch (e: any) {
        Logger.error('Failed to update elections phase enum:', e.message);
    }

    Logger.info('Migration complete: add_completed_to_election_phase');
}
