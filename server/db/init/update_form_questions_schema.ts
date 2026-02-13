/**
 * update_form_questions_schema.ts
 * 
 * Migration to add description and dependency_operator to form_questions.
 */

import { DatabaseWrapper } from '../db.js';
import Logger from '../../misc/Logger.js';

export async function migrate(db: DatabaseWrapper) {
    Logger.info('Running migration: update_form_questions_schema');

    try {
        const columns: any[] = await db.all("SHOW COLUMNS FROM form_questions");
        
        if (!columns.some(c => c.Field === 'description')) {
            await db.exec("ALTER TABLE form_questions ADD COLUMN description TEXT AFTER prompt");
            Logger.info('Added column: description to form_questions');
        }

        if (!columns.some(c => c.Field === 'dependency_operator')) {
            await db.exec("ALTER TABLE form_questions ADD COLUMN dependency_operator VARCHAR(20) DEFAULT 'equals' AFTER dependency_question_id");
            Logger.info('Added column: dependency_operator to form_questions');
        }

    } catch (e: any) {
        Logger.error('Failed to update form_questions schema:', e.message);
    }

    Logger.info('Migration complete: update_form_questions_schema');
}
