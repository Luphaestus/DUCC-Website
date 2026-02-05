/**
 * GlobalsAPI.test.js
 * 
 * Global configuration tests.
 */

import TestWorld from '../utils/TestWorld.js';
import GlobalsAPI from '../../server/api/GlobalsAPI.js';

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
        world.mockGlobalObject('DefaultEventImage', {
            data: "/images/misc/ducc.png",
            name: "Default Event Image",
            permission: "President",
            regexp: "^/(images|api/files)/.+$",
            error: "Value must be a valid path or file API URL."
        });

        await world.createRole('President', ['globals.manage']);
        await world.createUser('president', {}, ['President']);
        await world.createUser('user', { is_member: 1 });
        await world.createUser('guest', { is_member: 0 });

        new GlobalsAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    describe('GET /api/globals/status', () => {
        test('Success for President-level user', async () => {
            const res = await world.as('president').get('/api/globals/status');
            expect(res.statusCode).toBe(200);
            expect(JSON.parse(res.body).isPresident).toBe(true);
        });

        test('Forbidden for non-president user', async () => {
            const res = await world.as('user').get('/api/globals/status');
            expect(res.statusCode).toBe(403);
        });
    });

    describe('GET /api/globals/:key (Scoped Access Control)', () => {
        /** Test Guest restricted keys. */
        test('Guest can only see Guest-level globals', async () => {
            const res = await world.request.get('/api/globals/MinMoney,Unauthorized_max_difficulty');
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body).toHaveProperty('res');
            expect(body.res).not.toHaveProperty('MinMoney');
            expect(body.res).not.toHaveProperty('Unauthorized_max_difficulty');
        });

        /** Test Authenticated user keys. */
        test('Authenticated user can see Authenticated-level keys', async () => {
            const res = await world.as('user').get('/api/globals/MinMoney,Unauthorized_max_difficulty');
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.res).toHaveProperty('MinMoney');
            expect(body.res).not.toHaveProperty('Unauthorized_max_difficulty');
        });

        /** Test President keys. */
        test('President can see all configuration keys', async () => {
            const res = await world.as('president').get('/api/globals/MinMoney,Unauthorized_max_difficulty');
            expect(res.statusCode).toBe(200);
            const body = JSON.parse(res.body);
            expect(body.res).toHaveProperty('MinMoney');
            expect(body.res).toHaveProperty('Unauthorized_max_difficulty');
        });
    });

    describe('POST /api/globals/:key (Write Verification)', () => {
        /** Test successful update. */
        test('President can update a global and it persists', async () => {
            const newValue = 100;
            const res = await world.as('president')
                .post('/api/globals/MembershipCost', { value: newValue });
            expect(res.statusCode).toBe(200);

            // Verify persistence via fetch
            const getRes = await world.as('user').get('/api/globals/MembershipCost');
            const getBody = JSON.parse(getRes.body);
            expect(getBody.res.MembershipCost.data).toBe(newValue);
        });

        /** Test update regex failure. */
        test('Update fails if value does not match regex rule', async () => {
            const res = await world.as('president')
                .post('/api/globals/MembershipCost', { value: "not-a-number" });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/currency amount/i);
        });

        test('DefaultEventImage validation: allows valid paths, rejects invalid', async () => {
            // Valid static path
            let res = await world.as('president').post('/api/globals/DefaultEventImage', { value: "/images/custom.png" });
            expect(res.statusCode).toBe(200);

            // Valid API path
            res = await world.as('president').post('/api/globals/DefaultEventImage', { value: "/api/files/123/download?view=true" });
            expect(res.statusCode).toBe(200);

            // Invalid path
            res = await world.as('president').post('/api/globals/DefaultEventImage', { value: "http://external.com/img.png" });
            expect(res.statusCode).toBe(400);
            expect(JSON.parse(res.body).message).toMatch(/valid path or file API URL/i);
        });

        /** Test unauthorized update attempt. */
        test('Standard authenticated user cannot update global settings', async () => {
            const res = await world.as('user')
                .post('/api/globals/MembershipCost', { value: 10 });
            expect(res.statusCode).toBe(403);
        });
    });
});