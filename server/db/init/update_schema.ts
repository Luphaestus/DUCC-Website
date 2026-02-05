import 'dotenv/config';
import { connect } from '../db.js';
import config from '../../config.js';
import Logger from '../../misc/Logger.js';

(async () => {
    try {
        Logger.info('Updating database schema...');
        const db = await connect(config.mysql);

        // 1. Add status to events
        try {
            await db.run(`
                ALTER TABLE events 
                ADD COLUMN status ENUM('confirmed', 'pending', 'scheduled') NOT NULL DEFAULT 'confirmed'
            `);
            Logger.info('Added status column to events table.');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                Logger.info('status column already exists in events table.');
            } else {
                Logger.error('Error adding status column:', e);
            }
        }

        // 2. Add visible_at to events
        try {
            await db.run(`
                ALTER TABLE events 
                ADD COLUMN visible_at DATETIME
            `);
            Logger.info('Added visible_at column to events table.');
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                Logger.info('visible_at column already exists in events table.');
            } else {
                Logger.error('Error adding visible_at column:', e);
            }
        }

        // 3. Create kit_items table
        try {
            await db.run(`
                CREATE TABLE IF NOT EXISTS kit_items (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    type ENUM('paddle', 'ba', 'boat', 'wetsuit', 'cag', 'helmet', 'other') NOT NULL,
                    size ENUM('XS', 'S', 'M', 'L', 'XL', 'XXL', 'None') DEFAULT 'None',
                    total_quantity INT NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            Logger.info('Created kit_items table.');
        } catch (e) {
            Logger.error('Error creating kit_items table:', e);
        }

        // 4. Create event_kit_requests table
        try {
            await db.run(`
                CREATE TABLE IF NOT EXISTS event_kit_requests (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    event_id INT NOT NULL,
                    user_id INT NOT NULL,
                    kit_item_id INT NOT NULL,
                    is_fulfilled TINYINT(1) DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (kit_item_id) REFERENCES kit_items(id) ON DELETE CASCADE
                )
            `);
            Logger.info('Created event_kit_requests table.');
        } catch (e) {
            Logger.error('Error creating event_kit_requests table:', e);
        }

        await db.close();
        Logger.info('Schema update complete.');
        process.exit(0);
    } catch (error) {
        Logger.error('Fatal error during schema update:', error);
        process.exit(1);
    }
})();