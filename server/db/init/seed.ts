/**
 * seed.ts
 * 
 * Orchestrator for database seeding.
 */

import { seedEssential } from './seed/essential.js';
import { seedDevelopment } from './seed/development.js';
import { DatabaseWrapper } from '../db.js';

/**
 * Main seeding function.
 */
export async function seedData(db: DatabaseWrapper, env: string, newlyCreatedTables: string[] = []): Promise<void> {
    await seedEssential(db, newlyCreatedTables);

    if (env === 'dev' || env === 'development') {
        await seedDevelopment(db, newlyCreatedTables);
    }
}
