
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { Authenticator } from 'passport';
import TestWorld from '../utils/TestWorld.js';
import AuthAPI from '../../server/api/AuthAPI.js';
import AuthDB from '../../server/db/authDB.js';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

describe('api/AuthAPI - Passkey Login Options', () => {
    let app, db, passport, auth;
    let world;

    beforeEach(async () => {
        world = new TestWorld();
        await world.setUp();
        db = world.db;

        // Manual Express setup
        passport = new Authenticator();
        app = express();
        app.use(express.json());
        app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
        app.use(passport.initialize());
        app.use(passport.session());

        app.use((req, res, next) => {
            req.db = db;
            next();
        });

        auth = new AuthAPI(app, db, passport);
        auth.registerRoutes();
    });

    afterEach(async () => {
        await world.tearDown();
    });

    test('POST /api/auth/passkey/login-options - 200 even if no email and no session (Discoverable Credentials)', async () => {
        const res = await request(app)
            .post('/api/auth/passkey/login-options')
            .send({});
        expect(res.statusCode).toBe(200);
        expect(res.body.challenge).toBeDefined();
    });

    test('POST /api/auth/passkey/login-options - 200 even if user not found (Discoverable Credentials)', async () => {
        const res = await request(app)
            .post('/api/auth/passkey/login-options')
            .send({ email: 'nonexistent@example.com' });
        expect(res.statusCode).toBe(200);
        expect(res.body.challenge).toBeDefined();
    });

    test('POST /api/auth/passkey/login-options - 200 even if user has no passkeys (Discoverable Credentials)', async () => {
        // Create user
        await AuthDB.createUser(db, 'user@example.com', 'hash', 'User', 'Name');
        
        const res = await request(app)
            .post('/api/auth/passkey/login-options')
            .send({ email: 'user@example.com' });
            
        expect(res.statusCode).toBe(200);
        expect(res.body.challenge).toBeDefined();
        expect(res.body.allowCredentials).toBeUndefined();
    });

    test('POST /api/auth/passkey/login-options - Success with email', async () => {
        // Create user
        await AuthDB.createUser(db, 'passkey@example.com', 'hash', 'Pass', 'Key');
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

        const res = await request(app)
            .post('/api/auth/passkey/login-options')
            .send({ email: 'passkey@example.com' });

        expect(res.statusCode).toBe(200);
        expect(res.body.challenge).toBeDefined();
        expect(res.body.allowCredentials).toHaveLength(1);
        
        // Verify allowCredentials ID encoding (base64url)
        const allowed = res.body.allowCredentials[0];
        expect(allowed.id).toBeDefined();
    });

    test('POST /api/auth/passkey/login-options - Success with session (pendingUser)', async () => {
        // Create user
        await AuthDB.createUser(db, 'session@example.com', 'hash', 'Sess', 'Ion');
        const user = await AuthDB.getUserByEmail(db, 'session@example.com');

        // Create Passkey
        await AuthDB.saveAuthenticator(db, user.id, {
            credentialID: 'credIDSession',
            credentialPublicKey: Buffer.from('key'),
            counter: 0
        });

        const agent = request.agent(app);
        
        // Re-do user creation with known password hash
        const bcrypt = await import('bcrypt');
        const validHash = await bcrypt.hash('password123', 10);
        await db.run('UPDATE users SET hashed_password = ? WHERE id = ?', [validHash, user.id]);

        const res1 = await agent.post('/api/auth/login').send({ 
            email: 'session@example.com', 
            password: 'password123'
        });
        
        expect(res1.statusCode).toBe(200);
        expect(res1.body.requires2FA).toBe(true);
        expect(res1.body.methods.passkey).toBe(true);

        // Now call login-options without email
        const res2 = await agent.post('/api/auth/passkey/login-options').send({});
        expect(res2.statusCode).toBe(200);
        expect(res2.body.challenge).toBeDefined();
    });
});
