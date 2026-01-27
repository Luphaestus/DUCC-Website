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
import config from '../../config.js';
import Logger from '../../misc/Logger.js';

const env = process.env.NODE_ENV || 'development';
Logger.info(`Running in ${env} mode`);

/**
 * Self-invoking initialization function.
 */
(async () => {
  try {
    Logger.info('Opening database connection...');

    const dbPath = config.paths.db;
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

    Logger.info('Initializing database schema...');

    await createTables(db);
    await seedData(db, env);

    Logger.info('Database initialized successfully.');

    await db.close();
  } catch (error) {
    Logger.error('Error initializing database:', error);
  }
})();
