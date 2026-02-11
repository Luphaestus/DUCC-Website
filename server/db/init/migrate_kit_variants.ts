import 'dotenv/config';
import { connect } from '../db.js';
import config from '../../config.js';
import Logger from '../../misc/Logger.js';

(async () => {
    try {
        Logger.info('Migrating kit items to variants...');
        const db = await connect(config.mysql);

        // 1. Create kit_variants table if it doesn't exist
        await db.run(`
            CREATE TABLE IF NOT EXISTS kit_variants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                kit_item_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                total_quantity INT NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (kit_item_id) REFERENCES kit_items(id) ON DELETE CASCADE
            )
        `);

        // 2. Add description and remove size/quantity from kit_items (optional, let's just add description for now)
        try {
            await db.run("ALTER TABLE kit_items ADD COLUMN description TEXT");
        } catch (e) {}

        // 3. Add kit_variant_id to event_kit_requests
        try {
            await db.run("ALTER TABLE event_kit_requests ADD COLUMN kit_variant_id INT");
            await db.run("ALTER TABLE event_kit_requests ADD FOREIGN KEY (kit_variant_id) REFERENCES kit_variants(id) ON DELETE SET NULL");
        } catch (e) {}

        // 4. Migration logic: Group existing kit_items by name/type
        const items = await db.all("SELECT * FROM kit_items");
        
        // Map to keep track of base items we've already processed/created
        const baseItems = new Map(); // key: name + type

        for (const item of items) {
            const key = `${item.name}|${item.type}`;
            if (!baseItems.has(key)) {
                // This is the first time we see this item name/type. 
                // We'll treat this current item row as the base item if it has 'None' size,
                // OR we'll create a new base item and move variants to it.
                // Actually, if we already have many items with same name but different sizes,
                // we should consolidate them.
                
                // For simplicity in migration: 
                // We'll keep the FIRST item we find as the base item for that name/type.
                // Subsequent items with same name/type will be deleted and their info moved to variants of the first item.
                baseItems.set(key, item.id);
                
                // Create a variant for this item if it has a size
                if (item.size && item.size !== 'None') {
                    await db.run(
                        "INSERT INTO kit_variants (kit_item_id, name, total_quantity) VALUES (?, ?, ?)",
                        [item.id, item.size, item.total_quantity]
                    );
                }
            } else {
                const baseId = baseItems.get(key);
                // Create a variant for this base item
                await db.run(
                    "INSERT INTO kit_variants (kit_item_id, name, total_quantity) VALUES (?, ?, ?)",
                    [baseId, item.size || 'Default', item.total_quantity]
                );
                
                // Update existing requests that pointed to this item to point to baseId and the new variant
                const newVariantRes = await db.get("SELECT LAST_INSERT_ID() as id");
                const newVariantId = newVariantRes.id;
                
                await db.run(
                    "UPDATE event_kit_requests SET kit_item_id = ?, kit_variant_id = ? WHERE kit_item_id = ?",
                    [baseId, newVariantId, item.id]
                );

                // Delete the redundant kit_item
                await db.run("DELETE FROM kit_items WHERE id = ?", [item.id]);
            }
        }

        // Clean up kit_items table columns if possible (SQLite/MySQL differences make this tricky with simple ALTER)
        // In MySQL we can drop.
        try {
            await db.run("ALTER TABLE kit_items DROP COLUMN size");
            await db.run("ALTER TABLE kit_items DROP COLUMN total_quantity");
        } catch (e) {}

        await db.close();
        Logger.info('Kit migration complete.');
        process.exit(0);
    } catch (error) {
        Logger.error('Fatal error during kit migration:', error);
        process.exit(1);
    }
})();
