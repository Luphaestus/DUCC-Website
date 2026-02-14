import Fastify from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';
import fastifyPassport from '@fastify/passport';
import TestWorld from '../utils/TestWorld.js';
import AuthAPI from '../../server/api/AuthAPI.js';
import AuthDB from '../../server/db/authDB.js';
import config from '../../server/config.js';

describe('api/AuthAPI - Passkey Login Options', () => {
    let app, db;
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        db = world.db;

        app = Fastify();
        await app.register(fastifyCookie);
        await app.register(fastifySession, { 
            secret: 'test-secret-must-be-long-enough-for-session-plugin', 
            cookieName: config.session.cookieName,
            saveUninitialized: true,
            cookie: { secure: false }
        });
        await app.register(fastifyPassport.initialize());
        await app.register(fastifyPassport.secureSession());

        app.addHook('preHandler', async (request) => {
            request.db = db;
        });

        new AuthAPI(app, db, fastifyPassport).registerRoutes();
        await app.ready();
    });

    afterEach(async () => {
        await app.close();
        await world.tearDown();
    });

    test('POST /api/auth/passkey/login-options - 200 even if no email and no session (Discoverable Credentials)', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/auth/passkey/login-options',
            payload: {}
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).challenge).toBeDefined();
    });

    test('POST /api/auth/passkey/login-options - 200 even if user not found (Discoverable Credentials)', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/auth/passkey/login-options',
            payload: { email: 'nonexistent@example.com' }
        });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).challenge).toBeDefined();
    });

    test('POST /api/auth/passkey/login-options - 200 even if user has no passkeys (Discoverable Credentials)', async () => {
        // Create user
        await AuthDB.createUser(db, 'user@example.com', 'hash', 'User', 'Name');
        await db.run('UPDATE users SET is_verified = 1 WHERE email = ?', ['user@example.com']);
        
        const res = await app.inject({
            method: 'POST',
            url: '/api/auth/passkey/login-options',
            payload: { email: 'user@example.com' }
        });
            
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.challenge).toBeDefined();
        expect(body.allowCredentials).toBeUndefined();
    });

    test('POST /api/auth/passkey/login-options - Success with email', async () => {
        // Create user
        await AuthDB.createUser(db, 'passkey@example.com', 'hash', 'Pass', 'Key');
        await db.run('UPDATE users SET is_verified = 1 WHERE email = ?', ['passkey@example.com']);
        const user = await AuthDB.getUserByEmail(db, 'passkey@example.com');

        // Create Passkey
        const credentialID = 'validCredentialId123';
        const publicKey = Buffer.from('publicKey');
        await AuthDB.saveAuthenticator(db, user.id, {
            credentialID: credentialID,
            credentialPublicKey: publicKey,
            counter: 0,
            transports: ['usb']
        });

        const res = await app.inject({
            method: 'POST',
            url: '/api/auth/passkey/login-options',
            payload: { email: 'passkey@example.com' }
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.challenge).toBeDefined();
        expect(body.allowCredentials).toHaveLength(1);
        
        // Verify allowCredentials ID encoding (base64url)
        const allowed = body.allowCredentials[0];
        expect(allowed.id).toBeDefined();
    });

    test('POST /api/auth/passkey/login-options - Success with session (pendingUser)', async () => {
        // Create user
        await AuthDB.createUser(db, 'session@example.com', 'hash', 'Sess', 'Ion');
        await db.run('UPDATE users SET is_verified = 1 WHERE email = ?', ['session@example.com']);
        const user = await AuthDB.getUserByEmail(db, 'session@example.com');

        // Create Passkey
        await AuthDB.saveAuthenticator(db, user.id, {
            credentialID: 'credIDSession',
            credentialPublicKey: Buffer.from('key'),
            counter: 0
        });

        // Re-do user creation with known password hash
        const bcrypt = await import('bcrypt');
        const validHash = await bcrypt.hash('password123', 10);
        await db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [validHash, user.id]);

        const loginRes = await app.inject({
            method: 'POST',
            url: '/api/auth/login',
            payload: { 
                email: 'session@example.com', 
                password: 'password123'
            }
        });
        
        expect(loginRes.statusCode).toBe(200);
        const loginBody = JSON.parse(loginRes.body);
        expect(loginBody.requires2FA).toBe(true);
        expect(loginBody.methods.passkey).toBe(true);

        // Now call login-options without email
        const res2 = await app.inject({
            method: 'POST',
            url: '/api/auth/passkey/login-options',
            payload: {},
            cookies: { [config.session.cookieName]: loginRes.cookies[0].value }
        });
        expect(res2.statusCode).toBe(200);
        expect(JSON.parse(res2.body).challenge).toBeDefined();
    });
});