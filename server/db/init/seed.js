/**
 * seed.js
 * 
 * Orchestrator for database seeding.
 */

import { seedEssential } from './seed/essential.js';
import { seedDevelopment } from './seed/development.js';

/**
 * Main seeding function.
 */
export async function seedData(db, env) {
    await seedEssential(db);

    if (env === 'dev' || env === 'development') {
        await seedDevelopment(db);
    }
}
