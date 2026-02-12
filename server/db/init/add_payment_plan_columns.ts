import 'dotenv/config';
import { connect } from '../db.js';
import config from '../../config.js';
import Logger from '../../misc/Logger.js';

(async () => {
    try {
        Logger.info('Adding payment plan columns to users table...');
        const db = await connect(config.mysql);

        // Add debt_limit to users
        try {
            await db.run(`
                ALTER TABLE users 
                ADD COLUMN debt_limit DECIMAL(10, 2) NOT NULL DEFAULT 0.00
            `);
            Logger.info('Added debt_limit column to users table.');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                Logger.info('debt_limit column already exists in users table.');
            } else {
                Logger.error('Error adding debt_limit column:', e);
            }
        }

        // Add debt_limit_expires_at to users
        try {
            await db.run(`
                ALTER TABLE users 
                ADD COLUMN debt_limit_expires_at DATETIME
            `);
            Logger.info('Added debt_limit_expires_at column to users table.');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                Logger.info('debt_limit_expires_at column already exists in users table.');
            } else {
                Logger.error('Error adding debt_limit_expires_at column:', e);
            }
        }

        await db.close();
        Logger.info('Payment plan columns added successfully.');
        process.exit(0);
    } catch (error) {
        Logger.error('Fatal error during schema update:', error);
        process.exit(1);
    }
})();
