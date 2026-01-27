/**
 * db.js
 * 
 * Utility for creating a transient, in-memory SQLite database for unit tests.
 * Ensures each test suite runs in total isolation.
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createTables } from '../../server/db/init/tables.js';
import { seedColleges } from '../../server/db/init/seed/essential.js';

/**
 * Creates and initializes an in-memory SQLite connection.
 * @returns {Promise<object>} - The SQLite database instance.
 */
export async function setupTestDb() {
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
