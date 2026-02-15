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
const shouldWipe = process.argv.includes('--seed') || process.argv.includes('--reseed') || process.argv.includes('-f') || process.argv.includes('f');
const fullReseed = process.argv.includes('--reseed') || process.argv.includes('-f') || process.argv.includes('f');
Logger.info(`Running in ${env} mode` + (fullReseed ? ' (Full Reseed)' : (shouldWipe ? ' (Force Wiping)' : '')));

/**
 * Self-invoking initialization function.
 */
(async () => {
  try {
    if (fullReseed) {
        Logger.info('Full reseed requested. Dropping database...');
        try {
            const rootConnection = await mysql.createConnection({
                host: config.mysql.host,
                user: 'root',
                password: config.mysql.user === 'root' ? config.mysql.password : config.mysql.rootPassword,
                port: config.mysql.port
            });
            await rootConnection.query(`DROP DATABASE IF EXISTS ${config.mysql.database}`);
            await rootConnection.query(`CREATE DATABASE ${config.mysql.database}`);
            await rootConnection.end();
            Logger.info('Database dropped and recreated.');
        } catch (e: any) {
            Logger.warn(`Failed to recreate database as root: ${e.message}. Falling back to table wiping.`);
        }
    }

    Logger.info('Checking database existence...');
    Logger.info(`DB Config: Host=${config.mysql.host} User=${config.mysql.user} DB=${config.mysql.database} Password=${config.mysql.password ? '******' : '(none)'}`);
    
    let canConnect = false;
    let retries = 0;
    const maxRetries = 20;

    while (retries < maxRetries && !canConnect) {
        try {
            const testPool = mysql.createPool({
                host: config.mysql.host,
                user: config.mysql.user,
                password: config.mysql.password,
                port: config.mysql.port,
                database: config.mysql.database,
                connectTimeout: 10000 
            });
            await testPool.query('SELECT 1');
            await testPool.end();
            Logger.info('Database already exists and is accessible.');
            canConnect = true;
        } catch (e: any) {
            if (e.code === 'ER_BAD_DB_ERROR') {
                Logger.info('Database does not exist (Authentication successful). Attempting to create...');
                try {
                    const adminConnection = await mysql.createConnection({
                        host: config.mysql.host, 
                        user: config.mysql.user,
                        password: config.mysql.password,
                        port: config.mysql.port
                    });
                    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS ${config.mysql.database}`);
                    await adminConnection.end();
                    Logger.info('Database created successfully.');
                    canConnect = true;
                } catch (adminError: any) {
                    Logger.error('Failed to create database as user:', adminError.message);
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } else if (e.code === 'ER_HOST_NOT_PRIVILEGED' || e.code === 'ER_ACCESS_DENIED_ERROR') {
                Logger.warn(`Access denied for user '${config.mysql.user}'. Attempting to fix permissions using root...`);
                try {
                    const rootConnection = await mysql.createConnection({
                        host: config.mysql.host,
                        user: 'root',
                        password: config.mysql.rootPassword,
                        port: config.mysql.port
                    });
                    
                    Logger.info('Connected as root. Ensuring database and user permissions...');
                    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS ${config.mysql.database}`);
                    await rootConnection.query(`CREATE USER IF NOT EXISTS '${config.mysql.user}'@'%' IDENTIFIED BY '${config.mysql.password}'`);
                    await rootConnection.query(`GRANT ALL PRIVILEGES ON ${config.mysql.database}.* TO '${config.mysql.user}'@'%'`);
                    await rootConnection.query(`ALTER USER '${config.mysql.user}'@'%' IDENTIFIED BY '${config.mysql.password}'`);
                    await rootConnection.query('FLUSH PRIVILEGES');
                    
                    await rootConnection.end();
                    Logger.info('Permissions fixed successfully.');
                    canConnect = true;
                } catch (rootError: any) {
                    Logger.info(`Failed to fix permissions as root: ${rootError.message}. MySQL might still be initializing...`);
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            } else if (e.code === 'ECONNREFUSED' || e.code === 'PROTOCOL_CONNECTION_LOST' || e.code === 'ETIMEDOUT') {
                Logger.info(`Waiting for database server to start... (Attempt ${retries + 1}/${maxRetries})`);
                retries++;
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                Logger.error(`Unexpected connection error: ${e.code} - ${e.message}`);
                throw e;
            }
        }
    }

    if (!canConnect) {
        throw new Error('Could not establish database connection after multiple attempts.');
    }

    Logger.info('Opening database connection...');

    const db = await connect(config.mysql);

    if (shouldWipe) {
      Logger.info('Dropping tables for schema refresh...');
      await db.run('SET FOREIGN_KEY_CHECKS = 0');
      const tables = [
        'event_kit_requests', 'kit_items', 'kit_variants', 'user_kit_preferences',
        'push_subscriptions', 'user_notification_settings', 
        'form_answers', 'form_submissions', 'form_questions', 'forms',
        'votes', 'nominations', 'election_roles', 'elections',
        'event_attendees', 'event_waiting_list', 'transactions', 'swim_history',
        'quotes', 'cars', 'trips', 'event_drivers', 'event_expenses', 'trip_exclusions',
        'expense_exclusions', 'user_managed_tags', 'user_permissions', 'user_roles',
        'tag_whitelists', 'role_managed_tags', 'roles', 'tags', 'password_resets',
        'slides', 'exec_committee', 'authenticators', 'events', 'users', 'files',
        'file_categories', 'colleges', 'user_invitations', 'user_emails', 'key_logs', '`keys`', 'system_metrics'
      ];
      // Note: 'sessions' table is intentionally omitted here to preserve logins during reseed.
      // It is only dropped at the very top of the script if fullReseed is true (via root connection).
      
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
      'users', 'events', 'tags', 'roles', 'slides', 'quotes', 'cars', 'swim_history', 'exec_committee', 'elections'
    ] : [];
    
    await seedData(db, env, [...new Set(newlyCreatedTables.concat(tablesToForceSeed))]);

    Logger.info('Database initialized successfully.');

    await db.close();
  } catch (error) {
    Logger.error('Error initializing database:', error);
    process.exit(1);
  }
})();
