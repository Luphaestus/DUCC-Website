/**
 * db.js
 * 
 * MySQL test database utility.
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';
import { connect } from '../../server/db/db.js';
import { createTables } from '../../server/db/init/tables.js';
import { seedColleges } from '../../server/db/init/seed/essential.js';
import config from '../../server/config.js';

let poolWrapper = null;
let initialized = false;

/** Get singleton test DB pool wrapper */
export async function getTestDbPool() {
    if (!poolWrapper) {
        poolWrapper = await connect(config.mysql);
        try {
            // Verify connection
            await poolWrapper.get('SELECT 1');
        } catch (e) {
            if (e.code === 'ER_BAD_DB_ERROR') {
                // Auto-create DB for parallel workers
                const adminConnection = await mysql.createConnection({
                    host: config.mysql.host,
                    user: config.mysql.user,
                    password: config.mysql.password,
                    port: config.mysql.port
                });
                await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\``);
                await adminConnection.end();
                
                // Re-connect (pool might be in bad state or just retry)
                // Since poolWrapper is just a wrapper, the underlying pool might retry or we can just keep it.
                // But safer to recreate.
                await poolWrapper.close(); 
                poolWrapper = await connect(config.mysql);
            } else {
                throw e;
            }
        }
    }
    return poolWrapper;
}

/** Initialize schema and clean tables (runs once per process) */
export async function initSchemaAndClean() {
    const db = await getTestDbPool();
    const dbName = config.mysql.database;
    const workerId = process.env.VITEST_WORKER_ID || 'main';

    if (!initialized) {
        // console.log(`[Worker ${workerId}] Initializing schema for ${dbName}`);
        
        const conn = await db.connection.getConnection();
        try {
            await conn.query('SET FOREIGN_KEY_CHECKS = 0');
            const tablesToDrop = [
                'kit_items', 'kit_variants', 'user_kit_preferences', 'event_kit_requests',
                'authenticators', 'exec_committee', 'event_attendees', 'event_waiting_list', 
                'transactions', 'swim_history', 'quotes', 'cars', 'event_drivers', 'trips', 
                'event_expenses', 'trip_exclusions', 'expense_exclusions', 'user_managed_tags', 
                'user_permissions', 'user_roles', 'tag_whitelists', 'role_managed_tags', 
                'role_permissions', 'roles', 'tags', 'event_tags', 'password_resets', 
                'slides', 'events', 'users', 'files', 'file_categories', 'colleges', 'permissions',
                'votes', 'nominations', 'election_roles', 'elections',
                'form_answers', 'form_submissions', 'form_questions', 'form_pages', 'forms'
            ];
            for (const table of tablesToDrop) {
                await conn.query(`DROP TABLE IF EXISTS ${table}`);
            }
            await conn.query('SET FOREIGN_KEY_CHECKS = 1');
        } finally {
            conn.release();
        }

        await createTables(db);
        initialized = true;
    }

    // console.log(`[Worker ${workerId}] Cleaning tables for ${dbName}`);

    // Use a single connection for the entire cleanup to ensure session-local settings like FOREIGN_KEY_CHECKS stick.
    const conn = await db.connection.getConnection();
    try {
        await conn.query('SET FOREIGN_KEY_CHECKS = 0');
        
        const tablesToClean = [
            'kit_items', 'kit_variants', 'user_kit_preferences', 'event_kit_requests',
            'authenticators', 'exec_committee', 'event_attendees', 'event_waiting_list', 
            'transactions', 'swim_history', 'quotes', 'cars', 'event_drivers', 'trips', 
            'event_expenses', 'trip_exclusions', 'expense_exclusions', 'user_managed_tags', 
            'user_permissions', 'user_roles', 'tag_whitelists', 'role_managed_tags', 
            'role_permissions', 'roles', 'tags', 'event_tags', 'password_resets', 
            'slides', 'events', 'users', 'files', 'file_categories', 'colleges', 'permissions',
            'votes', 'nominations', 'election_roles', 'elections',
            'form_answers', 'form_submissions', 'form_questions', 'form_pages', 'forms'
        ];

        // Execute truncations sequentially on the same connection
        for (const table of tablesToClean) {
            await conn.query(`TRUNCATE TABLE ${table}`);
        }

        await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
        conn.release();
    }
    
    await seedColleges(db);

    return db;
}

/** 
 * Legacy support / Alias
 * In the new transaction-based testing model, this ensures the DB is ready globally.
 */
export async function setupTestDb() {
    return initSchemaAndClean();
}
