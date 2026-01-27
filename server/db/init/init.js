/**
 * init.js
 * 
 * Main database initialization script that connects to SQLite, optimizes performance, 
 * creates tables, and triggers data seeding.
 */

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { createTables } from './tables.js';
import { seedData } from './seed.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const env = process.env.NODE_ENV || 'development';
console.log(`Running in ${env} mode`);

/**
 * Self-invoking initialization function.
 */
(async () => {
  try {
    console.log('Opening database connection...');

    const dbPath = process.env.DATABASE_PATH || 'data/database.db';
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA busy_timeout = 5000;');
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
