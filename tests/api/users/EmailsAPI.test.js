/**
 * EmailsAPI.test.js
 *
 * Security-focused tests for user email management endpoints.
 */

import TestWorld from '../../utils/TestWorld.js';
import EmailsAPI from '../../../server/api/users/EmailsAPI.js';
import { EmailManager } from '../../../server/emails/EmailManager.js';

describe('api/users/EmailsAPI', () => {
    let world;
    let userId;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();

        userId = await world.createUser('member', {
            email: 'member@durham.ac.uk',
            first_name: 'Member',
            last_name: 'User',
            is_verified: 1
        });

        new EmailsAPI(world.app, world.db).registerRoutes();
        await world.app.ready();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('GET /api/users/me/emails does not leak verification tokens or internal foreign keys', async () => {
        await world.db.run(
            'INSERT INTO user_emails (user_id, email, is_verified, is_primary, verification_token) VALUES (?, ?, ?, ?, ?)',
            [userId, 'secondary@example.com', 0, 0, 'secret_verification_token_value']
        );

        const res = await world.as('member').get('/api/users/me/emails');
        expect(res.statusCode).toBe(200);

        const rows = JSON.parse(res.body);
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThan(0);

        for (const row of rows) {
            expect(row).not.toHaveProperty('verification_token');
            expect(row).not.toHaveProperty('user_id');
            expect(row).toHaveProperty('email');
            expect(row).toHaveProperty('is_verified');
            expect(row).toHaveProperty('is_primary');
        }
    });

    test('POST /api/users/me/emails/:id/resend does not return verification token in response', async () => {
        const insert = await world.db.run(
            'INSERT INTO user_emails (user_id, email, is_verified, is_primary, verification_token) VALUES (?, ?, ?, ?, ?)',
            [userId, 'resend@example.com', 0, 0, 'oldtoken']
        );

        const sendSpy = vi.spyOn(EmailManager.getInstance(), 'sendTemplatedEmail').mockResolvedValue();

        const res = await world.as('member').post(`/api/users/me/emails/${insert.lastID}/resend`);
        expect(res.statusCode).toBe(200);

        const payload = JSON.parse(res.body);
        expect(payload.data).toBeDefined();
        expect(payload.data.email).toBe('resend@example.com');
        expect(payload.data.token).toBeUndefined();

        const updated = await world.db.get('SELECT verification_token FROM user_emails WHERE id = ?', [insert.lastID]);
        expect(updated.verification_token).toBeDefined();
        expect(updated.verification_token).toHaveLength(64);

        expect(sendSpy).toHaveBeenCalled();
        const placeholders = sendSpy.mock.calls[0][3];
        expect(placeholders.verify_url).toContain('/api/auth/emails/verify/');

        sendSpy.mockRestore();
    });

    test('GET /api/auth/emails/verify/:token rejects malformed token format', async () => {
        const res = await world.request.get('/api/auth/emails/verify/not-a-valid-token');
        expect(res.statusCode).toBe(400);
        expect(res.headers['content-type']).toContain('text/html');
        expect(res.body).toContain('Verification Failed');
    });
});
