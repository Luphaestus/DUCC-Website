/**
 * seed.js
 * 
 * Orchestrator for database seeding.
 */

const { seedEssential } = require('./seed/essential');
const { seedDevelopment } = require('./seed/development');

/**
 * Main seeding function.
 */
async function seedData(db, env) {
    await seedEssential(db);

    if (env === 'dev' || env === 'development') {
        await seedDevelopment(db);
    }
}

module.exports = { seedData };