/**
 * add_form_management_permissions.ts
 * 
 * Migration to add junction table for form management permissions.
 */

import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

export async function migrate(db: DatabaseWrapper) {
    Logger.info('Running migration: add_form_management_permissions');

    const tableName = 'form_management_permissions';
    const schema = `
        form_id INT NOT NULL,
        permission_id INT NOT NULL,
        PRIMARY KEY (form_id, permission_id),
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    `;

    try {
        await db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`);
        Logger.info(`Table ensured: ${tableName}`);
    } catch (e: any) {
        Logger.error(`Failed to ensure table ${tableName}:`, e.message);
    }

    Logger.info('Migration complete: add_form_management_permissions');
}
