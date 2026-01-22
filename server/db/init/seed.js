const { seedEssential } = require('./seed/essential');
const { seedDevelopment } = require('./seed/development');

/**
 * Seeds the database with initial data.
 * @param {object} db - Database instance.
 * @param {string} env - Environment mode.
 */
async function seedData(db, env) {
    await seedEssential(db);

    if (env === 'dev' || env === 'development') {
        await seedDevelopment(db);
    }
}

module.exports = { seedData };
