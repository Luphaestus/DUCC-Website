/**
 * init.js
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
 * Wipes data from tables while preserving admin and sessions.
 */
async function wipeData(db) {
  Logger.info('Wiping data (preserving admin & sessions)...');
  const tablesToWipe = [
    'events', 'event_attendees', 'event_waiting_list', 'transactions', 'swim_history',
    'quotes', 'cars', 'trips', 'event_drivers', 'event_expenses', 'trip_exclusions',
    'expense_exclusions', 'user_managed_tags', 'user_permissions', 'user_roles',
    'tag_whitelists', 'role_managed_tags', 'role_permissions', 'roles', 'tags',
    'password_resets', 'slides', 'exec_committee', 'authenticators'
  ];

  await db.run('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tablesToWipe) {
    try {
      const exists = await db.get(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [table]);
      if (exists) await db.run(`DELETE FROM ${table}`);
    } catch (e) { }
  }
  
  // Wipe users except admin
  try {
    await db.run("DELETE FROM users WHERE email != 'admin@durham.ac.uk'");
  } catch (e) { }
  
  await db.run('SET FOREIGN_KEY_CHECKS = 1');
}

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
    } catch (e) {
        if (e.code === 'ER_BAD_DB_ERROR') {
            Logger.info('Database does not exist (Authentication successful). Attempting to create...');
            // Now try to create it. 
            // We know 'mysql' DB access failed. Try 'information_schema' or no DB with 'localhost' override?
            // Let's try connecting with NO database but force LOCALHOST if host is 127.0.0.1, 
            // assuming root@localhost is the valid user and 127.0.0.1 was causing issues for global access?
            
            // Actually, if we are here, auth worked for 'ducc_website' (but DB missing).
            // This means we CAN connect to the server.
            
            const adminConnection = await mysql.createConnection({
                host: config.mysql.host, 
                user: config.mysql.user,
                password: config.mysql.password,
                port: config.mysql.port
                // No database selected
            });
            await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\``);
            await adminConnection.end();
            Logger.info('Database created successfully.');
        } else {
            throw e;
        }
    }

    Logger.info('Opening database connection...');

    const db = await connect(config.mysql);

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
    process.exit(1);
  }
})();
