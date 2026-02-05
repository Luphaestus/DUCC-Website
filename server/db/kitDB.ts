import { statusObject } from '../misc/status.js';
import { DatabaseWrapper } from './db.js';
import Logger from '../misc/Logger.js';

export default class KitDB {
    static async getAllItems(db: DatabaseWrapper): Promise<statusObject> {
        try {
            const items = await db.all('SELECT * FROM kit_items ORDER BY type, name');
            return new statusObject(200, null, items);
        } catch (e) {
            Logger.error('Error fetching kit items', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async createItem(db: DatabaseWrapper, data: any): Promise<statusObject> {
        try {
            const { name, type, size, total_quantity } = data;
            await db.run(
                'INSERT INTO kit_items (name, type, size, total_quantity) VALUES (?, ?, ?, ?)',
                [name, type, size || 'None', total_quantity]
            );
            return new statusObject(201, 'Kit item created');
        } catch (e) {
            Logger.error('Error creating kit item', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async updateItem(db: DatabaseWrapper, id: number, data: any): Promise<statusObject> {
        try {
            const { name, type, size, total_quantity } = data;
            await db.run(
                'UPDATE kit_items SET name=?, type=?, size=?, total_quantity=? WHERE id=?',
                [name, type, size || 'None', total_quantity, id]
            );
            return new statusObject(200, 'Kit item updated');
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
                SELECT r.*, k.name as item_name, k.type as item_type, k.size as item_size, 
                       u.first_name, u.last_name
                FROM event_kit_requests r
                JOIN kit_items k ON r.kit_item_id = k.id
                JOIN users u ON r.user_id = u.id
                WHERE r.event_id = ?
            `, [eventId]);
            return new statusObject(200, null, requests);
        } catch (e) {
            return new statusObject(500, 'Database error');
        }
    }

    static async requestKit(db: DatabaseWrapper, userId: number, eventId: number, kitItemId: number): Promise<statusObject> {
        try {
            // Check if already requested? allow multiple?
            // Assuming unique constraint not set, allow multiple items.
            await db.run(
                'INSERT INTO event_kit_requests (event_id, user_id, kit_item_id) VALUES (?, ?, ?)',
                [eventId, userId, kitItemId]
            );
            return new statusObject(201, 'Kit requested');
        } catch (e) {
            Logger.error('Error requesting kit', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async deleteRequest(db: DatabaseWrapper, id: number, userId: number): Promise<statusObject> {
        try {
            // Only allow user to delete their own request unless admin (checked in API)
            // But here we might just delete by id.
            const req = await db.get('SELECT * FROM event_kit_requests WHERE id = ?', [id]);
            if (!req) return new statusObject(404, 'Request not found');
            
            // Allow if user owns it or if we don't pass userId (admin context)
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
                SELECT k.* 
                FROM user_kit_preferences p
                JOIN kit_items k ON p.kit_item_id = k.id
                WHERE p.user_id = ?
            `, [userId]);
            return new statusObject(200, null, prefs);
        } catch (e) {
            return new statusObject(500, 'Database error');
        }
    }

    static async setUserPreferences(db: DatabaseWrapper, userId: number, itemIds: number[]): Promise<statusObject> {
        try {
            return await db.transaction(async (tx) => {
                await tx.run('DELETE FROM user_kit_preferences WHERE user_id = ?', [userId]);
                for (const itemId of itemIds) {
                    await tx.run('INSERT INTO user_kit_preferences (user_id, kit_item_id) VALUES (?, ?)', [userId, itemId]);
                }
                return new statusObject(200, 'Preferences updated');
            });
        } catch (e) {
            return new statusObject(500, 'Database error');
        }
    }

    static async applyUserDefaultKit(db: DatabaseWrapper, userId: number, eventId: number): Promise<statusObject> {
        try {
            return await db.transaction(async (tx) => {
                await tx.run('DELETE FROM event_kit_requests WHERE user_id = ? AND event_id = ?', [userId, eventId]);
                const prefs = await tx.all('SELECT kit_item_id FROM user_kit_preferences WHERE user_id = ?', [userId]);
                for (const p of prefs) {
                    await tx.run(
                        'INSERT INTO event_kit_requests (event_id, user_id, kit_item_id) VALUES (?, ?, ?)',
                        [eventId, userId, p.kit_item_id]
                    );
                }
                return new statusObject(200);
            });
        } catch (e) {
            Logger.error('Error applying default kit', e);
            return new statusObject(500, 'Database error');
        }
    }

    static async setUserEventKit(db: DatabaseWrapper, userId: number, eventId: number, itemIds: number[]): Promise<statusObject> {
        try {
            return await db.transaction(async (tx) => {
                await tx.run('DELETE FROM event_kit_requests WHERE user_id = ? AND event_id = ?', [userId, eventId]);
                for (const itemId of itemIds) {
                    await tx.run(
                        'INSERT INTO event_kit_requests (event_id, user_id, kit_item_id) VALUES (?, ?, ?)',
                        [eventId, userId, itemId]
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
