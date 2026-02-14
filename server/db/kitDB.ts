import { statusObject } from '../misc/status.js';
import { DatabaseWrapper } from './db.js';
import Logger from '../misc/Logger.js';
import Utils from '../misc/utils.js';

export default class KitDB {
    static async getAllItems(db: DatabaseWrapper): Promise<statusObject> {
        try {
            const items = await db.all('SELECT * FROM kit_items ORDER BY type, name');
            for (const item of items) {
                item.variants = await db.all('SELECT * FROM kit_variants WHERE kit_item_id = ? ORDER BY name', [item.id]);
            }
            return new statusObject(200, null, items);
        } catch (e) {
            Logger.error('Error fetching kit items', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async createItem(db: DatabaseWrapper, data: any): Promise<statusObject> {
        try {
            const { variants } = data;
            return await db.transaction(async (tx) => {
                const allowedFields = ['name', 'type', 'description'];
                const itemData = Utils.pick(data, allowedFields);
                
                if (!itemData.name || !itemData.type) {
                    return new statusObject(400, 'Name and type are required');
                }

                const result = await tx.run(
                    'INSERT INTO kit_items (name, type, description) VALUES (?, ?, ?)',
                    [itemData.name, itemData.type, itemData.description || '']
                );
                const itemId = result.lastID;

                if (variants && Array.isArray(variants)) {
                    for (const v of variants) {
                        await tx.run(
                            'INSERT INTO kit_variants (kit_item_id, name, total_quantity) VALUES (?, ?, ?)',
                            [itemId, v.name, v.total_quantity || 0]
                        );
                    }
                }
                return new statusObject(201, 'Kit item created');
            });
        } catch (e) {
            Logger.error('Error creating kit item', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async updateItem(db: DatabaseWrapper, id: number, data: any): Promise<statusObject> {
        try {
            const { name, type, description, variants } = data;
            return await db.transaction(async (tx) => {
                const allowedFields = ['name', 'type', 'description'];
                const updates = Utils.pick(data, allowedFields);
                const keys = Object.keys(updates);

                if (keys.length > 0) {
                    const sets = keys.map(k => `${k} = ?`).join(', ');
                    await tx.run(
                        `UPDATE kit_items SET ${sets} WHERE id = ?`,
                        [...Object.values(updates), id]
                    );
                }

                if (variants && Array.isArray(variants)) {
                    // Simple approach: delete and recreate variants? 
                    // Or more complex sync. Let's do sync by name or ID.
                    // For simplicity in this context, I'll delete and recreate if no requests depend on them?
                    // But requests depend on them. So I should update existing ones.
                    
                    const existingVariants = await tx.all('SELECT id FROM kit_variants WHERE kit_item_id = ?', [id]);
                    const existingIds = existingVariants.map(v => v.id);
                    const providedIds = variants.filter(v => v.id).map(v => v.id);

                    // Delete variants not provided
                    for (const vId of existingIds) {
                        if (!providedIds.includes(vId)) {
                            await tx.run('DELETE FROM kit_variants WHERE id = ?', [vId]);
                        }
                    }

                    // Update or insert
                    for (const v of variants) {
                        if (v.id) {
                            await tx.run(
                                'UPDATE kit_variants SET name=?, total_quantity=? WHERE id=?',
                                [v.name, v.total_quantity || 0, v.id]
                            );
                        } else {
                            await tx.run(
                                'INSERT INTO kit_variants (kit_item_id, name, total_quantity) VALUES (?, ?, ?)',
                                [id, v.name, v.total_quantity || 0]
                            );
                        }
                    }
                }
                return new statusObject(200, 'Kit item updated');
            });
        } catch (e) {
            Logger.error('Error updating kit item', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async deleteItem(db: DatabaseWrapper, id: number): Promise<statusObject> {
        try {
            await db.run('DELETE FROM kit_items WHERE id=?', [id]);
            return new statusObject(200, 'Kit item deleted');
        } catch (e) {
            return new statusObject(500, 'Database error');
        }
    }

    static async getRequestsForEvent(db: DatabaseWrapper, eventId: number): Promise<statusObject> {
        try {
            const requests = await db.all(`
                SELECT r.*, k.name as item_name, k.type as item_type, 
                       v.name as variant_name,
                       u.first_name, u.last_name
                FROM event_kit_requests r
                JOIN kit_items k ON r.kit_item_id = k.id
                LEFT JOIN kit_variants v ON r.kit_variant_id = v.id
                JOIN users u ON r.user_id = u.id
                WHERE r.event_id = ?
            `, [eventId]);
            return new statusObject(200, null, requests);
        } catch (e) {
            return new statusObject(500, 'Database error');
        }
    }

    static async requestKit(db: DatabaseWrapper, userId: number, eventId: number, kitItemId: number, kitVariantId: number | null = null): Promise<statusObject> {
        try {
            await db.run(
                'INSERT INTO event_kit_requests (event_id, user_id, kit_item_id, kit_variant_id) VALUES (?, ?, ?, ?)',
                [eventId, userId, kitItemId, kitVariantId]
            );
            return new statusObject(201, 'Kit requested');
        } catch (e) {
            Logger.error('Error requesting kit', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async deleteRequest(db: DatabaseWrapper, id: number, userId: number): Promise<statusObject> {
        try {
            const req = await db.get('SELECT * FROM event_kit_requests WHERE id = ?', [id]);
            if (!req) return new statusObject(404, 'Request not found');
            if (userId && req.user_id !== userId) return new statusObject(403, 'Unauthorized');
            await db.run('DELETE FROM event_kit_requests WHERE id = ?', [id]);
            return new statusObject(200, 'Request removed');
        } catch (e) {
            return new statusObject(500, 'Database error');
        }
    }

    static async toggleFulfillment(db: DatabaseWrapper, id: number): Promise<statusObject> {
        try {
            const req = await db.get('SELECT is_fulfilled FROM event_kit_requests WHERE id = ?', [id]);
            if (!req) return new statusObject(404, 'Request not found');
            await db.run('UPDATE event_kit_requests SET is_fulfilled = ? WHERE id = ?', [!req.is_fulfilled, id]);
            return new statusObject(200, 'Status updated');
        } catch (e) {
            return new statusObject(500, 'Database error');
        }
    }

    static async getUserPreferences(db: DatabaseWrapper, userId: number): Promise<statusObject> {
        try {
            const prefs = await db.all(`
                SELECT p.*, k.name as item_name, k.type as item_type, v.name as variant_name
                FROM user_kit_preferences p
                JOIN kit_items k ON p.kit_item_id = k.id
                LEFT JOIN kit_variants v ON p.kit_variant_id = v.id
                WHERE p.user_id = ?
            `, [userId]);
            return new statusObject(200, null, prefs);
        } catch (e) {
            return new statusObject(500, 'Database error');
        }
    }

    static async setUserPreferences(db: DatabaseWrapper, userId: number, selections: any[]): Promise<statusObject> {
        try {
            if (!selections || !Array.isArray(selections)) return new statusObject(400, 'Invalid selections');
            return await db.transaction(async (tx) => {
                await tx.run('DELETE FROM user_kit_preferences WHERE user_id = ?', [userId]);
                for (const s of selections) {
                    const kitItemId = typeof s === 'number' ? s : s.kit_item_id;
                    const kitVariantId = typeof s === 'number' ? null : s.kit_variant_id;
                    await tx.run('INSERT INTO user_kit_preferences (user_id, kit_item_id, kit_variant_id) VALUES (?, ?, ?)', 
                        [userId, kitItemId, kitVariantId]);
                }
                return new statusObject(200, 'Preferences updated');
            });
        } catch (e) {
            Logger.error('Error setting kit preferences', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async applyUserDefaultKit(db: DatabaseWrapper, userId: number, eventId: number): Promise<statusObject> {
        try {
            return await db.transaction(async (tx) => {
                await tx.run('DELETE FROM event_kit_requests WHERE user_id = ? AND event_id = ?', [userId, eventId]);
                const prefs = await tx.all('SELECT kit_item_id, kit_variant_id FROM user_kit_preferences WHERE user_id = ?', [userId]);
                for (const p of prefs) {
                    await tx.run(
                        'INSERT INTO event_kit_requests (event_id, user_id, kit_item_id, kit_variant_id) VALUES (?, ?, ?, ?)',
                        [eventId, userId, p.kit_item_id, p.kit_variant_id]
                    );
                }
                return new statusObject(200);
            });
        } catch (e) {
            Logger.error('Error applying default kit', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async setUserEventKit(db: DatabaseWrapper, userId: number, eventId: number, selections: { kit_item_id: number, kit_variant_id: number | null }[]): Promise<statusObject> {
        try {
            if (!selections || !Array.isArray(selections)) return new statusObject(400, 'Invalid selections');
            return await db.transaction(async (tx) => {
                await tx.run('DELETE FROM event_kit_requests WHERE user_id = ? AND event_id = ?', [userId, eventId]);
                for (const s of selections) {
                    await tx.run(
                        'INSERT INTO event_kit_requests (event_id, user_id, kit_item_id, kit_variant_id) VALUES (?, ?, ?, ?)',
                        [eventId, userId, s.kit_item_id, s.kit_variant_id]
                    );
                }
                return new statusObject(200, 'Event kit updated');
            });
        } catch (e) {
            Logger.error('Error setting event kit', e);
            return new statusObject(500, 'Database error');
        }
    }
}
