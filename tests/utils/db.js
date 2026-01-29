/**
 * db.js
 * 
 * In-memory SQLite test database utility.
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { createTables } from '../../server/db/init/tables.js';
import { seedColleges } from '../../server/db/init/seed/essential.js';

/** Create test database connection. */
export async function setupTestDb() {
    const db = await open({
        filename: ':memory:', // Transient storage
        driver: sqlite3.Database
    });

    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA busy_timeout = 5000;');
    await db.exec('PRAGMA foreign_keys = ON;');

    await createTables(db);
    await seedColleges(db);

    return db;
}