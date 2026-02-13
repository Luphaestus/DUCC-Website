import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';
import checkAuthentication from '../misc/authentication.js';
import Logger from '../misc/Logger.js';
import { Permissions } from '../misc/permissions.js';

export default class FormsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    private async canManageForm(userId: number, formId: number): Promise<boolean> {
        if (await Permissions.hasPermission(this.db, userId, 'form.manage')) return true;

        const result = await this.db.get(`
            SELECT 1 FROM forms f
            WHERE f.id = ? AND (
                f.created_by = ? OR 
                EXISTS (
                    SELECT 1 FROM form_management_roles fmr
                    JOIN user_roles ur ON fmr.role_id = ur.role_id
                    WHERE fmr.form_id = f.id AND ur.user_id = ?
                ) OR
                EXISTS (
                    SELECT 1 FROM form_management_permissions fmp
                    LEFT JOIN user_permissions up ON fmp.permission_id = up.permission_id
                    LEFT JOIN role_permissions rp ON fmp.permission_id = rp.permission_id
                    LEFT JOIN user_roles ur ON rp.role_id = ur.role_id
                    WHERE fmp.form_id = f.id AND (up.user_id = ? OR ur.user_id = ?)
                )
            )
        `, [formId, userId, userId, userId, userId]);

        return !!result;
    }

    registerRoutes() {
        // --- Admin Routes ---

        // Get all forms (Admin)
        this.app.get('/api/admin/forms', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            try {
                const userId = req.user.id;
                const hasGlobalManage = await Permissions.hasPermission(this.db, userId, 'form.manage');
                const hasAnyManagementRole = (await this.db.get('SELECT 1 FROM form_management_roles fmr JOIN user_roles ur ON fmr.role_id = ur.role_id WHERE ur.user_id = ? LIMIT 1', [userId])) !== undefined;
                const hasAnyManagementPerm = (await this.db.get('SELECT 1 FROM form_management_permissions fmp LEFT JOIN user_permissions up ON fmp.permission_id = up.permission_id LEFT JOIN role_permissions rp ON fmp.permission_id = rp.permission_id LEFT JOIN user_roles ur ON rp.role_id = ur.role_id WHERE up.user_id = ? OR ur.user_id = ? LIMIT 1', [userId, userId])) !== undefined;

                if (!hasGlobalManage && !hasAnyManagementRole && !hasAnyManagementPerm && !(await Permissions.hasPermission(this.db, userId, 'exec.publish'))) {
                    return reply.status(403).send({ error: 'Forbidden' });
                }
                
                let query = 'SELECT f.*, e.title as event_title, u.first_name as author_name FROM forms f LEFT JOIN events e ON f.event_id = e.id LEFT JOIN users u ON f.created_by = u.id';
                let params: any[] = [];

                if (!hasGlobalManage) {
                    // Filter forms where user is in a management role or created it
                    query += ` WHERE f.created_by = ? OR f.id IN (
                        SELECT form_id FROM form_management_roles fmr
                        JOIN user_roles ur ON fmr.role_id = ur.role_id
                        WHERE ur.user_id = ?
                    ) OR f.id IN (
                        SELECT form_id FROM form_management_permissions fmp
                        LEFT JOIN user_permissions up ON fmp.permission_id = up.permission_id
                        LEFT JOIN role_permissions rp ON fmp.permission_id = rp.permission_id
                        LEFT JOIN user_roles ur ON rp.role_id = ur.role_id
                        WHERE up.user_id = ? OR ur.user_id = ?
                    )`;
                    params = [userId, userId, userId, userId];
                }

                query += ' ORDER BY f.created_at DESC';
                const forms = await this.db.all(query, params);
                return { forms };
            } catch (e: any) {
                Logger.error('Failed to fetch forms', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Get single form (Admin - includes questions)
        this.app.get('/api/admin/forms/:id', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            try {
                const formId = req.params.id;
                if (!(await this.canManageForm(req.user.id, formId))) {
                    return reply.status(403).send({ error: 'Access denied' });
                }

                const form = await this.db.get('SELECT * FROM forms WHERE id = ?', [formId]);
                if (!form) return reply.status(404).send({ error: 'Form not found' });

                const [pages, questions, vTags, vRoles, vPerms, mRoles, mPerms] = await Promise.all([
                    this.db.all('SELECT * FROM form_pages WHERE form_id = ? ORDER BY display_order ASC', [formId]),
                    this.db.all('SELECT * FROM form_questions WHERE form_id = ? ORDER BY display_order ASC', [formId]),
                    this.db.all('SELECT tag_id FROM form_visibility_tags WHERE form_id = ?', [formId]),
                    this.db.all('SELECT role_id FROM form_visibility_roles WHERE form_id = ?', [formId]),
                    this.db.all('SELECT permission_id FROM form_visibility_permissions WHERE form_id = ?', [formId]),
                    this.db.all('SELECT role_id FROM form_management_roles WHERE form_id = ?', [formId]),
                    this.db.all('SELECT permission_id FROM form_management_permissions WHERE form_id = ?', [formId])
                ]);
                
                // Parse options JSON safely
                const parsedQuestions = questions.map(q => {
                    let options = [];
                    if (q.options) {
                        try {
                            options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                        } catch (e) {
                            Logger.error(`Failed to parse options for question ${q.id}`, e);
                        }
                    }
                    return { ...q, options };
                });

                return { 
                    form: { 
                        ...form, 
                        visibility_tags: vTags.map(t => t.tag_id),
                        visibility_roles: vRoles.map(r => r.role_id),
                        visibility_permissions: vPerms.map(p => p.permission_id),
                        management_roles: mRoles.map(r => r.role_id),
                        management_permissions: mPerms.map(p => p.permission_id)
                    }, 
                    pages,
                    questions: parsedQuestions 
                };
            } catch (e: any) {
                Logger.error('Failed to fetch form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Create Form (Admin)
        this.app.post('/api/admin/forms', { preHandler: [checkAuthentication('exec.publish')] }, async (req: any, reply) => {
            const { 
                title, description, is_global, event_id, expires_at, allow_multiple_responses, pages,
                visibility_tags, visibility_roles, visibility_permissions, management_roles, management_permissions
            } = req.body;
            const userId = req.user.id;

            try {
                const res = await this.db.run('INSERT INTO forms (title, description, is_global, event_id, expires_at, allow_multiple_responses, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [title, description, is_global ? 1 : 0, event_id || null, expires_at || null, allow_multiple_responses ? 1 : 0, userId]);
                const formId = res.lastID;

                // Handle Visibility Junctions
                if (visibility_tags) {
                    for (const tagId of visibility_tags) {
                        await this.db.run('INSERT INTO form_visibility_tags (form_id, tag_id) VALUES (?, ?)', [formId, tagId]);
                    }
                }
                if (visibility_roles) {
                    for (const roleId of visibility_roles) {
                        await this.db.run('INSERT INTO form_visibility_roles (form_id, role_id) VALUES (?, ?)', [formId, roleId]);
                    }
                }
                if (visibility_permissions) {
                    for (const permId of visibility_permissions) {
                        await this.db.run('INSERT INTO form_visibility_permissions (form_id, permission_id) VALUES (?, ?)', [formId, permId]);
                    }
                }
                if (management_roles) {
                    for (const roleId of management_roles) {
                        await this.db.run('INSERT INTO form_management_roles (form_id, role_id) VALUES (?, ?)', [formId, roleId]);
                    }
                }
                if (management_permissions) {
                    for (const permId of management_permissions) {
                        await this.db.run('INSERT INTO form_management_permissions (form_id, permission_id) VALUES (?, ?)', [formId, permId]);
                    }
                }

                const questionIdMap = new Map<string, number>(); // Map clientId to database ID

                for (let pIdx = 0; pIdx < pages.length; pIdx++) {
                    const page = pages[pIdx];
                    const pRes = await this.db.run('INSERT INTO form_pages (form_id, title, description, display_order) VALUES (?, ?, ?, ?)', [formId, page.title || null, page.description || null, pIdx]);
                    const pageId = pRes.lastID;

                    for (let qIdx = 0; qIdx < page.questions.length; qIdx++) {
                        const q = page.questions[qIdx];
                        const options = q.options ? JSON.stringify(q.options) : null;
                        const qRes = await this.db.run(
                            'INSERT INTO form_questions (form_id, page_id, type, prompt, description, options, is_required, max_selections, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                            [formId, pageId, q.type, q.prompt, q.description || null, options, q.is_required ? 1 : 0, q.max_selections || 1, qIdx]
                        );
                        questionIdMap.set(q.clientId, qRes.lastID);
                    }
                }

                // Update dependencies using clientIds
                for (const page of pages) {
                    for (const q of page.questions) {
                        if (q.dependency_question_id) {
                            const targetId = questionIdMap.get(q.dependency_question_id);
                            if (targetId) {
                                await this.db.run(
                                    'UPDATE form_questions SET dependency_question_id = ?, dependency_operator = ?, dependency_value = ? WHERE id = ?',
                                    [targetId, q.dependency_operator || 'equals', q.dependency_value || null, questionIdMap.get(q.clientId)]
                                );
                            }
                        }
                    }
                }

                return { success: true, id: formId };
            } catch (e: any) {
                Logger.error('Failed to create form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Update Form (Admin)
        this.app.put('/api/admin/forms/:id', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            const { 
                title, description, is_global, event_id, expires_at, allow_multiple_responses, questions,
                visibility_tags, visibility_roles, visibility_permissions, management_roles, management_permissions
            } = req.body;
            const id = req.params.id;

            try {
                if (!(await this.canManageForm(req.user.id, id))) {
                    return reply.status(403).send({ error: 'Access denied' });
                }

                await this.db.run('UPDATE forms SET title = ?, description = ?, is_global = ?, event_id = ?, expires_at = ?, allow_multiple_responses = ? WHERE id = ?', [title, description, is_global ? 1 : 0, event_id || null, expires_at || null, allow_multiple_responses ? 1 : 0, id]);

                // Update Visibility Junctions
                await Promise.all([
                    this.db.run('DELETE FROM form_visibility_tags WHERE form_id = ?', [id]),
                    this.db.run('DELETE FROM form_visibility_roles WHERE form_id = ?', [id]),
                    this.db.run('DELETE FROM form_visibility_permissions WHERE form_id = ?', [id]),
                    this.db.run('DELETE FROM form_management_roles WHERE form_id = ?', [id]),
                    this.db.run('DELETE FROM form_management_permissions WHERE form_id = ?', [id])
                ]);

                if (visibility_tags) {
                    for (const tagId of visibility_tags) {
                        await this.db.run('INSERT INTO form_visibility_tags (form_id, tag_id) VALUES (?, ?)', [id, tagId]);
                    }
                }
                if (visibility_roles) {
                    for (const roleId of visibility_roles) {
                        await this.db.run('INSERT INTO form_visibility_roles (form_id, role_id) VALUES (?, ?)', [id, roleId]);
                    }
                }
                if (visibility_permissions) {
                    for (const permId of visibility_permissions) {
                        await this.db.run('INSERT INTO form_visibility_permissions (form_id, permission_id) VALUES (?, ?)', [id, permId]);
                    }
                }
                if (management_roles) {
                    for (const roleId of management_roles) {
                        await this.db.run('INSERT INTO form_management_roles (form_id, role_id) VALUES (?, ?)', [id, roleId]);
                    }
                }
                if (management_permissions) {
                    for (const permId of management_permissions) {
                        await this.db.run('INSERT INTO form_management_permissions (form_id, permission_id) VALUES (?, ?)', [id, permId]);
                    }
                }

                // Handle Questions (Simple replace logic: Update existing, insert new, delete removed)
                const existingQuestions = await this.db.all('SELECT id FROM form_questions WHERE form_id = ?', [id]);
                const existingIds = existingQuestions.map(q => q.id);
                const incomingIds = questions.map((q: any) => q.id).filter((id: any) => id);

                const toDelete = existingIds.filter(id => !incomingIds.includes(id));
                for (const delId of toDelete) {
                    await this.db.run('DELETE FROM form_questions WHERE id = ?', [delId]);
                }

                const questionIdMap = new Map<number, number>();

                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    const options = q.options ? JSON.stringify(q.options) : null;
                    let dbId = q.id;
                    if (q.id) {
                        await this.db.run(
                            'UPDATE form_questions SET type = ?, prompt = ?, description = ?, options = ?, is_required = ?, max_selections = ?, display_order = ?, dependency_question_id = NULL WHERE id = ?',
                            [q.type, q.prompt, q.description || null, options, q.is_required ? 1 : 0, q.max_selections || 1, i, q.id]
                        );
                    } else {
                        const qRes = await this.db.run(
                            'INSERT INTO form_questions (form_id, type, prompt, description, options, is_required, max_selections, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                            [id, q.type, q.prompt, q.description || null, options, q.is_required ? 1 : 0, q.max_selections || 1, i]
                        );
                        dbId = qRes.lastID;
                    }
                    questionIdMap.set(i, dbId);
                }

                // Update dependencies
                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i];
                    if (q.dependency_question_id !== null && q.dependency_question_id !== undefined) {
                        let targetId = q.dependency_question_id;
                        // Check if it's an index (small number not present in database IDs)
                        // This is a bit heuristic but since IDs start high and auto-increment, it works.
                        // Better check: is it within the range of question array indices?
                        if (q.dependency_question_id < questions.length && questionIdMap.has(q.dependency_question_id)) {
                            targetId = questionIdMap.get(q.dependency_question_id);
                        }

                        await this.db.run(
                            'UPDATE form_questions SET dependency_question_id = ?, dependency_operator = ?, dependency_value = ? WHERE id = ?',
                            [targetId, q.dependency_operator || 'equals', q.dependency_value || null, questionIdMap.get(i)]
                        );
                    }
                }

                return { success: true };
            } catch (e: any) {
                Logger.error('Failed to update form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Delete Form (Admin)
        this.app.delete('/api/admin/forms/:id', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            try {
                if (!(await this.canManageForm(req.user.id, req.params.id))) {
                    return reply.status(403).send({ error: 'Access denied' });
                }
                await this.db.run('DELETE FROM forms WHERE id = ?', [req.params.id]);
                return { success: true };
            } catch (e: any) {
                Logger.error('Failed to delete form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Get Form Submissions (Admin)
        this.app.get('/api/admin/forms/:id/submissions', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            try {
                const formId = req.params.id;
                if (!(await this.canManageForm(req.user.id, formId))) {
                    return reply.status(403).send({ error: 'Access denied' });
                }

                const form = await this.db.get('SELECT id FROM forms WHERE id = ?', [formId]);
                if (!form) return reply.status(404).send({ error: 'Form not found' });

                const submissions = await this.db.all(`
                    SELECT 
                        fs.id as submission_id,
                        fs.submitted_at,
                        u.id as user_id,
                        u.first_name,
                        u.last_name,
                        u.email
                    FROM form_submissions fs
                    JOIN users u ON fs.user_id = u.id
                    WHERE fs.form_id = ?
                    ORDER BY fs.submitted_at DESC
                `, [formId]);

                for (const sub of submissions) {
                    sub.answers = await this.db.all(`
                        SELECT fq.id as question_id, fq.prompt, fq.type, fa.value
                        FROM form_answers fa
                        JOIN form_questions fq ON fa.question_id = fq.id
                        WHERE fa.submission_id = ?
                        ORDER BY fq.display_order ASC
                    `, [sub.submission_id]);
                    
                    // Parse JSON values for multiselect/options
                    sub.answers.forEach((answer: any) => {
                        if (['select', 'multiselect'].includes(answer.type) && answer.value) {
                            try {
                                answer.value = JSON.parse(answer.value);
                            } catch (e) {
                                // Not JSON, keep as string
                            }
                        }
                    });
                }

                return { submissions };
            } catch (e: any) {
                Logger.error('Failed to fetch form submissions', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // --- User Routes ---

        // Get Form for Viewing/Submitting
        this.app.get('/api/forms/:id', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            try {
                const form = await this.db.get('SELECT id, title, description, is_global, event_id, expires_at, allow_multiple_responses FROM forms WHERE id = ?', [req.params.id]);
                if (!form) return reply.status(404).send({ error: 'Form not found' });

                const isClosed = form.expires_at && new Date(form.expires_at) < new Date();
                const userHasSubmitted = (await this.db.get('SELECT COUNT(id) as count FROM form_submissions WHERE form_id = ? AND user_id = ?', [form.id, req.user.id])).count > 0;

                const [pages, questions] = await Promise.all([
                    this.db.all('SELECT * FROM form_pages WHERE form_id = ? ORDER BY display_order ASC', [form.id]),
                    this.db.all('SELECT * FROM form_questions WHERE form_id = ? ORDER BY display_order ASC', [form.id])
                ]);
                
                // Parse options JSON safely
                const parsedQuestions = questions.map(q => {
                    let options = [];
                    if (q.options) {
                        try {
                            options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                        } catch (e) {
                            Logger.error(`Failed to parse options for question ${q.id}`, e);
                        }
                    }
                    return { ...q, options };
                });

                // Check if user already submitted
                const submission = await this.db.get('SELECT id FROM form_submissions WHERE form_id = ? AND user_id = ?', [form.id, req.user.id]);
                const previousAnswers = submission ? await this.db.all('SELECT question_id, value FROM form_answers WHERE submission_id = ?', [submission.id]) : [];

                return { 
                    form: { ...form, is_closed: !!isClosed, user_has_submitted: !!userHasSubmitted }, 
                    pages,
                    questions: parsedQuestions, 
                    submission, 
                    answers: previousAnswers
                };
            } catch (e: any) {
                Logger.error('Failed to fetch form', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Get all public forms (User)
        this.app.get('/api/forms', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            try {
                const userId = req.user.id;
                
                // Get all potentially relevant forms
                const allForms = await this.db.all(`
                    SELECT 
                        f.id, f.title, f.description, f.is_global, f.event_id, f.expires_at, f.allow_multiple_responses,
                        e.title as event_title, e.start as event_start,
                        (SELECT COUNT(fs.id) FROM form_submissions fs WHERE fs.form_id = f.id AND fs.user_id = ?) > 0 as user_has_submitted
                    FROM forms f
                    LEFT JOIN events e ON f.event_id = e.id
                    LEFT JOIN event_attendees ea ON f.event_id = ea.event_id AND ea.user_id = ?
                    WHERE f.is_global = 1 OR ea.user_id IS NOT NULL
                    ORDER BY f.created_at DESC
                `, [userId, userId]);

                // Filter based on junction tables (Tags, Roles, Permissions)
                const now = new Date();
                const filteredForms = [];

                for (const form of allForms) {
                    const [vTags, vRoles, vPerms] = await Promise.all([
                        this.db.all('SELECT tag_id FROM form_visibility_tags WHERE form_id = ?', [form.id]),
                        this.db.all('SELECT role_id FROM form_visibility_roles WHERE form_id = ?', [form.id]),
                        this.db.all('SELECT permission_id FROM form_visibility_permissions WHERE form_id = ?', [form.id])
                    ]);

                    let isVisible = true;

                    if (vTags.length > 0) {
                        const userTagIds = (await this.db.all('SELECT tag_id FROM tag_whitelists WHERE user_id = ?', [userId])).map(t => t.tag_id);
                        if (!vTags.some(vt => userTagIds.includes(vt.tag_id))) isVisible = false;
                    }

                    if (isVisible && vRoles.length > 0) {
                        const userRoleIds = (await this.db.all('SELECT role_id FROM user_roles WHERE user_id = ?', [userId])).map(r => r.role_id);
                        if (!vRoles.some(vr => userRoleIds.includes(vr.role_id))) isVisible = false;
                    }

                    if (isVisible && vPerms.length > 0) {
                        const userPermIds = (await this.db.all('SELECT permission_id FROM user_permissions WHERE user_id = ? UNION SELECT permission_id FROM role_permissions rp JOIN user_roles ur ON rp.role_id = ur.role_id WHERE ur.user_id = ?', [userId, userId])).map(p => p.permission_id);
                        if (!vPerms.some(vp => userPermIds.includes(vp.permission_id))) isVisible = false;
                    }

                    if (isVisible) {
                        filteredForms.push({
                            ...form,
                            is_closed: form.expires_at && new Date(form.expires_at) < now,
                            user_has_submitted: form.user_has_submitted === 1
                        });
                    }
                }

                return { forms: filteredForms };
            } catch (e: any) {
                Logger.error('Failed to fetch user forms', e);
                return reply.status(500).send({ error: e.message });
            }
        });

        // Submit Form Response
        this.app.post('/api/forms/:id/submit', { preHandler: [checkAuthentication()] }, async (req: any, reply) => {
            const formId = req.params.id;
            const userId = req.user.id;
            const { answers } = req.body; // { question_id: value }

            try {
                // Check if form is closed
                const form = await this.db.get('SELECT expires_at, allow_multiple_responses FROM forms WHERE id = ?', [formId]);
                if (!form) return reply.status(404).send({ error: 'Form not found.' });

                if (form.expires_at && new Date(form.expires_at) < new Date()) {
                    return reply.status(403).send({ error: 'This form is now closed for submissions.' });
                }

                // Check if user has already submitted and if multiple responses are allowed
                const existingSubmissionCount = (await this.db.get('SELECT COUNT(id) as count FROM form_submissions WHERE form_id = ? AND user_id = ?', [formId, userId])).count;
                if (existingSubmissionCount > 0 && form.allow_multiple_responses === 0) {
                    return reply.status(403).send({ error: 'This form does not allow multiple submissions, and you have already submitted.' });
                }
                
                let submissionId;
                if (existingSubmissionCount > 0 && form.allow_multiple_responses === 1) {
                    // Update existing for multiple allowed submissions (delete old answers and re-insert)
                    submissionId = (await this.db.get('SELECT id FROM form_submissions WHERE form_id = ? AND user_id = ? ORDER BY submitted_at DESC LIMIT 1', [formId, userId])).id;
                    await this.db.run('DELETE FROM form_answers WHERE submission_id = ?', [submissionId]);
                    await this.db.run('UPDATE form_submissions SET submitted_at = NOW() WHERE id = ?', [submissionId]);
                } else if (existingSubmissionCount === 0) {
                    // New submission
                    const res = await this.db.run('INSERT INTO form_submissions (form_id, user_id) VALUES (?, ?)', [formId, userId]);
                    submissionId = res.lastID;
                } else {
                    // This case should ideally not be reached if the above logic is sound.
                    return reply.status(500).send({ error: 'Unexpected submission state.' });
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
