/**
 * seed.js
 * 
 * Orchestrator for database seeding.
 * Coordinates the insertion of essential data (roles, perms) 
 * and optional development data (fake users, sample events).
 */

const { seedEssential } = require('./seed/essential');
const { seedDevelopment } = require('./seed/development');

/**
 * Main seeding function.
 * @param {object} db - Database instance.
 * @param {string} env - Environment mode (prod vs dev).
 */
async function seedData(db, env) {
    // Always seed essential system data
    await seedEssential(db);

    // Only seed fake data in development environments
    if (env === 'dev' || env === 'development') {
        await seedDevelopment(db);
    }
}

module.exports = { seedData };