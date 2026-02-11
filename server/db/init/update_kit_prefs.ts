import 'dotenv/config';
import { connect } from '../db.js';
import config from '../../config.js';
import Logger from '../../misc/Logger.js';

(async () => {
    try {
        Logger.info('Updating user_kit_preferences to support variants...');
        const db = await connect(config.mysql);

        try {
            await db.run("ALTER TABLE user_kit_preferences ADD COLUMN kit_variant_id INT");
            await db.run("ALTER TABLE user_kit_preferences ADD FOREIGN KEY (kit_variant_id) REFERENCES kit_variants(id) ON DELETE SET NULL");
            
            // Drop old primary key and add new one if we want to allow multiple variants of same item, 
            // OR keep it restricted to one variant per item. 
            // The prompt implies "selecting the varient", so likely one per item.
            // But user_id, kit_item_id as PK is fine for "one variant per item".
        } catch (e: any) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                Logger.info('kit_variant_id already exists.');
            } else {
                Logger.error('Error adding kit_variant_id:', e);
            }
        }

        await db.close();
        Logger.info('user_kit_preferences update complete.');
        process.exit(0);
    } catch (error) {
        Logger.error('Fatal error during migration:', error);
        process.exit(1);
    }
})();
