// tests/db/execDB.test.js

import TestWorld from '../utils/TestWorld.js';
import ExecDB from '../../server/db/execDB.js';
import RolesDB from '../../server/db/rolesDB.js';

describe('db/execDB', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        // Setup permissions and roles for exec management
        await world.createPermission('exec.publish');
        await world.createRole('President', ['exec.publish']);
        await world.createRole('Secretary', ['exec.publish']);
        await world.createRole('Treasurer', ['exec.publish']);
        await world.createRole('OldRole', ['exec.publish']);
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('addExecMember correctly adds an exec member with social links', async () => {
        const userId = await world.createUser('user1', { first_name: 'John', last_name: 'Doe' });
        const res = await ExecDB.addExecMember(world.db, {
            userId: userId,
            roleName: 'President',
            displayOrder: 1,
            termStart: '2023-01-01',
            instagramLink: 'https://instagram.com/john_d',
            linkedinLink: 'https://linkedin.com/in/john-doe'
        });
        expect(res.isSuccess()).toBe(true);
        const execMember = await world.db.get('SELECT * FROM exec_committee WHERE id = ?', [res.getData().id]);
        expect(execMember.user_id).toBe(userId);
        expect(execMember.role_name).toBe('President');
        expect(execMember.instagram_link).toBe('https://instagram.com/john_d');
        expect(execMember.linkedin_link).toBe('https://linkedin.com/in/john-doe');
    });

    test('updateExecMember correctly updates exec member details including social links', async () => {
        const userId = await world.createUser('user2', { first_name: 'Jane', last_name: 'Doe' });
        const addRes = await ExecDB.addExecMember(world.db, {
            userId: userId,
            roleName: 'Secretary',
            termStart: '2023-01-01'
        });
        const execId = addRes.getData().id;

        const updateRes = await ExecDB.updateExecMember(world.db, execId, {
            emailOverride: 'jane.doe@example.com',
            instagramLink: 'https://instagram.com/jane_d',
            linkedinLink: 'https://linkedin.com/in/jane-doe'
        });
        expect(updateRes.isSuccess()).toBe(true);

        const execMember = await world.db.get('SELECT * FROM exec_committee WHERE id = ?', [execId]);
        expect(execMember.email_override).toBe('jane.doe@example.com');
        expect(execMember.instagram_link).toBe('https://instagram.com/jane_d');
        expect(execMember.linkedin_link).toBe('https://linkedin.com/in/jane-doe');
    });

    test('getCurrentExec returns current members with social links', async () => {
        const userId = await world.createUser('user3', { first_name: 'Alice', last_name: 'Smith' });
        await ExecDB.addExecMember(world.db, {
            userId: userId,
            roleName: 'Treasurer',
            isCurrent: 1,
            instagramLink: 'https://instagram.com/alice_s',
            linkedinLink: 'https://linkedin.com/in/alice-smith'
        });

        const res = await ExecDB.getCurrentExec(world.db);
        expect(res.isSuccess()).toBe(true);
        const currentExec = res.getData();
        expect(currentExec.length).toBe(1);
        expect(currentExec[0].first_name).toBe('Alice');
        expect(currentExec[0].instagram_link).toBe('https://instagram.com/alice_s');
        expect(currentExec[0].linkedin_link).toBe('https://linkedin.com/in/alice-smith');
    });

    test('getPastExec returns past members with social links', async () => {
        const userId = await world.createUser('user4', { first_name: 'Bob', last_name: 'Johnson' });
        await ExecDB.addExecMember(world.db, {
            userId: userId,
            roleName: 'OldRole',
            isCurrent: 0,
            termEnd: '2022-12-31',
            instagramLink: 'https://instagram.com/bob_j',
            linkedinLink: 'https://linkedin.com/in/bob-johnson'
        });

        const res = await ExecDB.getPastExec(world.db);
        expect(res.isSuccess()).toBe(true);
        const pastExec = res.getData();
        expect(pastExec.length).toBe(1);
        expect(pastExec[0].first_name).toBe('Bob');
        expect(pastExec[0].instagram_link).toBe('https://instagram.com/bob_j');
        expect(pastExec[0].linkedin_link).toBe('https://linkedin.com/in/bob-johnson');
    });

    test('syncExecMember preserves social links when user loses exec role', async () => {
        const userId = await world.createUser('user5', { first_name: 'Charlie', last_name: 'Brown' });
        await RolesDB.assignRole(world.db, userId, world.data.roles['President']); // Assign role to sync

        // Manually add exec entry with social links
        const addRes = await ExecDB.addExecMember(world.db, {
            userId: userId,
            roleName: 'President',
            isCurrent: 1,
            termStart: '2023-01-01',
            instagramLink: 'https://instagram.com/charlie_b',
            linkedinLink: 'https://linkedin.com/in/charlie-brown'
        });
        const execId = addRes.getData().id;

        // Remove the role, triggering syncExecMember to archive
        await RolesDB.removeRole(world.db, userId, world.data.roles['President']);
        await ExecDB.syncExecMember(world.db, userId);

        const archivedExec = await world.db.get('SELECT * FROM exec_committee WHERE id = ?', [execId]);
        expect(archivedExec.is_current).toBe(0);
        expect(archivedExec.instagram_link).toBe('https://instagram.com/charlie_b');
        expect(archivedExec.linkedin_link).toBe('https://linkedin.com/in/charlie-brown');
    });

    test('archiveCurrentCommittee preserves social links for all archived members', async () => {
        const user1Id = await world.createUser('user6', { first_name: 'David', last_name: 'Green' });
        await ExecDB.addExecMember(world.db, {
            userId: user1Id,
            roleName: 'President',
            isCurrent: 1,
            instagramLink: 'https://instagram.com/david_g',
            linkedinLink: 'https://linkedin.com/in/david-g'
        });

        const user2Id = await world.createUser('user7', { first_name: 'Eve', last_name: 'White' });
        await ExecDB.addExecMember(world.db, {
            userId: user2Id,
            roleName: 'Secretary',
            isCurrent: 1,
            instagramLink: 'https://instagram.com/eve_w',
            linkedinLink: 'https://linkedin.com/in/eve-w'
        });

        await ExecDB.archiveCurrentCommittee(world.db);

        const archivedPres = await world.db.get('SELECT * FROM exec_committee WHERE user_id = ?', [user1Id]);
        expect(archivedPres.is_current).toBe(0);
        expect(archivedPres.instagram_link).toBe('https://instagram.com/david_g');
        expect(archivedPres.linkedin_link).toBe('https://linkedin.com/in/david-g');

        const archivedSec = await world.db.get('SELECT * FROM exec_committee WHERE user_id = ?', [user2Id]);
        expect(archivedSec.is_current).toBe(0);
        expect(archivedSec.instagram_link).toBe('https://instagram.com/eve_w');
        expect(archivedSec.linkedin_link).toBe('https://linkedin.com/in/eve-w');
    });
});
