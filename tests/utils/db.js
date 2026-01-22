const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { createTables } = require('../../server/db/init/tables');
const { seedColleges } = require('../../server/db/init/seed/essential');

async function setupTestDb() {
    const db = await open({
        filename: ':memory:',
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA busy_timeout = 5000;');
    await db.exec('PRAGMA foreign_keys = ON;');

    await createTables(db);
    await seedColleges(db);

    return db;
}

module.exports = { setupTestDb };