/**
 * keysDB.ts
 * 
 * This module handles database operations for boatshed keys.
 */

import { statusObject } from '../misc/status.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';

export default class KeysDB {
    private static schemaEnsured = false;

    private static async ensureKeyLogsSchema(db: DatabaseWrapper): Promise<void> {
        if (KeysDB.schemaEnsured) return;

        try {
            await db.run("ALTER TABLE key_logs ADD COLUMN event_type ENUM('create','transfer','delete') NOT NULL DEFAULT 'transfer'");
        } catch (error: any) {
            if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
        }

        await db.run("UPDATE key_logs SET event_type = 'transfer' WHERE event_type IS NULL OR event_type = ''");
        KeysDB.schemaEnsured = true;
    }

    /**
     * Fetch all keys with their current holder information.
     */
    static async getKeys(db: DatabaseWrapper): Promise<statusObject> {
        try {
            await KeysDB.ensureKeyLogsSchema(db);
            const keys = await db.all(`
                SELECT k.id, k.holder_id, k.created_at, k.updated_at, u.first_name, u.last_name, u.email,
                       CONCAT('/api/files/', u.profile_picture_id, '/download?view=true') as profile_picture_path
                FROM \`keys\` k
                LEFT JOIN users u ON k.holder_id = u.id
                WHERE k.is_deleted = 0
                ORDER BY k.id ASC
            `);
            return new statusObject(200, null, keys);
        } catch (error) {
            Logger.error('Database error in getKeys:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new key.
     */
    static async createKey(db: DatabaseWrapper, holderId: number): Promise<statusObject> {
        try {
            await KeysDB.ensureKeyLogsSchema(db);
            return await db.transaction(async (tx) => {
                const result = await tx.run(
                    'INSERT INTO `keys` (holder_id) VALUES (?)',
                    [holderId]
                );

                await tx.run(
                    "INSERT INTO key_logs (key_id, from_user_id, to_user_id, transferred_by_id, event_type) VALUES (?, NULL, ?, ?, 'create')",
                    [result.lastID, holderId, holderId]
                );

                return new statusObject(201, 'Key created.', { id: result.lastID });
            });
        } catch (error) {
            Logger.error('Database error in createKey:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Transfer a key to a new holder.
     */
    static async transferKey(db: DatabaseWrapper, keyId: number, newHolderId: number | null, transferredById: number): Promise<statusObject> {
        try {
            await KeysDB.ensureKeyLogsSchema(db);
            return await db.transaction(async (tx) => {
                const currentKey = await tx.get('SELECT holder_id, is_deleted FROM `keys` WHERE id = ?', [keyId]);
                if (!currentKey) throw new Error('Key not found.');
                if (currentKey.is_deleted) throw new Error('Cannot transfer a deleted key.');

                await tx.run(
                    'UPDATE `keys` SET holder_id = ? WHERE id = ?',
                    [newHolderId, keyId]
                );

                // Log the transfer
                await tx.run(
                    "INSERT INTO key_logs (key_id, from_user_id, to_user_id, transferred_by_id, event_type) VALUES (?, ?, ?, ?, 'transfer')",
                    [keyId, currentKey.holder_id, newHolderId, transferredById]
                );

                return new statusObject(200, 'Key transferred.');
            });
        } catch (error: any) {
            Logger.error('Database error in transferKey:', error);
            return new statusObject(500, error.message || 'Database error');
        }
    }

    /**
     * Fetch all key transfer logs.
     */
    static async getKeyLogs(db: DatabaseWrapper): Promise<statusObject> {
        try {
            await KeysDB.ensureKeyLogsSchema(db);
            const logs = await db.all(`
                SELECT kl.*, 
                       u_from.first_name as from_first_name, u_from.last_name as from_last_name,
                       u_to.first_name as to_first_name, u_to.last_name as to_last_name,
                       u_by.first_name as by_first_name, u_by.last_name as by_last_name
                FROM key_logs kl
                LEFT JOIN users u_from ON kl.from_user_id = u_from.id
                LEFT JOIN users u_to ON kl.to_user_id = u_to.id
                JOIN users u_by ON kl.transferred_by_id = u_by.id
                ORDER BY kl.timestamp DESC
                LIMIT 100
            `);
            return new statusObject(200, null, logs);
        } catch (error) {
            Logger.error('Database error in getKeyLogs:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Delete a key (Soft Delete).
     */
    static async deleteKey(db: DatabaseWrapper, keyId: number, deletedById: number): Promise<statusObject> {
        try {
            await KeysDB.ensureKeyLogsSchema(db);
            return await db.transaction(async (tx) => {
                const currentKey = await tx.get('SELECT holder_id, is_deleted FROM `keys` WHERE id = ?', [keyId]);
                if (!currentKey) return new statusObject(404, 'Key not found.');
                if (currentKey.is_deleted) return new statusObject(400, 'Key already deleted.');

                await tx.run('UPDATE `keys` SET is_deleted = 1, deleted_by_id = ?, holder_id = NULL WHERE id = ?', [deletedById, keyId]);
                await tx.run(
                    "INSERT INTO key_logs (key_id, from_user_id, to_user_id, transferred_by_id, event_type) VALUES (?, ?, NULL, ?, 'delete')",
                    [keyId, currentKey.holder_id, deletedById]
                );

                return new statusObject(200, 'Key deleted.');
            });
        } catch (error) {
            Logger.error('Database error in deleteKey:', error);
            return new statusObject(500, 'Database error');
        }
    }
}
