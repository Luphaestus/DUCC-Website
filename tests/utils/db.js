/**
 * db.js
 * 
 * Utility for creating a transient, in-memory SQLite database for unit tests.
 * Ensures each test suite runs in total isolation.
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { createTables } = require('../../server/db/init/tables');
const { seedColleges } = require('../../server/db/init/seed/essential');

/**
 * Creates and initializes an in-memory SQLite connection.
 * @returns {Promise<object>} - The SQLite database instance.
 */
async function setupTestDb() {
    const db = await open({
        filename: ':memory:', // Transient storage
        driver: sqlite3.Database
    });

    // Apply performance and safety pragmas
    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA busy_timeout = 5000;');
    await db.exec('PRAGMA foreign_keys = ON;');

    // Bootstrap minimal schema
    await createTables(db);
    // Seed essential metadata (colleges) needed for user factories
    await seedColleges(db);

    return db;
}

module.exports = { setupTestDb };