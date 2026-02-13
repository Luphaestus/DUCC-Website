// tests/api/FormsAPI.test.js

import TestWorld from '../utils/TestWorld.js';
import FormsAPI from '../../server/api/FormsAPI.js';
import { Permissions } from '../../server/misc/permissions.js';

describe('api/FormsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createRole('Admin', ['form.manage']);
        await world.createRole('Member', []);
        await world.createUser('admin', {}, ['Admin']);
        await world.createUser('member', {}, ['Member']);

        new FormsAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('Admin Forms Management', () => {
        test('POST /api/admin/forms should create a new form with allow_multiple_responses', async () => {
            const formPayload = {
                title: 'Test Form',
                description: 'A form for testing.',
                is_global: true,
                expires_at: '2099-12-31T23:59:59Z',
                allow_multiple_responses: true,
                questions: [
                    { type: 'text', prompt: 'Your Name?', is_required: true, options: [] }
                ]
            };

            const res = await world.as('admin').post('/api/admin/forms', formPayload);
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.id).toBeDefined();

            const form = await world.db.get('SELECT * FROM forms WHERE id = ?', [body.id]);
            expect(form.title).toBe('Test Form');
            expect(form.allow_multiple_responses).toBe(1);
        });

        test('PUT /api/admin/forms/:id should update a form including allow_multiple_responses', async () => {
            // Create a form first
            const createRes = await world.as('admin').post('/api/admin/forms', {
                title: 'Original Form',
                description: 'Original description.',
                is_global: true,
                allow_multiple_responses: false,
                questions: []
            });
            const formId = JSON.parse(createRes.body).id;

            const updatePayload = {
                title: 'Updated Form',
                description: 'Updated description.',
                is_global: false,
                expires_at: '2024-12-31T23:59:59Z',
                allow_multiple_responses: true,
                questions: []
            };

            const res = await world.as('admin').put(`/api/admin/forms/${formId}`, updatePayload);
            expect(res.statusCode).toBe(200);

            const updatedForm = await world.db.get('SELECT * FROM forms WHERE id = ?', [formId]);
            expect(updatedForm.title).toBe('Updated Form');
            expect(updatedForm.is_global).toBe(0);
            expect(updatedForm.allow_multiple_responses).toBe(1);
        });
    });

    describe('User Forms Listing and Detail', () => {
        let singleResponseFormId;
        let multipleResponseFormId;
        let memberUserId;

        beforeEach(async () => {
            memberUserId = world.data.users['member'];

            // Create a form that allows only single response
            const res1 = await world.as('admin').post('/api/admin/forms', {
                title: 'Single Response Form',
                is_global: true,
                allow_multiple_responses: false,
                questions: []
            });
            singleResponseFormId = JSON.parse(res1.body).id;

            // Create a form that allows multiple responses
            const res2 = await world.as('admin').post('/api/admin/forms', {
                title: 'Multiple Response Form',
                is_global: true,
                allow_multiple_responses: true,
                questions: []
            });
            multipleResponseFormId = JSON.parse(res2.body).id;
        });

        test('GET /api/forms should correctly return allow_multiple_responses and user_has_submitted', async () => {
            // Member has not submitted any form yet
            let res = await world.as('member').get('/api/forms');
            expect(res.statusCode).toBe(200);
            let forms = JSON.parse(res.body).forms;

            let singleForm = forms.find(f => f.id === singleResponseFormId);
            expect(singleForm.allow_multiple_responses).toBe(0); // DB stores as 0/1
            expect(singleForm.user_has_submitted).toBe(false);

            let multipleForm = forms.find(f => f.id === multipleResponseFormId);
            expect(multipleForm.allow_multiple_responses).toBe(1); // DB stores as 0/1
            expect(multipleForm.user_has_submitted).toBe(false);

            // Member submits to single response form
            await world.db.run('INSERT INTO form_submissions (form_id, user_id) VALUES (?, ?)', [singleResponseFormId, memberUserId]);

            // Now, fetch again and check user_has_submitted
            res = await world.as('member').get('/api/forms');
            expect(res.statusCode).toBe(200);
            forms = JSON.parse(res.body).forms;

            singleForm = forms.find(f => f.id === singleResponseFormId);
            expect(singleForm.user_has_submitted).toBe(true);

            multipleForm = forms.find(f => f.id === multipleResponseFormId);
            expect(multipleForm.user_has_submitted).toBe(false); // Still false for this form
        });

        test('GET /api/forms/:id should correctly return allow_multiple_responses and user_has_submitted', async () => {
            // Member has not submitted yet
            let res = await world.as('member').get(`/api/forms/${singleResponseFormId}`);
            expect(res.statusCode).toBe(200);
            let form = JSON.parse(res.body).form;
            expect(form.allow_multiple_responses).toBe(0);
            expect(form.user_has_submitted).toBe(false);

            // Member submits
            await world.db.run('INSERT INTO form_submissions (form_id, user_id) VALUES (?, ?)', [singleResponseFormId, memberUserId]);

            // Fetch again and check user_has_submitted
            res = await world.as('member').get(`/api/forms/${singleResponseFormId}`);
            expect(res.statusCode).toBe(200);
            form = JSON.parse(res.body).form;
            expect(form.user_has_submitted).toBe(true);
        });

        test('POST /api/forms/:id/submit should reject submission if form does not allow multiple and user has submitted', async () => {
            // Member submits to single response form
            await world.db.run('INSERT INTO form_submissions (form_id, user_id) VALUES (?, ?)', [singleResponseFormId, memberUserId]);

            // Attempt to submit again
            const res = await world.as('member').post(`/api/forms/${singleResponseFormId}/submit`, { answers: {} });
            expect(res.statusCode).toBe(403);
            const body = JSON.parse(res.body);
            expect(body.error).toBe('This form does not allow multiple submissions, and you have already submitted.');
        });

        test('POST /api/forms/:id/submit should allow submission if form allows multiple responses', async () => {
            // Member submits to multiple response form
            await world.db.run('INSERT INTO form_submissions (form_id, user_id) VALUES (?, ?)', [multipleResponseFormId, memberUserId]);

            // Attempt to submit again
            const res = await world.as('member').post(`/api/forms/${multipleResponseFormId}/submit`, { answers: {} });
            expect(res.statusCode).toBe(200); // Should succeed
        });
    });
});
