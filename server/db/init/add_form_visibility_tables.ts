/**
 * add_form_visibility_tables.ts
 * 
 * Migration to add junction tables for form visibility and management.
 */

import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

export async function migrate(db: DatabaseWrapper) {
    Logger.info('Running migration: add_form_visibility_tables');

    const tables = [
        {
            name: 'form_visibility_tags',
            schema: `
                form_id INT NOT NULL,
                tag_id INT NOT NULL,
                PRIMARY KEY (form_id, tag_id),
                FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            `
        },
        {
            name: 'form_visibility_roles',
            schema: `
                form_id INT NOT NULL,
                role_id INT NOT NULL,
                PRIMARY KEY (form_id, role_id),
                FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            `
        },
        {
            name: 'form_visibility_permissions',
            schema: `
                form_id INT NOT NULL,
                permission_id INT NOT NULL,
                PRIMARY KEY (form_id, permission_id),
                FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
                FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            `
        },
        {
            name: 'form_management_roles',
            schema: `
                form_id INT NOT NULL,
                role_id INT NOT NULL,
                PRIMARY KEY (form_id, role_id),
                FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
            `
        }
    ];

    for (const table of tables) {
        try {
            await db.exec(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`);
            Logger.info(`Table ensured: ${table.name}`);
        } catch (e: any) {
            Logger.error(`Failed to ensure table ${table.name}:`, e.message);
        }
    }

    Logger.info('Migration complete: add_form_visibility_tables');
}
