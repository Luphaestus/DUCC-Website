const TestWorld = require('../../utils/TestWorld');
const UserAPI = require('../../../server/api/users/UserAPI');
const bcrypt = require('bcrypt');

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
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/user/elements/:elements', () => {
        test('Returns allowed elements', async () => {
            const res = await world.as('user').get('/api/user/elements/first_name,email,is_member');
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({
                first_name: 'John',
                email: 'john.doe@durham.ac.uk',
                is_member: 0
            });
        });

        test('Returns 403 for forbidden elements', async () => {
            const res = await world.as('user').get('/api/user/elements/hashed_password');
            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/Forbidden element/i);
        });

        test('Returns 403 if any element in list is forbidden', async () => {
            const res = await world.as('user').get('/api/user/elements/first_name,hashed_password');
            expect(res.statusCode).toBe(403);
        });
    });

    describe('POST /api/user/elements', () => {
        test('Success for valid profile data', async () => {
            const res = await world.as('user').post('/api/user/elements').send({
                first_name: 'Johnny',
                phone_number: '+44 7123 456789'
            });
            expect(res.statusCode).toBe(200);
            
            const user = await world.db.get('SELECT first_name, phone_number FROM users WHERE first_name = "Johnny"');
            expect(user.first_name).toBe('Johnny');
            expect(user.phone_number).toBe('+44 7123 456789');
        });

        test('Fail validation for invalid Durham email', async () => {
            const res = await world.as('user').post('/api/user/elements').send({
                email: 'not.durham@gmail.com'
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toHaveProperty('email');
        });

        test('Fail validation for invalid name', async () => {
            const res = await world.as('user').post('/api/user/elements').send({
                first_name: 'John123'
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toHaveProperty('first_name');
        });

        test('Fail validation for invalid date of birth (too young)', async () => {
            const tooYoung = new Date();
            tooYoung.setFullYear(tooYoung.getFullYear() - 10);
            const res = await world.as('user').post('/api/user/elements').send({
                date_of_birth: tooYoung.toISOString().split('T')[0]
            });
            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toHaveProperty('date_of_birth');
        });

        test('Correctly identifies filled_legal_info when all required fields set', async () => {
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

            const res = await world.as('user').post('/api/user/elements').send(legalData);
            expect(res.statusCode).toBe(200);

            const user = await world.db.get('SELECT filled_legal_info FROM users WHERE id = ?', [world.data.users['user']]);
            expect(user.filled_legal_info).toBe(1);
        });
    });

    describe('POST /api/user/join', () => {
        test('Success: charges fee and updates status', async () => {
            world.mockGlobalFloat('MembershipCost', 50.0);
            
            const res = await world.as('user').post('/api/user/join');
            expect(res.statusCode).toBe(200);

            const user = await world.db.get('SELECT is_member FROM users WHERE id = ?', [world.data.users['user']]);
            expect(user.is_member).toBe(1);

            const balance = await world.db.get('SELECT COALESCE(SUM(amount), 0) as b FROM transactions WHERE user_id = ?', [world.data.users['user']]);
            expect(balance.b).toBe(-50.0);
        });

        test('Fail if already a member', async () => {
            await world.db.run('UPDATE users SET is_member = 1 WHERE id = ?', [world.data.users['user']]);
            const res = await world.as('user').post('/api/user/join');
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/already a member/i);
        });
    });

    describe('POST /api/user/deleteAccount', () => {
        const password = 'SecretPassword123';
        let userId;

        beforeEach(async () => {
            userId = world.data.users['user'];
            const hashed = await bcrypt.hash(password, 10);
            await world.db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [hashed, userId]);
            
            await world.db.run('UPDATE users SET medical_conditions_details = "Asthma", home_address = "Private" WHERE id = ?', [userId]);
            
            await world.createEvent('E1');
            await world.joinEvent('user', 'E1');
        });

        test('Fail if password incorrect', async () => {
            const res = await world.as('user').post('/api/user/deleteAccount').send({ password: 'wrong-password' });
            expect(res.statusCode).toBe(403);
        });

        test('Fail if balance is not zero', async () => {
            await world.addTransaction('user', -10.0, 'Debt');
            const res = await world.as('user').post('/api/user/deleteAccount').send({ password });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/zero/i);
        });

        test('Success: Anonymizes PII but keeps attendance', async () => {
            const res = await world.as('user').post('/api/user/deleteAccount').send({ password });
            expect(res.statusCode).toBe(200);

            const user = await world.db.get('SELECT * FROM users WHERE id = ?', [userId]);
            expect(user.email).toMatch(/^deleted:/);
            expect(user.medical_conditions_details).toBeNull();
            expect(user.home_address).toBeNull();
            expect(user.first_name).toBe('John');
            expect(user.last_name).toBe('Doe');

            const attendance = await world.db.get('SELECT 1 FROM event_attendees WHERE user_id = ?', [userId]);
            expect(attendance).toBeDefined();
        });
    });
});