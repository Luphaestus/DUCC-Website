/**
 * init.ts
 * 
 * Main database initialization script that connects to MySQL, optimizes performance, 
 * creates tables, and triggers data seeding.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { connect } from '../db.js';
import { createTables } from './tables.js';
import { seedData } from './seed.js';
import config from '../../config.js';
import Logger from '../../misc/Logger.js';

const env = process.env.NODE_ENV || 'development';
const shouldWipe = process.argv.includes('--seed');
Logger.info(`Running in ${env} mode` + (shouldWipe ? ' (Force Wiping)' : ''));

/**
 * Self-invoking initialization function.
 */
(async () => {
  try {
    Logger.info('Checking database existence...');
    Logger.info(`DB Config: Host=${config.mysql.host} User=${config.mysql.user} DB=${config.mysql.database} Password=${config.mysql.password ? '******' : '(none)'}`);
    
    // Test connection with target DB to verify credentials (expecting ER_BAD_DB_ERROR if creds are good but DB missing)
    try {
        const testPool = mysql.createPool({
            host: config.mysql.host,
            user: config.mysql.user,
            password: config.mysql.password,
            port: config.mysql.port,
            database: config.mysql.database 
        });
        await testPool.query('SELECT 1');
        await testPool.end();
        Logger.info('Database already exists and is accessible.');
    } catch (e: any) {
        if (e.code === 'ER_BAD_DB_ERROR') {
            Logger.info('Database does not exist (Authentication successful). Attempting to create...');
            
            const adminConnection = await mysql.createConnection({
                host: config.mysql.host, 
                user: config.mysql.user,
                password: config.mysql.password,
                port: config.mysql.port
                // No database selected
            });
            await adminConnection.query(`CREATE DATABASE IF NOT EXISTS 
${config.mysql.database}
`);
            await adminConnection.end();
            Logger.info('Database created successfully.');
        } else {
            throw e;
        }
    }

    Logger.info('Opening database connection...');

    const db = await connect(config.mysql);

    if (shouldWipe) {
      Logger.info('Dropping tables for schema refresh...');
      await db.run('SET FOREIGN_KEY_CHECKS = 0');
      const tables = [
        'event_kit_requests', 'kit_items', 'sessions',
        'event_attendees', 'event_waiting_list', 'transactions', 'swim_history',
        'quotes', 'cars', 'trips', 'event_drivers', 'event_expenses', 'trip_exclusions',
        'expense_exclusions', 'user_managed_tags', 'user_permissions', 'user_roles',
        'tag_whitelists', 'role_managed_tags', 'roles', 'tags', 'password_resets',
        'slides', 'exec_committee', 'authenticators', 'events', 'users', 'files',
        'file_categories', 'colleges'
      ];
      for (const table of tables) {
        await db.run(`DROP TABLE IF EXISTS ${table}`);
      }
      await db.run('SET FOREIGN_KEY_CHECKS = 1');
      Logger.info('Tables dropped.');
    }

    Logger.info('Initializing database schema...');

    const newlyCreatedTables = await createTables(db);

    // Ensure sessions table is correct (it might exist but with wrong columns from previous versions)
    try {
        const columns: any[] = await db.all("SHOW COLUMNS FROM sessions");
        if (!columns.some(c => c.Field === 'id')) {
            Logger.info('Sessions table is invalid. Recreating...');
            await db.run('DROP TABLE sessions');
            await createTables(db);
        }
    } catch (e) {}

    const tablesToForceSeed = shouldWipe ? [
      'users', 'events', 'tags', 'roles', 'slides', 'quotes', 'cars', 'swim_history', 'exec_committee'
    ] : [];
    
    await seedData(db, env, [...new Set(newlyCreatedTables.concat(tablesToForceSeed))]);

    Logger.info('Database initialized successfully.');

    await db.close();
  } catch (error) {
    Logger.error('Error initializing database:', error);
    process.exit(1);
  }
})();
