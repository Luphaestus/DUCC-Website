/**
 * AuthAPI.ts
 * 
 * This file handles all authentication-related routes.
 */

import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import checkAuthentication from '../misc/authentication.js';
import Utils from '../misc/utils.js';
import ValidationRules from '../rules/ValidationRules.js';
import AuthDB from '../db/authDB.js';
import Logger from '../misc/Logger.js';
import config from '../config.js';
import { generateSecret, verify, generateURI } from 'otplib';
import qrcode from 'qrcode';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array, isoBase64URL } from '@simplewebauthn/server/helpers';
import { Express, Request, Response, NextFunction } from 'express';
import { PassportStatic } from 'passport';
import { DatabaseWrapper } from '../db/db.js';

// Extend Session data interface
declare module 'express-session' {
    interface SessionData {
        pendingUser?: {
            id: number;
            hasTOTP: boolean;
            hasPasskeys: boolean;
        };
        currentChallenge?: string;
        passkeyUserId?: number;
        tempTOTPSecret?: string;
    }
}

export default class Auth {
    app: Express;
    db: DatabaseWrapper;
    passport: PassportStatic;
    rpName: string;
    rpID: string;
    origin: string;

    /**
     * Initialize Passport strategies and serialization.
     */
    constructor(app: Express, db: DatabaseWrapper, passport: PassportStatic) {
        this.app = app;
        this.db = db;
        this.passport = passport;

        passport.use(new LocalStrategy(
            { usernameField: 'email' },
            async (email, password, done) => {
                const formatedEmail = email.replace(/\s/g, '').toLowerCase();
                try {
                    const user = await AuthDB.getUserByEmail(this.db, formatedEmail);
                    if (!user) return done(null, false, { message: 'Incorrect email.' });

                    const isMatch = await bcrypt.compare(password, user.hashed_password);
                    if (!isMatch) return done(null, false, { message: 'Incorrect password.' });

                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        ));

        passport.serializeUser((user: any, done) => {
            done(null, user.id);
        });

        passport.deserializeUser(async (id: number, done) => {
            try {
                const user = await AuthDB.getUserById(this.db, id);
                done(null, user);
            } catch (err) {
                done(err);
            }
        });

        // WebAuthn configuration
        this.rpName = 'DUCC Website';
        this.rpID = config.domain;
        this.origin = `https://${this.rpID}`;
        if (this.rpID === 'localhost') {
            this.origin = `http://localhost:${process.env.PORT || 3000}`;
        }
        
        if (process.env.ORIGIN) {
            this.origin = process.env.ORIGIN;
        }
    }

    /**
     * Registers authentication-related routes.
     */
    registerRoutes() {
        /**
         * Register a new user or restore a deleted account.
         */
        this.app.post('/api/auth/signup', async (req: Request, res: Response) => {
            let { email, password, first_name, last_name } = req.body;

            if (!email || !password || !first_name || !last_name) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            email = email.replace(/\s/g, '').toLowerCase();

            const errors: any = {};
            const emailError = ValidationRules.validate('email', email);
            if (emailError) errors.email = emailError;

            const firstNameError = ValidationRules.validate('name', first_name);
            if (firstNameError) errors.first_name = firstNameError;

            const lastNameError = ValidationRules.validate('name', last_name);
            if (lastNameError) errors.last_name = lastNameError;

            if (Object.keys(errors).length > 0) {
                return res.status(400).json({ message: 'Validation failed', errors });
            }

            try {
                const deletedEmail = 'deleted:' + email;
                const existingUser = await AuthDB.getUserByEmail(this.db, deletedEmail);

                const hashedPassword = await bcrypt.hash(password, config.auth.bcryptSaltRounds);

                if (existingUser) {
                    const status = await AuthDB.restoreUser(this.db, existingUser.id, email, hashedPassword, first_name, last_name);
                    status.getResponse(res);
                } else {
                    const status = await AuthDB.createUser(this.db, email, hashedPassword, first_name, last_name);
                    status.getResponse(res);
                }
            } catch (err) {
                Logger.error(err);
                res.status(500).json({ message: 'Registration failed.' });
            }
        });

        /**
         * Authenticate user and start session.
         */
        this.app.post('/api/auth/login', (req: Request, res: Response, next: NextFunction) => {
            this.passport.authenticate('local', async (err: any, user: any, info: any) => {
                if (err) return res.status(500).json({ message: 'Authentication error.' });
                if (!user) return res.status(401).json({ message: info.message || 'Authentication failed.' });

                const authenticators = await AuthDB.getUserAuthenticators(this.db, user.id);
                const hasPasskeys = authenticators.length > 0;
                const hasTOTP = !!user.totp_enabled;

                if (hasPasskeys || hasTOTP) {
                    req.session.pendingUser = {
                        id: user.id,
                        hasTOTP,
                        hasPasskeys
                    };
                    return res.status(200).json({ 
                        requires2FA: true,
                        methods: {
                            totp: hasTOTP,
                            passkey: hasPasskeys
                        }
                    });
                }

                req.logIn(user, (err) => {
                    if (err) return res.status(500).json({ message: 'Login error.' });
                    
                    const { hashed_password, ...safeUser } = user;
                    return res.status(200).json({ 
                        message: 'Login successful.', 
                        user: {
                            id: safeUser.id,
                            email: safeUser.email,
                            first_name: safeUser.first_name,
                            last_name: safeUser.last_name
                        }
                    });
                });
            })(req, res, next);
        });

        /**
         * Verify TOTP token during login.
         */
        this.app.post('/api/auth/verify-totp', async (req: Request, res: Response) => {
            const { token } = req.body;
            const pendingUser = req.session.pendingUser;

            if (!pendingUser || !pendingUser.hasTOTP) {
                return res.status(400).json({ message: 'TOTP not required or session expired.' });
            }

            const tokenError = ValidationRules.validate('totp', token);
            if (tokenError) return res.status(400).json({ message: tokenError });

            try {
                const user = await AuthDB.getUserById(this.db, pendingUser.id);
                const isValid = await verify({
                    token,
                    secret: user.totp_secret
                });

                if (!isValid || !isValid.valid) {
                    return res.status(401).json({ message: 'Invalid TOTP token.' });
                }

                req.logIn(user, (err) => {
                    if (err) return res.status(500).json({ message: 'Login error.' });
                    delete req.session.pendingUser;
                    return res.status(200).json({ message: 'Login successful.' });
                });
            } catch (err) {
                Logger.error(err);
                res.status(500).json({ message: 'Verification failed.' });
            }
        });

        /**
         * WebAuthn login - Get authentication options.
         */
        this.app.post('/api/auth/passkey/login-options', async (req: Request, res: Response) => {
            const pendingUser = req.session.pendingUser;
            let userId = pendingUser?.id;

            if (!userId && req.body.email) {
                const user = await AuthDB.getUserByEmail(this.db, req.body.email.toLowerCase());
                if (user) userId = user.id;
            }

            try {
                let allowCredentials;
                if (userId) {
                    const userAuthenticators = await AuthDB.getUserAuthenticators(this.db, userId);
                    if (userAuthenticators.length > 0) {
                        allowCredentials = userAuthenticators.map(auth => ({
                            id: auth.id,
                            type: 'public-key' as const,
                            transports: auth.transports ? JSON.parse(auth.transports) : undefined,
                        }));
                    }
                }

                const options = await generateAuthenticationOptions({
                    rpID: this.rpID,
                    allowCredentials,
                    userVerification: 'preferred',
                });

                req.session.currentChallenge = options.challenge;
                req.session.passkeyUserId = userId;
                res.json(options);
            } catch (err) {
                Logger.error(err);
                res.status(500).json({ message: 'Failed to generate options.' });
            }
        });

        /**
         * WebAuthn login - Verify response.
         */
        this.app.post('/api/auth/passkey/login-verify', async (req: Request, res: Response) => {
            const { body } = req;
            const expectedChallenge = req.session.currentChallenge;
            let targetUserId = req.session.pendingUser?.id || req.session.passkeyUserId;

            if (!targetUserId) {
                return res.status(400).json({ message: 'User context missing.' });
            }

            if (!expectedChallenge) {
                return res.status(400).json({ message: 'Authentication session expired.' });
            }

            try {
                const authenticator = await AuthDB.getAuthenticatorById(this.db, body.id);
                if (!authenticator) {
                    return res.status(400).json({ message: 'Authenticator not found.' });
                }

                if (targetUserId && authenticator.user_id !== targetUserId) {
                    return res.status(400).json({ message: 'Authenticator not found.' });
                }

                // If no targetUserId (discoverable credential), use the one from the authenticator
                if (!targetUserId) {
                    targetUserId = authenticator.user_id;
                }

                const verification = await verifyAuthenticationResponse({
                    response: body,
                    expectedChallenge,
                    expectedOrigin: this.origin,
                    expectedRPID: this.rpID,
                    credential: {
                        id: typeof authenticator.id === 'string' ? isoBase64URL.toBuffer(authenticator.id) : authenticator.id,
                        publicKey: authenticator.public_key,
                        counter: authenticator.counter || 0,
                    },
                });

                if (verification.verified) {
                    const { authenticationInfo } = verification;
                    await AuthDB.updateAuthenticatorCounter(this.db, authenticator.id, authenticationInfo.newCounter);
                    
                    const user = await AuthDB.getUserById(this.db, targetUserId as number);
                    req.logIn(user, (err) => {
                        if (err) return res.status(500).json({ message: 'Login error.' });
                        delete req.session.pendingUser;
                        delete req.session.currentChallenge;
                        delete req.session.passkeyUserId;
                        return res.status(200).json({ message: 'Login successful.' });
                    });
                } else {
                    res.status(401).json({ message: 'Passkey verification failed.' });
                }
            } catch (err) {
                Logger.error(err);
                res.status(500).json({ message: 'Verification error.' });
            }
        });

        /**
         * Setup TOTP - Generate secret and QR code.
         */
        this.app.get('/api/auth/totp/setup', this.check(), async (req: any, res: Response) => {
            try {
                const secret = generateSecret();
                const user = req.user;
                const otpauth = generateURI({ secret, label: user.email, issuer: this.rpName });

                const qrCodeData = await qrcode.toDataURL(otpauth);
                // Temporarily store secret in session until verified
                req.session.tempTOTPSecret = secret;
                res.json({ qrCodeData, secret });
            } catch (err) {
                Logger.error(err);
                res.status(500).json({ message: 'Failed to generate setup.' });
            }
        });

        /**
         * Verify and enable TOTP.
         */
        this.app.post('/api/auth/totp/enable', this.check(), async (req: any, res: Response) => {
            const { token } = req.body;
            const secret = req.session.tempTOTPSecret;

            if (!secret) return res.status(400).json({ message: 'Setup session expired.' });

            const tokenError = ValidationRules.validate('totp', token);
            if (tokenError) return res.status(400).json({ message: tokenError });

            try {
                const isValid = await verify({ token, secret });
                if (!isValid || !isValid.valid) return res.status(400).json({ message: 'Invalid token.' });

                await AuthDB.setTOTPSecret(this.db, req.user.id, secret);
                await AuthDB.setTOTPEnabled(this.db, req.user.id, true);
                delete req.session.tempTOTPSecret;
                res.json({ success: true });
            } catch (err) {
                Logger.error(err);
                res.status(500).json({ message: 'Failed to enable TOTP.' });
            }
        });

        /**
         * Disable TOTP.
         */
        this.app.post('/api/auth/totp/disable', this.check(), async (req: any, res: Response) => {
            try {
                await AuthDB.setTOTPEnabled(this.db, req.user.id, false);
                res.json({ success: true });
            } catch (err) {
                Logger.error(err);
                res.status(500).json({ message: 'Failed to disable TOTP.' });
            }
        });

        /**
         * WebAuthn Registration - Get options.
         */
        this.app.get('/api/auth/passkey/register-options', this.check(), async (req: any, res: Response) => {
            const user = req.user;
            const userAuthenticators = await AuthDB.getUserAuthenticators(this.db, user.id);

            try {
                const options = await generateRegistrationOptions({
                    rpName: this.rpName,
                    rpID: this.rpID,
                    userID: isoUint8Array.fromUTF8String(user.id.toString()),
                    userName: user.email,
                    attestationType: 'none',
                    excludeCredentials: userAuthenticators.map(auth => ({
                        id: auth.id,
                        type: 'public-key' as const,
                        transports: auth.transports ? JSON.parse(auth.transports) : undefined,
                    })),
                    authenticatorSelection: {
                        residentKey: 'preferred',
                        userVerification: 'preferred',
                    },
                });

                req.session.currentChallenge = options.challenge;
                res.json(options);
            } catch (err) {
                Logger.error('Error in register-options:', err);
                res.status(500).json({ message: 'Failed to generate options.' });
            }
        });

        /**
         * WebAuthn Registration - Verify response.
         */
        this.app.post('/api/auth/passkey/register-verify', this.check(), async (req: any, res: Response) => {
            const { body } = req;
            const expectedChallenge = req.session.currentChallenge;

            if (!expectedChallenge) return res.status(400).json({ message: 'Registration session expired.' });

            try {
                const verification = await verifyRegistrationResponse({
                    response: body,
                    expectedChallenge,
                    expectedOrigin: this.origin,
                    expectedRPID: this.rpID,
                });

                if (verification.verified) {
                    const { registrationInfo } = verification;
                    if (!registrationInfo) {
                        return res.status(500).json({ message: 'Verification successful but registration info missing.' });
                    }
                    await AuthDB.saveAuthenticator(this.db, req.user.id, registrationInfo);
                    delete req.session.currentChallenge;
                    res.json({ success: true });
                } else {
                    res.status(400).json({ message: 'Verification failed.' });
                }
            } catch (err) {
                Logger.error(err);
                res.status(500).json({ message: 'Verification error.' });
            }
        });

        /**
         * List user's passkeys.
         */
        this.app.get('/api/auth/passkeys', this.check(), async (req: any, res: Response) => {
            try {
                const keys = await AuthDB.getUserAuthenticators(this.db, req.user.id);
                res.json(keys.map(k => ({ id: k.id, created_at: k.created_at })));
            } catch (err) {
                res.status(500).json({ message: 'Failed to fetch passkeys.' });
            }
        });

        /**
         * Delete a passkey.
         */
        this.app.delete('/api/auth/passkeys/:id', this.check(), async (req: any, res: Response) => {
            try {
                await AuthDB.deleteAuthenticator(this.db, req.user.id, req.params.id);
                res.json({ success: true });
            } catch (err) {
                res.status(500).json({ message: 'Failed to delete passkey.' });
            }
        });

        /**
         * Logout user and destroy session.
         */
        this.app.get('/api/auth/logout', this.check(), (req: Request, res: Response, next: NextFunction) => {
            req.logout((err) => {
                if (err) return next(err);
                req.session.destroy((err) => {
                    if (err) return res.status(500).json({ message: 'Logout failed.' });
                    res.clearCookie(config.session.cookieName);
                    res.status(200).json({ message: 'Logged out.' });
                });
            });
        });

        /**
         * Get current authentication status.
         */
        this.app.get('/api/auth/status', (req: Request, res: Response) => {
            res.json({ authenticated: req.isAuthenticated() });
        });

        /**
         * Request password reset.
         */
        this.app.post('/api/auth/reset-password-request', async (req: Request, res: Response) => {
            const { email } = req.body;
            if (!email) return res.status(400).json({ message: 'Email is required.' });

            try {
                const searchStr = email.toLowerCase();
                // Try exact match first
                let user = await AuthDB.getUserByEmail(this.db, searchStr);
                
                // If not found and doesn't look like an email, try matching the prefix
                if (!user && !searchStr.includes('@')) {
                    user = await this.db.get('SELECT * FROM users WHERE email LIKE ?', [`${searchStr}@%`]);
                }

                if (!user) {
                    return res.json({ message: 'If an account exists, a reset link has been sent.' });
                }

                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 3600000).toISOString();

                await AuthDB.createPasswordReset(this.db, user.id, token, expiresAt);

                const baseUrl = Utils.getBaseUrl(req);

                Logger.info(`[RESET] Password reset url for ${user.email}: ${baseUrl}/set-password?token=${token}`);

                res.json({ message: 'If an account exists, a reset link has been sent.' });
            } catch (e) {
                Logger.error(e);
                res.status(500).json({ message: 'Server error.' });
            }
        });

        /**
         * Set new password with token.
         */
        const setPasswordHandler = async (req: Request, res: Response) => {
            const { token, password } = req.body;
            const newPassword = password || req.body.newPassword;

            if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required.' });

            try {
                const resetRecord = await AuthDB.getValidPasswordReset(this.db, token);

                if (!resetRecord) {
                    return res.status(400).json({ message: 'Invalid or expired token.' });
                }

                const hashedPassword = await bcrypt.hash(newPassword, config.auth.bcryptSaltRounds);

                await AuthDB.resetPassword(this.db, resetRecord.user_id, hashedPassword);

                res.json({ message: 'Password updated successfully.' });
            } catch (e) {
                Logger.error(e);
                res.status(500).json({ message: 'Server error.' });
            }
        };

        this.app.post('/api/auth/set-password', setPasswordHandler);
        this.app.post('/api/auth/reset-password', setPasswordHandler);

        /**
         * Change password for logged in user.
         */
        this.app.post('/api/auth/change-password', this.check(), async (req: any, res: Response) => {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password required.' });

            try {
                const user = await AuthDB.getUserById(this.db, req.user.id);
                if (!user) return res.status(404).json({ message: 'User not found.' });

                const isMatch = await bcrypt.compare(currentPassword, user.hashed_password);
                if (!isMatch) return res.status(403).json({ message: 'Incorrect current password.' });

                const hashedPassword = await bcrypt.hash(newPassword, config.auth.bcryptSaltRounds);
                await AuthDB.updatePassword(this.db, req.user.id, hashedPassword);

                res.json({ message: 'Password changed successfully.' });
            } catch (e) {
                Logger.error(e);
                res.status(500).json({ message: 'Server error.' });
            }
        });
    }

    /**
     * Authentication middleware proxy.
     */
    isAuthenticated(req: Request, res: Response, next: NextFunction) {
        return checkAuthentication()(req, res, next);
    }

    /**
     * Permission middleware proxy.
     */
    check(...requirements: string[]) {
        return checkAuthentication(...requirements);
    }
}
