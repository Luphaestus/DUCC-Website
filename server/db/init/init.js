/**
 * init.js
 * 
 * Main database initialization script.
 * Responsible for:
 * 1. Establishing the initial connection.
 * 2. Creating the file-based database if it doesn't exist.
 * 3. Executing schema creation (tables).
 * 4. Triggering initial data seeding.
 */

const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const { createTables } = require('./tables');
const { seedData } = require('./seed');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
console.log(`Running in ${env} mode`);

/**
 * Self-invoking initialization function.
 * Connects, optimizes, creates tables, and seeds.
 */
(async () => {
  try {
    console.log('Opening database connection...');

    const dbPath = process.env.DATABASE_PATH || 'data/database.db';
    const dbDir = path.dirname(dbPath);

    // Create the data directory if it's missing
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // SQLite Performance & Safety settings
    await db.exec('PRAGMA journal_mode = WAL;'); // Write-Ahead Logging for better concurrency
    await db.exec('PRAGMA busy_timeout = 5000;'); // Wait up to 5s for locks to clear
    await db.exec('PRAGMA foreign_keys = ON;');   // Enforce referential integrity

    console.log('Initializing database schema...');

    // Run table creation scripts
    await createTables(db);

    // Run data seeding scripts
    await seedData(db, env);

    console.log('Database initialized successfully.');

    await db.close();
  } catch (error) {
    console.error('Error initializing database:', error);
  }
})();