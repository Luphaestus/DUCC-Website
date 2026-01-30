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
const shouldWipe = process.argv.includes('--seed');
Logger.info(`Running in ${env} mode` + (shouldWipe ? ' (Force Wiping)' : ''));

/**
 * Wipes data from tables while preserving admin and sessions.
 */
async function wipeData(db) {
  Logger.info('Wiping data (preserving admin & sessions)...');
  const tablesToWipe = [
    'events', 'event_attendees', 'event_waiting_list', 'transactions', 'swim_history',
    'quotes', 'cars', 'trips', 'event_drivers', 'event_expenses', 'trip_exclusions',
    'expense_exclusions', 'user_managed_tags', 'user_permissions', 'user_roles',
    'tag_whitelists', 'role_managed_tags', 'role_permissions', 'roles', 'tags',
    'password_resets', 'slides'
  ];

  await db.run('PRAGMA foreign_keys = OFF');
  for (const table of tablesToWipe) {
    try {
      const exists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
      if (exists) await db.run(`DELETE FROM ${table}`);
    } catch (e) { }
  }
  
  // Wipe users except admin
  try {
    await db.run("DELETE FROM users WHERE email != 'admin@durham.ac.uk'");
  } catch (e) { }
  
  await db.run('PRAGMA foreign_keys = ON');
}

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

    if (shouldWipe) {
      await wipeData(db);
    }

    Logger.info('Initializing database schema...');

    const newlyCreatedTables = await createTables(db);
    const tablesToForceSeed = shouldWipe ? [
      'users', 'events', 'tags', 'roles', 'slides', 'quotes', 'cars', 'swim_history'
    ] : [];
    
    await seedData(db, env, [...new Set(newlyCreatedTables.concat(tablesToForceSeed))]);

    Logger.info('Database initialized successfully.');

    await db.close();
  } catch (error) {
    Logger.error('Error initializing database:', error);
  }
})();
