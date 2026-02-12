import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';
import checkAuthentication from '../misc/authentication.js';
import Logger from '../misc/Logger.js';

export default class FormsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        // --- Admin Routes ---

        // Get all forms (Admin)
        this.app.get('/api/admin/forms', { preHandler: [checkAuthentication('form.manage')] }, async (req, reply) => {
            try {
                const forms = await this.db.all('SELECT f.*, e.title as event_title, u.first_name as author_name FROM forms f LEFT JOIN events e ON f.event_id = e.id LEFT JOIN users u ON f.created_by = u.id ORDER BY f.created_at DESC');
                return { forms };
            } catch (e: any) {
                Logger.error('Failed to fetch forms', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Get single form (Admin - includes questions)
        this.app.get('/api/admin/forms/:id', { preHandler: [checkAuthentication('form.manage')] }, async (req: any, reply) => {
            try {
                const form = await this.db.get('SELECT * FROM forms WHERE id = ?', [req.params.id]);
                if (!form) return reply.status(404).send({ error: 'Form not found' });

                const questions = await this.db.all('SELECT * FROM form_questions WHERE form_id = ? ORDER BY display_order ASC', [req.params.id]);
                return { form, questions };
            } catch (e: any) {
                Logger.error('Failed to fetch form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Create/Update Form (Admin)
        this.app.post('/api/admin/forms', { preHandler: [checkAuthentication('form.manage')] }, async (req: any, reply) => {
            const { id, title, description, is_global, event_id, questions } = req.body;
            const userId = req.user.id;

            try {
                let formId = id;
                if (id) {
                    await this.db.run('UPDATE forms SET title = ?, description = ?, is_global = ?, event_id = ? WHERE id = ?', [title, description, is_global ? 1 : 0, event_id || null, id]);
                } else {
                    const res = await this.db.run('INSERT INTO forms (title, description, is_global, event_id, created_by) VALUES (?, ?, ?, ?, ?)', [title, description, is_global ? 1 : 0, event_id || null, userId]);
                    formId = res.lastID;
                }

                // Handle Questions (Simple replace logic for MVP: Delete all and recreate)
                // In a production app, you'd want to update existing ones to preserve IDs for data integrity if responses exist.
                // For this iteration, we'll try to update if ID exists, insert if not, and delete removed ones.
                
                const existingQuestions = await this.db.all('SELECT id FROM form_questions WHERE form_id = ?', [formId]);
                const existingIds = existingQuestions.map(q => q.id);
                const incomingIds = questions.map((q: any) => q.id).filter((id: any) => id);

                const toDelete = existingIds.filter(id => !incomingIds.includes(id));
                for (const delId of toDelete) {
                    await this.db.run('DELETE FROM form_questions WHERE id = ?', [delId]);
                }

                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    const options = q.options ? JSON.stringify(q.options) : null;
                    if (q.id) {
                        await this.db.run(
                            'UPDATE form_questions SET type = ?, prompt = ?, options = ?, is_required = ?, max_selections = ?, display_order = ?, dependency_question_id = ?, dependency_value = ? WHERE id = ?',
                            [q.type, q.prompt, options, q.is_required ? 1 : 0, q.max_selections || 1, i, q.dependency_question_id || null, q.dependency_value || null, q.id]
                        );
                    } else {
                        await this.db.run(
                            'INSERT INTO form_questions (form_id, type, prompt, options, is_required, max_selections, display_order, dependency_question_id, dependency_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [formId, q.type, q.prompt, options, q.is_required ? 1 : 0, q.max_selections || 1, i, q.dependency_question_id || null, q.dependency_value || null]
                        );
                    }
                }

                return { success: true, id: formId };
            } catch (e: any) {
                Logger.error('Failed to save form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Delete Form (Admin)
        this.app.delete('/api/admin/forms/:id', { preHandler: [checkAuthentication('form.manage')] }, async (req: any, reply) => {
            try {
                await this.db.run('DELETE FROM forms WHERE id = ?', [req.params.id]);
                return { success: true };
            } catch (e: any) {
                Logger.error('Failed to delete form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // --- User Routes ---

        // Get Form for Viewing/Submitting
        this.app.get('/api/forms/:id', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            try {
                const form = await this.db.get('SELECT id, title, description, is_global, event_id FROM forms WHERE id = ?', [req.params.id]);
                if (!form) return reply.status(404).send({ error: 'Form not found' });

                // TODO: Check if user has access to event if event_id is set

                const questions = await this.db.all('SELECT * FROM form_questions WHERE form_id = ? ORDER BY display_order ASC', [req.params.id]);
                
                // Parse options JSON
                const parsedQuestions = questions.map(q => ({
                    ...q,
                    options: q.options ? JSON.parse(q.options) : []
                }));

                // Check if user already submitted
                const submission = await this.db.get('SELECT id FROM form_submissions WHERE form_id = ? AND user_id = ?', [form.id, req.user.id]);
                const previousAnswers = submission ? await this.db.all('SELECT question_id, value FROM form_answers WHERE submission_id = ?', [submission.id]) : [];

                return { form, questions: parsedQuestions, submission, answers: previousAnswers };
            } catch (e: any) {
                Logger.error('Failed to fetch form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Submit Form Response
        this.app.post('/api/forms/:id/submit', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            const formId = req.params.id;
            const userId = req.user.id;
            const { answers } = req.body; // { question_id: value }

            try {
                // Check if already submitted
                const existing = await this.db.get('SELECT id FROM form_submissions WHERE form_id = ? AND user_id = ?', [formId, userId]);
                let submissionId = existing?.id;

                if (submissionId) {
                    // Update existing (delete old answers and re-insert)
                    await this.db.run('DELETE FROM form_answers WHERE submission_id = ?', [submissionId]);
                    await this.db.run('UPDATE form_submissions SET submitted_at = NOW() WHERE id = ?', [submissionId]);
                } else {
                    const res = await this.db.run('INSERT INTO form_submissions (form_id, user_id) VALUES (?, ?)', [formId, userId]);
                    submissionId = res.lastID;
                }

                for (const [qId, val] of Object.entries(answers)) {
                    // Handle array values (multiselect) by joining or storing as JSON
                    const valueToStore = Array.isArray(val) ? JSON.stringify(val) : String(val);
                    await this.db.run('INSERT INTO form_answers (submission_id, question_id, value) VALUES (?, ?, ?)', [submissionId, qId, valueToStore]);
                }

                return { success: true };
            } catch (e: any) {
                Logger.error('Failed to submit form', e);
                return reply.status(500).send({ error: e.message });
            }
        });
    }
}
