// tests/api/ExecAPI.test.js

import TestWorld from '../utils/TestWorld.js';
import ExecAPI from '../../server/api/ExecAPI.js';
import ExecDB from '../../server/db/execDB.js';
import { Permissions } from '../../server/misc/permissions.js'; // Needed for checking permissions

describe('api/ExecAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createPermission('exec.manage');
        await world.createPermission('exec.publish'); // For the PUT /api/exec/me endpoint check

        await world.createRole('President', ['exec.manage', 'exec.publish']);
        await world.createRole('Secretary', ['exec.publish']);
        await world.createRole('NormalUserRole', []); // A role without exec permissions

        await world.createUser('admin', {}, ['President']); // Admin is also an Exec
        await world.createUser('exec_member', {}, ['Secretary']);
        await world.createUser('normal_user', {}, ['NormalUserRole']);

        new ExecAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/exec', () => {
        test('should return current and past exec members including social links', async () => {
            const adminId = world.data.users['admin'];
            const execMemberId = world.data.users['exec_member'];
            
            // Add exec members with social links
            await ExecDB.addExecMember(world.db, {
                userId: adminId,
                roleName: 'President',
                isCurrent: 1,
                instagramLink: 'https://instagram.com/admin_pres',
                linkedinLink: 'https://linkedin.com/in/admin-pres'
            });
            await ExecDB.addExecMember(world.db, {
                userId: execMemberId,
                roleName: 'Secretary',
                isCurrent: 1,
                instagramLink: 'https://instagram.com/jane_sec',
                linkedinLink: 'https://linkedin.com/in/jane-sec'
            });

            // Archive one to be a past member
            const pastExecId = await world.createUser('past_exec', { first_name: 'Past', last_name: 'Member' });
            await ExecDB.addExecMember(world.db, {
                userId: pastExecId,
                roleName: 'PastRole',
                isCurrent: 0,
                termEnd: '2022-01-01',
                instagramLink: 'https://instagram.com/past_member',
                linkedinLink: 'https://linkedin.com/in/past-member'
            });

            const res = await world.as('admin').get('/api/exec'); // Admin has access
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);

            expect(body.current.length).toBe(2);
            expect(body.past.length).toBe(1);

            const president = body.current.find(m => m.user_id === adminId);
            expect(president.role_name).toBe('President');
            expect(president.instagram_link).toBe('https://instagram.com/admin_pres');
            expect(president.linkedin_link).toBe('https://linkedin.com/in/admin-pres');

            const secretary = body.current.find(m => m.user_id === execMemberId);
            expect(secretary.role_name).toBe('Secretary');
            expect(secretary.instagram_link).toBe('https://instagram.com/jane_sec');
            expect(secretary.linkedin_link).toBe('https://linkedin.com/in/jane-sec');

            const pastMember = body.past.find(m => m.user_id === pastExecId);
            expect(pastMember.instagram_link).toBe('https://instagram.com/past_member');
            expect(pastMember.linkedin_link).toBe('https://linkedin.com/in/past-member');
        });
    });

    describe('PUT /api/exec/me', () => {
        test('authenticated exec member can update their own exec details including social links', async () => {
            const execMemberId = world.data.users['exec_member'];
            await ExecDB.addExecMember(world.db, {
                userId: execMemberId,
                roleName: 'Secretary',
                isCurrent: 1,
                firstNameOverride: 'Original',
                instagramLink: 'https://instagram.com/original'
            });

            const newFirstName = 'Updated';
            const newInstagram = 'https://instagram.com/updated';
            const newLinkedIn = 'https://linkedin.com/in/updated';

            const res = await world.as('exec_member').put('/api/exec/me', {
                firstNameOverride: newFirstName,
                instagramLink: newInstagram,
                linkedinLink: newLinkedIn
            });
            expect(res.statusCode).toBe(200);

            const updatedExec = await world.db.get('SELECT * FROM exec_committee WHERE user_id = ? AND is_current = 1', [execMemberId]);
            expect(updatedExec.first_name_override).toBe(newFirstName);
            expect(updatedExec.instagram_link).toBe(newInstagram);
            expect(updatedExec.linkedin_link).toBe(newLinkedIn);
        });

        test('authenticated exec member cannot update another exec member\'s details via /me endpoint', async () => {
            const adminId = world.data.users['admin'];
            const execMemberId = world.data.users['exec_member'];
            
            await ExecDB.addExecMember(world.db, {
                userId: adminId,
                roleName: 'President',
                isCurrent: 1
            });
            await ExecDB.addExecMember(world.db, {
                userId: execMemberId,
                roleName: 'Secretary',
                isCurrent: 1
            });

            const res = await world.as('exec_member').put('/api/exec/me', {
                // Try to update admin's details indirectly
                // This payload would typically be ignored by the API's filtering
                // but we ensure the auth check prevents cross-user modification
                user_id: adminId, // Should not matter, as /me uses current user's ID
                firstNameOverride: 'Attacker Attempt' 
            });
            expect(res.statusCode).toBe(200); // API should still return 200 if no exec entry found for requester or no allowed fields
                                              // We need to assert that *admin's* details were NOT changed
            
            const adminExec = await world.db.get('SELECT first_name_override FROM exec_committee WHERE user_id = ? AND is_current = 1', [adminId]);
            expect(adminExec.first_name_override).toBeNull(); // Should remain null if not updated
        });

        test('non-exec member cannot use /api/exec/me endpoint', async () => {
            const normalUserId = world.data.users['normal_user'];
            
            const res = await world.as('normal_user').put('/api/exec/me', {
                firstNameOverride: 'Should Not Work'
            });
            expect(res.statusCode).toBe(403); // is_exec permission is required
        });

        test('unauthenticated user cannot use /api/exec/me endpoint', async () => {
            const res = await world.as('unauthenticated').put('/api/exec/me', {
                firstNameOverride: 'Should Not Work'
            });
            expect(res.statusCode).toBe(401); // Authentication is required
        });
    });

    // Existing ExecAPI Admin tests (PUT /api/exec/:id, POST /api/exec, DELETE /api/exec/:id)
    // These generally don't need explicit modification beyond verifying they work with new fields
    // assuming body parsing handles extra fields gracefully.
    describe('Admin Exec Management (/api/exec/:id)', () => {
        test('admin can update any exec member including social links', async () => {
            const execMemberId = world.data.users['exec_member'];
            const addRes = await ExecDB.addExecMember(world.db, {
                userId: execMemberId,
                roleName: 'Secretary',
                isCurrent: 1
            });
            const execId = addRes.getData().id;

            const newLinkedIn = 'https://linkedin.com/in/updated_admin_exec';
            const res = await world.as('admin').put(`/api/exec/${execId}`, {
                linkedinLink: newLinkedIn
            });
            expect(res.statusCode).toBe(200);

            const updatedExec = await world.db.get('SELECT linkedin_link FROM exec_committee WHERE id = ?', [execId]);
            expect(updatedExec.linkedin_link).toBe(newLinkedIn);
        });

        test('admin can add a new exec member with social links', async () => {
            const newUserId = await world.createUser('new_exec', { first_name: 'New', last_name: 'Exec' });
            const res = await world.as('admin').post('/api/exec', {
                userId: newUserId,
                roleName: 'Treasurer',
                isCurrent: 1,
                instagramLink: 'https://instagram.com/new_exec',
            });
            expect(res.statusCode).toBe(201);
            const body = JSON.parse(res.body);
            expect(body.data.id).toBeDefined();

            const newExec = await world.db.get('SELECT instagram_link FROM exec_committee WHERE id = ?', [body.data.id]);
            expect(newExec.instagram_link).toBe('https://instagram.com/new_exec');
        });
    });
});
