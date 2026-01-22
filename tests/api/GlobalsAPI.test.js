/**
 * GlobalsAPI.test.js
 * 
 * Functional tests for system-wide configuration (Globals).
 * Verifies RBAC for viewing/editing keys and regular expression validation for updates.
 */

const TestWorld = require('../utils/TestWorld');
const GlobalsAPI = require('../../server/api/GlobalsAPI');

describe('api/GlobalsAPI', () => {
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        
        // Define mock global configuration objects
        world.mockGlobalObject('MinMoney', {
            data: -25,
            name: "Minimum Balance",
            permission: "Authenticated",
            regexp: "^-?\\d+$",
            error: "Value must be an integer."
        });
        world.mockGlobalObject('Unauthorized_max_difficulty', {
            data: 1,
            name: "Unauthorized Max Difficulty",
            permission: "President",
            regexp: "^[1-5]$",
            error: "Value must be between 1 and 5."
        });
        world.mockGlobalObject('MembershipCost', {
            data: 50,
            name: "Membership Cost",
            permission: "Authenticated",
            regexp: "^\\d+(\\.\\d{1,2})?$",
            error: "Value must be a valid currency amount."
        });

        await world.createRole('President', ['globals.manage']);
        await world.createUser('president', {}, ['President']);
        await world.createUser('user', { is_member: 1 });
        await world.createUser('guest', { is_member: 0 });

        new GlobalsAPI(world.app, world.db).registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/globals/status', () => {
        test('Success for President-level user', async () => {
            const res = await world.as('president').get('/api/globals/status');
            expect(res.statusCode).toBe(200);
            expect(res.body.isPresident).toBe(true);
        });

        test('Forbidden for non-president user', async () => {
            const res = await world.as('user').get('/api/globals/status');
            expect(res.statusCode).toBe(403);
        });
    });

    describe('GET /api/globals/:key (Scoped Access Control)', () => {
        /**
         * Test that Guests cannot see keys restricted to 'Authenticated' or 'President'.
         */
        test('Guest can only see Guest-level globals', async () => {
            const res = await world.request.get('/api/globals/MinMoney,Unauthorized_max_difficulty');
            expect(res.body.res).not.toHaveProperty('MinMoney');
            expect(res.body.res).not.toHaveProperty('Unauthorized_max_difficulty');
        });

        /**
         * Test that Authenticated users can see 'Authenticated' level but not 'President' level keys.
         */
        test('Authenticated user can see Authenticated-level keys', async () => {
            const res = await world.as('user').get('/api/globals/MinMoney,Unauthorized_max_difficulty');
            expect(res.body.res).toHaveProperty('MinMoney');
            expect(res.body.res).not.toHaveProperty('Unauthorized_max_difficulty');
        });

        /**
         * Test that Presidents can see all keys.
         */
        test('President can see all configuration keys', async () => {
            const res = await world.as('president').get('/api/globals/MinMoney,Unauthorized_max_difficulty');
            expect(res.body.res).toHaveProperty('MinMoney');
            expect(res.body.res).toHaveProperty('Unauthorized_max_difficulty');
        });
    });

    describe('POST /api/globals/:key (Write Verification)', () => {
        /**
         * Test successful update.
         */
        test('President can update a global and it persists', async () => {
            const newValue = 100;
            const res = await world.as('president')
                .post('/api/globals/MembershipCost')
                .send({ value: newValue });
            expect(res.statusCode).toBe(200);

            // Verify persistence via fetch
            const getRes = await world.as('user').get('/api/globals/MembershipCost');
            expect(getRes.body.res.MembershipCost.data).toBe(newValue);
        });

        /**
         * Test update failure when input violates regex rules.
         */
        test('Update fails if value does not match regex rule', async () => {
            const res = await world.as('president')
                .post('/api/globals/MembershipCost')
                .send({ value: "not-a-number" });
            expect(res.statusCode).toBe(400);
            expect(res.body.message).toMatch(/currency amount/i);
        });

        /**
         * Test unauthorized update attempt.
         */
        test('Standard authenticated user cannot update global settings', async () => {
            const res = await world.as('user')
                .post('/api/globals/MembershipCost')
                .send({ value: 10 });
            expect(res.statusCode).toBe(403);
        });
    });
});