/**
 * add_form_pages_table.ts
 * 
 * Migration to add form_pages table and link form_questions to it.
 */

import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

export async function migrate(db: DatabaseWrapper) {
    Logger.info('Running migration: add_form_pages_table');

    try {
        // 1. Create form_pages table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS form_pages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                form_id INT NOT NULL,
                title VARCHAR(255),
                description TEXT,
                display_order INT NOT NULL DEFAULT 0,
                FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
            )
        `);
        Logger.info('Table ensured: form_pages');

        // 2. Add page_id column to form_questions
        const columns: any[] = await db.all("SHOW COLUMNS FROM form_questions");
        if (!columns.some(c => c.Field === 'page_id')) {
            await db.exec("ALTER TABLE form_questions ADD COLUMN page_id INT AFTER form_id");
            await db.exec("ALTER TABLE form_questions ADD FOREIGN KEY (page_id) REFERENCES form_pages(id) ON DELETE SET NULL");
            Logger.info('Added column: page_id to form_questions');
        }

        // 3. Migrate existing forms: Create a default page for each form and link questions
        const forms = await db.all("SELECT id FROM forms");
        for (const form of forms) {
            // Check if form already has pages
            const pages = await db.all("SELECT id FROM form_pages WHERE form_id = ?", [form.id]);
            if (pages.length === 0) {
                const res = await db.run("INSERT INTO form_pages (form_id, title, display_order) VALUES (?, 'Default Page', 0)", [form.id]);
                const pageId = res.lastID;
                await db.run("UPDATE form_questions SET page_id = ? WHERE form_id = ?", [pageId, form.id]);
                Logger.info(`Created default page for form ${form.id}`);
            }
        }

    } catch (e: any) {
        Logger.error('Failed to migrate form pages:', e.message);
    }

    Logger.info('Migration complete: add_form_pages_table');
}
