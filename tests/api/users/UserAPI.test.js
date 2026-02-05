/**
 * UserAPI.test.js
 * 
 * User profile tests.
 */

import TestWorld from '../../utils/TestWorld.js';
import UserAPI from '../../../server/api/users/UserAPI.js';
import bcrypt from 'bcrypt';

describe('api/users/UserAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        await world.createUser('user', { 
            first_name: 'John', 
            last_name: 'Doe',
            email: 'john.doe@durham.ac.uk',
            is_member: 0,
            free_sessions: 3,
            filled_legal_info: 0
        });

        new UserAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/user/elements/:elements (Self-Lookup)', () => {
        test('Success: fetching allowed, whitelisted fields', async () => {
            const res = await world.as('user').get('/api/user/elements/first_name,email,is_member');
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body)).toEqual({
                first_name: 'John',
                email: 'john.doe@durham.ac.uk',
                is_member: 0
            });
        });

        /** Test forbidden field fetch. */
        test('Denied: attempting to fetch forbidden fields (hashed_password)', async () => {
            const res = await world.as('user').get('/api/user/elements/hashed_password');
            expect(res.statusCode).toBe(403);
            expect(JSON.parse(res.body).message).toMatch(/Forbidden element/i);
        });

        test('Denied: fail-fast if ANY requested field is forbidden', async () => {
            const res = await world.as('user').get('/api/user/elements/first_name,hashed_password');
            expect(res.statusCode).toBe(403);
        });
    });

    describe('POST /api/user/elements (Profile Updates)', () => {
        test('Success: updating basic profile fields', async () => {
            const res = await world.as('user').post('/api/user/elements', {
                first_name: 'Johnny',
                phone_number: '+44 7123 456789'
            });
            expect(res.statusCode).toBe(200);
            
            const user = await world.db.get('SELECT first_name, phone_number FROM users WHERE first_name = "Johnny"');
            expect(user.first_name).toBe('Johnny');
            expect(user.phone_number).toBe('+44 7123 456789');
        });

        test('Blocked: validation fail for non-Durham email', async () => {
            const res = await world.as('user').post('/api/user/elements', {
                email: 'not.durham@gmail.com'
            });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).errors).toHaveProperty('email');
        });

        /** Test legal info completion. */
        test('Logic: correctly flags filled_legal_info when all required fields are set', async () => {
            const dob = new Date(); dob.setFullYear(dob.getFullYear() - 20);
            const legalData = {
                date_of_birth: dob.toISOString().split('T')[0],
                college_id: 1,
                emergency_contact_name: 'Jane Doe',
                emergency_contact_phone: '+44 7987 654321',
                home_address: '123 Test St',
                phone_number: '+44 7123 456789',
                has_medical_conditions: false,
                takes_medication: false,
                agrees_to_fitness_statement: true,
                agrees_to_club_rules: true,
                agrees_to_pay_debts: true,
                agrees_to_data_storage: true,
                agrees_to_keep_health_data: true
            };

            const res = await world.as('user').post('/api/user/elements', legalData);
            expect(res.statusCode).toBe(200);

            // Verification: flag is now 1
            const user = await world.db.get('SELECT filled_legal_info FROM users WHERE id = ?', [world.data.users['user']]);
            expect(user.filled_legal_info).toBe(1);
        });

        describe('Security: Privilege Escalation', () => {
            test('Security: prevents mass assignment of restricted fields', async () => {
                const res = await world.as('user').post('/api/user/elements', {
                    first_name: 'Hacker',
                    difficulty_level: 5,
                    swims: 9999,
                    free_sessions: 9999,
                    is_instructor: true
                });
                
                expect(res.statusCode).toBe(200); 

                const user = await world.db.get('SELECT * FROM users WHERE id = ?', [world.data.users['user']]);
                
                expect(user.first_name).toBe('Hacker');
                
                expect(user.difficulty_level).toBe(1);
                expect(user.swims).toBe(0); 
                expect(user.free_sessions).toBe(3);

                expect(user.is_instructor).toBe(1);
            });
        });
    });

    describe('POST /api/user/join (Membership Logic)', () => {
        test('Success: deducts fee and promotes user to member', async () => {
            world.mockGlobalFloat('MembershipCost', 50.0);
            
            const res = await world.as('user').post('/api/user/join');
            expect(res.statusCode).toBe(200);

            // Membership status updated
            const user = await world.db.get('SELECT is_member FROM users WHERE id = ?', [world.data.users['user']]);
            expect(user.is_member).toBe(1);

            // Payment transaction recorded
            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [world.data.users['user']]);
            expect(balance.b).toBe(-50.0);
        });

        test('Denied: cannot join if already a member', async () => {
            await world.db.run('UPDATE users SET is_member = 1 WHERE id = ?', [world.data.users['user']]);
            const res = await world.as('user').post('/api/user/join');
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/already a member/i);
        });
    });

    describe('POST /api/user/deleteAccount (Privacy Logic)', () => {
        const password = 'SecretPassword123';
        let userId;

        beforeEach(async () => {
            userId = world.data.users['user'];
            const hashed = await bcrypt.hash(password, 10);
            await world.db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [hashed, userId]);
            
            // Populate some PII
            await world.db.run('UPDATE users SET medical_conditions_details = "Asthma", home_address = "Secret Private St" WHERE id = ?', [userId]);
            
            await world.createEvent('E1');
            await world.joinEvent('user', 'E1');
        });

        test('Blocked: deletion requires correct password verification', async () => {
            const res = await world.as('user').post('/api/user/deleteAccount', { password: 'wrong-password' });
            expect(res.statusCode).toBe(403);
        });

        test('Blocked: cannot delete account with outstanding debt', async () => {
            await world.addTransaction('user', -10.0, 'Unpaid Debt');
            const res = await world.as('user').post('/api/user/deleteAccount', { password });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/zero/i);
        });

        /** Test soft-delete success. */
        test('Success: soft-deletion anonymizes PII but preserves historical record links', async () => {
            const res = await world.as('user').post('/api/user/deleteAccount', { password });
            expect(res.statusCode).toBe(200);

            const user = await world.db.get('SELECT * FROM users WHERE id = ?', [userId]);
            // Email is freed up but kept with prefix
            expect(user.email).toMatch(/^deleted:/);
            // PII fields are nulled out
            expect(user.medical_conditions_details).toBeNull();
            expect(user.home_address).toBeNull();
            // Non-PII fields kept for ID purposes
            expect(user.first_name).toBe('John');
            expect(user.last_name).toBe('Doe');

            // Attendance record link remains intact
            const attendance = await world.db.get('SELECT 1 FROM event_attendees WHERE user_id = ?', [userId]);
            expect(attendance).toBeDefined();
        });
    });
});
