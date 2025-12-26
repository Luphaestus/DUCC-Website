const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { createTables } = require('./tables');
const { seedData } = require('./seed');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
console.log(`Running in ${env} mode`);

/**
 * Database initialization: connects, creates tables, and seeds data.
 */
(async () => {
  try {
    console.log('Opening database connection...');

    const dbPath = process.env.DATABASE_PATH || 'database.db';
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.exec('PRAGMA foreign_keys = ON;');

    console.log('Initializing database schema...');

    await createTables(db);

    await seedData(db, env);

    console.log('Database initialized successfully.');

    await db.close();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
})();