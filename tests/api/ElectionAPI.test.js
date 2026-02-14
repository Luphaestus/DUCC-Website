// tests/api/ElectionAPI.test.js

import TestWorld from '../utils/TestWorld.js';
import ElectionAPI from '../../server/api/ElectionAPI.js';
import ElectionDB from '../../server/db/electionDB.js';
import RolesDB from '../../server/db/rolesDB.js';
import FileAPI from '../../server/api/FilesAPI.js'; // Needed for manifesto file upload
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('api/ElectionAPI', () => {
    let world;
    let adminId;
    let memberId;
    let presidentRoleId;
    let normalRoleId;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createPermission('election.manage');
        await world.createPermission('is_member'); // For user voting/nomination
        await world.createPermission('exec.publish'); // For role transfer side effects
        await world.createPermission('file.write'); // For manifesto upload

        presidentRoleId = await world.createRole('President', ['election.manage', 'exec.publish', 'file.write']);
        normalRoleId = await world.createRole('Treasurer', ['exec.publish']);
        const memberRoleId = await world.createRole('Member', ['is_member', 'file.write']);

        adminId = await world.createUser('admin', {}, ['President']);
        memberId = await world.createUser('member', {}, ['Member']);
        await world.createUser('non_member', {});

        new ElectionAPI(world.app, world.db).registerRoutes();
        // Also register FilesAPI for manifesto uploads
        new FileAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('Admin Election Management (President Only)', () => {
        let electionId;
        let electionRoleId;

        test('POST /api/admin/elections creates a new election', async () => {
            const payload = {
                title: 'Spring Election',
                description: 'Election for new exec roles.',
                start_date: '2024-03-01T00:00:00Z',
                voting_start_date: '2024-03-15T00:00:00Z',
                end_date: '2024-03-20T23:59:59Z',
                phase: 'setup'
            };
            const res = await world.as('admin').post('/api/admin/elections', payload);
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.id).toBeDefined();
            electionId = body.id;

            const election = await ElectionDB.getElectionById(world.db, electionId);
            expect(election.isSuccess()).toBe(true);
            expect(election.getData().title).toBe('Spring Election');
            expect(election.getData().managed_by_user_id).toBe(adminId);
        });

        test('PUT /api/admin/elections/:id updates an election', async () => {
            const createRes = await world.as('admin').post('/api/admin/elections', {
                title: 'Old Title', start_date: '2024-01-01T00:00:00Z', end_date: '2024-01-05T23:59:59Z', phase: 'setup'
            });
            const id = JSON.parse(createRes.body).id;

            const updatePayload = {
                title: 'New Title',
                phase: 'nominations'
            };
            const res = await world.as('admin').put(`/api/admin/elections/${id}`, updatePayload);
            expect(res.statusCode).toBe(200);

            const election = await ElectionDB.getElectionById(world.db, id);
            expect(election.isSuccess()).toBe(true);
            expect(election.getData().title).toBe('New Title');
            expect(election.getData().phase).toBe('nominations');
        });

        test('DELETE /api/admin/elections/:id deletes an election', async () => {
            const createRes = await world.as('admin').post('/api/admin/elections', {
                title: 'To Be Deleted', start_date: '2024-01-01T00:00:00Z', end_date: '2024-01-05T23:59:59Z', phase: 'setup'
            });
            const id = JSON.parse(createRes.body).id;

            const res = await world.as('admin').delete(`/api/admin/elections/${id}`);
            expect(res.statusCode).toBe(200);

            const election = await ElectionDB.getElectionById(world.db, id);
            expect(election.isError()).toBe(true); // Should not be found
            expect(election.message).toBe('Election not found.');
        });

        test('POST /api/admin/elections/:electionId/roles adds roles to an election', async () => {
            const createRes = await world.as('admin').post('/api/admin/elections', {
                title: 'Election with Roles', start_date: '2024-01-01T00:00:00Z', end_date: '2024-01-05T23:59:59Z', phase: 'setup'
            });
            electionId = JSON.parse(createRes.body).id;

            const res = await world.as('admin').post(`/api/admin/elections/${electionId}/roles`, {
                role_id: normalRoleId, max_winners: 1
            });
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            electionRoleId = body.id;

            const roles = await ElectionDB.getElectionRoles(world.db, electionId);
            expect(roles.isSuccess()).toBe(true);
            expect(roles.getData().length).toBe(1);
            expect(roles.getData()[0].role_id).toBe(normalRoleId);
        });

        test('PUT /api/admin/nominations/:nominationId/approve approves a nomination', async () => {
            const createElecRes = await world.as('admin').post('/api/admin/elections', {
                title: 'Nomination Election', start_date: '2024-03-01T00:00:00Z', voting_start_date: '2024-03-02T00:00:00Z', end_date: '2024-03-03T23:59:59Z', phase: 'nominations'
            });
            electionId = JSON.parse(createElecRes.body).id;
            const addRoleRes = await world.as('admin').post(`/api/admin/elections/${electionId}/roles`, { role_id: normalRoleId, max_winners: 1 });
            electionRoleId = JSON.parse(addRoleRes.body).id;

            // User nominates
            const manifestoFileId = await world.createFile('Manifesto for Treasurer', {
                author: 'member',
                filename: 'manifesto.pdf',
                visibility: 'public'
            });

            const nominateRes = await world.as('member').post(`/api/elections/${electionId}/nominate`, { election_role_id: electionRoleId, manifesto_file_id: manifestoFileId });
            expect(nominateRes.statusCode).toBe(201);
            const nominationId = JSON.parse(nominateRes.body).id;

            // Admin approves nomination
            const approveRes = await world.as('admin').put(`/api/admin/nominations/${nominationId}/approve`, {});
            expect(approveRes.statusCode).toBe(200);

            const nomination = await world.db.get('SELECT is_approved, approved_by_user_id FROM nominations WHERE id = ?', [nominationId]);
            expect(nomination.is_approved).toBe(1);
            expect(nomination.approved_by_user_id).toBe(adminId);
        });
        
        test('POST /api/admin/elections/:id/transfer-roles transfers roles', async () => {
            // Setup an election, nominations, and votes
            const createElecRes = await world.as('admin').post('/api/admin/elections', {
                title: 'Transfer Election', start_date: '2024-01-01T00:00:00Z', voting_start_date: '2024-01-02T00:00:00Z', end_date: '2024-01-03T23:59:59Z', phase: 'closed' // Must be closed to transfer
            });
            electionId = JSON.parse(createElecRes.body).id;
            const addRoleRes = await world.as('admin').post(`/api/admin/elections/${electionId}/roles`, { role_id: normalRoleId, max_winners: 1 });
            electionRoleId = JSON.parse(addRoleRes.body).id;

            const nomineeId = await world.createUser('nominee', { first_name: 'Vote', last_name: 'Me' });
            const nomRes = await ElectionDB.createNomination(world.db, { election_role_id: electionRoleId, user_id: nomineeId });
            const nominationId = nomRes.getData().id;
            await ElectionDB.approveNomination(world.db, nominationId, adminId);
            await ElectionDB.recordVote(world.db, { election_role_id: electionRoleId, nomination_id: nominationId, voter_user_id: memberId });
            
            // Calculate results first!
            await ElectionDB.calculateResults(world.db, electionId);

            // Set phase to results_revealed, as transfer can only happen then
            await ElectionDB.updateElection(world.db, electionId, { phase: 'results_revealed' });

            // Perform transfer
            const res = await world.as('admin').post(`/api/admin/elections/${electionId}/transfer-roles`);
            expect(res.statusCode).toBe(200);

            // Verify nominee now has the role
            const userRoles = await RolesDB.getUserRoles(world.db, nomineeId);
            expect(userRoles.isSuccess()).toBe(true);
            expect(userRoles.getData().some(r => r.id === normalRoleId)).toBe(true);
        });
    });

    describe('User Election Participation', () => {
        let electionId;
        let presidentElectionRoleId;
        let treasurerElectionRoleId;

        beforeEach(async () => {
            const createElecRes = await world.as('admin').post('/api/admin/elections', {
                title: 'User Election',
                description: 'Election for users.',
                start_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                voting_start_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
                end_date: new Date(Date.now() + 2 * 86400000).toISOString(), // Day after tomorrow
                phase: 'nominations'
            });
            electionId = JSON.parse(createElecRes.body).id;
            
            const presRoleRes = await world.as('admin').post(`/api/admin/elections/${electionId}/roles`, { role_id: presidentRoleId, max_winners: 1 });
            presidentElectionRoleId = JSON.parse(presRoleRes.body).id;
            const treasRoleRes = await world.as('admin').post(`/api/admin/elections/${electionId}/roles`, { role_id: normalRoleId, max_winners: 1 });
            treasurerElectionRoleId = JSON.parse(treasRoleRes.body).id;
        });

        test('GET /api/elections/current returns active election for member', async () => {
            const res = await world.as('member').get('/api/elections/current');
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.data.election.id).toBe(electionId);
            expect(body.data.election.phase).toBe('nominations');
            expect(body.data.roles.length).toBe(2);
        });

        test('POST /api/elections/:electionId/nominate allows member to nominate for a role', async () => {
            const manifestoFileId = await world.createFile('Member Manifesto', {
                author: 'member',
                filename: 'manifesto_member.pdf',
                visibility: 'public'
            });

            const res = await world.as('member').post(`/api/elections/${electionId}/nominate`, {
                election_role_id: treasurerElectionRoleId,
                manifesto_file_id: manifestoFileId
            });
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.id).toBeDefined();

            // Verify nomination in DB
            const nomination = await world.db.get('SELECT * FROM nominations WHERE id = ?', [body.id]);
            expect(nomination).toBeDefined();
            expect(nomination.election_role_id).toBe(treasurerElectionRoleId);
        });

        test('POST /api/elections/:electionId/vote allows member to vote for a nominee', async () => {
            // Setup: Nominee, approved, election phase is voting
            const nomineeId = await world.createUser('nominee_vote', { first_name: 'Candidate' });
            const nomRes = await ElectionDB.createNomination(world.db, { election_role_id: treasurerElectionRoleId, user_id: nomineeId });
            const nominationId = nomRes.getData().id;
            await ElectionDB.approveNomination(world.db, nominationId, adminId);
            
            await ElectionDB.updateElection(world.db, electionId, { phase: 'voting', voting_start_date: new Date().toISOString() });

            const res = await world.as('member').post(`/api/elections/${electionId}/vote`, {
                votes: [{ election_role_id: treasurerElectionRoleId, nomination_id: nominationId }]
            });
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.success).toBe(true);

            const vote = await world.db.get('SELECT * FROM votes WHERE voter_user_id = ? AND nomination_id = ?', [memberId, nominationId]);
            expect(vote).toBeDefined();
        });
    });
});
