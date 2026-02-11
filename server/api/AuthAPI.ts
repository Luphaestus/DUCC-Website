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
import { EmailManager } from '../emails/EmailManager.js';
import { generateSecret, verify, generateURI } from 'otplib';
import qrcode from 'qrcode';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array, isoBase64URL } from '@simplewebauthn/server/helpers';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Authenticator } from '@fastify/passport';
import { DatabaseWrapper } from '../db/db.js';

// Extend Session data interface
declare module 'fastify' {
    interface Session {
        pendingUser?: {
            id: number;
            hasTOTP: boolean;
            hasPasskeys: boolean;
            hasEmailOTP: boolean;
        };
        currentChallenge?: string;
        passkeyUserId?: number;
        tempTOTPSecret?: string;
        emailOTP?: string;
        emailOTPExpires?: number;
        csrfToken?: string;
    }
}

export default class Auth {
    app: FastifyInstance;
    db: DatabaseWrapper;
    passport: Authenticator;
    rpName: string;
    rpID: string;
    origin: string;

    /**
     * Initialize Passport strategies and serialization.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper, passport: Authenticator) {
        this.app = app;
        this.db = db;
        this.passport = passport;

        passport.use('local', new LocalStrategy(
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

        passport.registerUserSerializer(async (user: any) => {
            return user.id;
        });

        passport.registerUserDeserializer(async (id: number) => {
            try {
                const user = await AuthDB.getUserById(this.db, id);
                return user;
            } catch (err) {
                throw err;
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

    private sendVerificationEmail(email: string, name: string, token: string, request: FastifyRequest) {
        const protocol = request.protocol;
        const host = request.hostname;
        const baseUrl = `${protocol}://${host}`;
        const verifyUrl = `${baseUrl}/api/auth/verify/${token}`;

        EmailManager.getInstance().sendTemplatedEmail(
            email,
            'Verify your email - DUCC',
            'verify_email',
            {
                name: name,
                verify_url: verifyUrl
            }
        ).catch(err => Logger.error('[AuthAPI] Failed to send verification email:', err));
    }

    private async sendEmailOTP(user: any, request: FastifyRequest) {
        const otp = Utils.generateOTP(6);
        (request.session as any).emailOTP = otp;
        (request.session as any).emailOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        EmailManager.getInstance().sendTemplatedEmail(
            user.email,
            'Your Login Code - DUCC',
            'login_otp',
            {
                name: user.first_name,
                otp: otp
            }
        ).catch(err => Logger.error('[AuthAPI] Failed to send login OTP email:', err));
    }

    /**
     * Registers authentication-related routes.
     */
    registerRoutes() {
        /**
         * Register a new user or restore a deleted account.
         */
        this.app.post('/api/auth/signup', async (request: FastifyRequest, reply: FastifyReply) => {
            let { email, password, first_name, last_name } = request.body as any;

            if (!email || !password || !first_name || !last_name) {
                return reply.status(400).send({ message: 'All fields are required.' });
            }

            email = email.replace(/\s/g, '').toLowerCase();

            const errors: any = {};
            const emailError = ValidationRules.validate('email', email);
            if (emailError) errors.email = emailError;

            const firstNameError = ValidationRules.validate('name', first_name);
            if (firstNameError) errors.first_name = firstNameError;

            const lastNameError = ValidationRules.validate('name', last_name);
            if (lastNameError) errors.last_name = lastNameError;

            const passwordError = ValidationRules.validate('password', password);
            if (passwordError) errors.password = passwordError;

            if (Object.keys(errors).length > 0) {
                return reply.status(400).send({ message: 'Validation failed', errors });
            }

            try {
                const deletedEmail = 'deleted:' + email;
                const existingUser = await AuthDB.getUserByEmail(this.db, deletedEmail);

                const hashedPassword = await bcrypt.hash(password, config.auth.bcryptSaltRounds);
                const verificationToken = crypto.randomBytes(32).toString('hex');

                if (existingUser) {
                    const status = await AuthDB.restoreUser(this.db, existingUser.id, email, hashedPassword, first_name, last_name);
                    if (!status.isError()) {
                        await AuthDB.updateVerificationToken(this.db, existingUser.id, verificationToken);
                        this.sendVerificationEmail(email, first_name, verificationToken, request);
                    }
                    return status.getResponse(reply);
                } else {
                    const status = await AuthDB.createUser(this.db, email, hashedPassword, first_name, last_name, verificationToken);
                    if (!status.isError()) {
                        this.sendVerificationEmail(email, first_name, verificationToken, request);
                    }
                    return status.getResponse(reply);
                }
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Registration failed.' });
            }
        });

        /**
         * Verify email address using token.
         */
        this.app.get('/api/auth/verify/:token', async (request: FastifyRequest, reply: FastifyReply) => {
            const { token } = request.params as any;
            if (!token) return reply.status(400).send({ message: 'Token required.' });

            const status = await AuthDB.verifyUser(this.db, token);
            if (status.isError()) return status.getResponse(reply);

            // Redirect to success page
            return reply.redirect('/email-verified');
        });

        /**
         * Resend verification email.
         */
        this.app.post('/api/auth/resend-verification', async (request: FastifyRequest, reply: FastifyReply) => {
            const { email } = request.body as any;
            if (!email) return reply.status(400).send({ message: 'Email required.' });

            try {
                const user = await AuthDB.getUserByEmail(this.db, email.toLowerCase());
                if (!user) return reply.status(200).send({ message: 'If an account exists, a new verification link has been sent.' });
                if (user.is_verified) return reply.status(400).send({ message: 'Email is already verified.' });

                const token = crypto.randomBytes(32).toString('hex');
                await AuthDB.updateVerificationToken(this.db, user.id, token);
                this.sendVerificationEmail(user.email, user.first_name, token, request);

                return reply.send({ message: 'If an account exists, a new verification link has been sent.' });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Failed to resend verification.' });
            }
        });

        /**
         * Authenticate user and start session.
         */
        this.app.post('/api/auth/login', async (request: any, reply: FastifyReply) => {
            try {
                // @ts-ignore - passport.authenticate returns a function in some versions, but in fastify-passport it can be used as a hook or directly
                const result = await this.passport.authenticate('local', async (request: any, reply: any, err: any, user: any, info: any) => {
                    if (err) return reply.status(500).send({ message: 'Authentication error.' });
                    if (!user) return reply.status(401).send({ message: info?.message || 'Authentication failed.' });

                    if (!user.is_verified) {
                        return reply.status(403).send({ 
                            message: 'Email not verified.', 
                            unverified: true,
                            email: user.email 
                        });
                    }

                    const authenticators = await AuthDB.getUserAuthenticators(this.db, user.id);
                    const hasPasskeys = authenticators.length > 0;
                    const hasTOTP = !!user.totp_enabled;
                    const hasEmailOTP = !!user.email_2fa_enabled;

                    if (hasPasskeys || hasTOTP || hasEmailOTP) {
                        request.session.pendingUser = {
                            id: user.id,
                            hasTOTP,
                            hasPasskeys,
                            hasEmailOTP
                        };

                        if (hasEmailOTP && !hasTOTP && !hasPasskeys) {
                            await this.sendEmailOTP(user, request);
                        }

                        return reply.status(200).send({ 
                            requires2FA: true,
                            methods: {
                                totp: hasTOTP,
                                passkey: hasPasskeys,
                                email: hasEmailOTP
                            }
                        });
                    }

                    await request.logIn(user);
                    request.session.set('user_id', user.id); // Force session save
                    
                    const { hashed_password, ...safeUser } = user;
                    return reply.status(200).send({ 
                        message: 'Login successful.', 
                        user: {
                            id: safeUser.id,
                            email: safeUser.email,
                            first_name: safeUser.first_name,
                            last_name: safeUser.last_name
                        }
                    });
                })(request, reply);
                return result;
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Login error.' });
            }
        });

        /**
         * Verify TOTP token during login.
         */
        this.app.post('/api/auth/verify-totp', async (request: any, reply: FastifyReply) => {
            const { token } = request.body as any;
            const pendingUser = request.session.pendingUser;

            if (!pendingUser || !pendingUser.hasTOTP) {
                return reply.status(400).send({ message: 'TOTP not required or session expired.' });
            }

            const tokenError = ValidationRules.validate('totp', token);
            if (tokenError) return reply.status(400).send({ message: tokenError });

            try {
                const user = await AuthDB.getUserById(this.db, pendingUser.id);
                const isValid = await verify({
                    token,
                    secret: user.totp_secret
                });

                if (!isValid || !isValid.valid) {
                    return reply.status(401).send({ message: 'Invalid TOTP token.' });
                }

                await request.logIn(user);
                delete request.session.pendingUser;
                return reply.status(200).send({ message: 'Login successful.' });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Verification failed.' });
            }
        });

        /**
         * Verify Email OTP during login.
         */
        this.app.post('/api/auth/verify-email-otp', async (request: any, reply: FastifyReply) => {
            const { token } = request.body as any;
            const pendingUser = request.session.pendingUser;
            const storedOTP = request.session.emailOTP;
            const expires = request.session.emailOTPExpires;

            if (!pendingUser || !pendingUser.hasEmailOTP) {
                return reply.status(400).send({ message: 'Email OTP not required or session expired.' });
            }

            if (!storedOTP || !expires || Date.now() > expires) {
                return reply.status(401).send({ message: 'OTP expired or invalid.' });
            }

            if (token !== storedOTP) {
                return reply.status(401).send({ message: 'Invalid OTP.' });
            }

            try {
                const user = await AuthDB.getUserById(this.db, pendingUser.id);
                await request.logIn(user);
                delete request.session.pendingUser;
                delete request.session.emailOTP;
                delete request.session.emailOTPExpires;
                return reply.status(200).send({ message: 'Login successful.' });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Verification failed.' });
            }
        });

        /**
         * Resend Email OTP during login.
         */
        this.app.post('/api/auth/resend-email-otp', async (request: any, reply: FastifyReply) => {
            const pendingUser = request.session.pendingUser;

            if (!pendingUser || !pendingUser.hasEmailOTP) {
                return reply.status(400).send({ message: 'Email OTP not required or session expired.' });
            }

            try {
                const user = await AuthDB.getUserById(this.db, pendingUser.id);
                await this.sendEmailOTP(user, request);
                return reply.status(200).send({ message: 'OTP sent to your email.' });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Failed to send OTP.' });
            }
        });

        /**
         * WebAuthn login - Get authentication options.
         */
        this.app.post('/api/auth/passkey/login-options', async (request: any, reply: FastifyReply) => {
            const pendingUser = request.session.pendingUser;
            let userId = pendingUser?.id;

            const body = request.body as any;
            if (!userId && body?.email) {
                const user = await AuthDB.getUserByEmail(this.db, body.email.toLowerCase());
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

                request.session.currentChallenge = options.challenge;
                request.session.passkeyUserId = userId;
                return reply.send(options);
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Failed to generate options.' });
            }
        });

        /**
         * WebAuthn login - Verify response.
         */
        this.app.post('/api/auth/passkey/login-verify', async (request: any, reply: FastifyReply) => {
            const body = request.body as any;
            const expectedChallenge = request.session.currentChallenge;
            let targetUserId = request.session.pendingUser?.id || request.session.passkeyUserId;

            if (!targetUserId) {
                return reply.status(400).send({ message: 'User context missing.' });
            }

            if (!expectedChallenge) {
                return reply.status(400).send({ message: 'Authentication session expired.' });
            }

            try {
                const authenticator = await AuthDB.getAuthenticatorById(this.db, body.id);
                if (!authenticator) {
                    return reply.status(400).send({ message: 'Authenticator not found.' });
                }

                if (targetUserId && authenticator.user_id !== targetUserId) {
                    return reply.status(400).send({ message: 'Authenticator not found.' });
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
                    await request.logIn(user);
                    request.session.set('user_id', user.id); // Force session save
                    delete request.session.pendingUser;
                    delete request.session.currentChallenge;
                    delete request.session.passkeyUserId;
                    return reply.status(200).send({ message: 'Login successful.' });
                } else {
                    return reply.status(401).send({ message: 'Passkey verification failed.' });
                }
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Verification error.' });
            }
        });

        /**
         * Setup TOTP - Generate secret and QR code.
         */
        this.app.get('/api/auth/totp/setup', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            try {
                const secret = generateSecret();
                const user = request.user;
                const otpauth = generateURI({ secret, label: user.email, issuer: this.rpName });

                const qrCodeData = await qrcode.toDataURL(otpauth);
                // Temporarily store secret in session until verified
                request.session.tempTOTPSecret = secret;
                return reply.send({ qrCodeData, secret });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Failed to generate setup.' });
            }
        });

        /**
         * Verify and enable TOTP.
         */
        this.app.post('/api/auth/totp/enable', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { token } = request.body as any;
            const secret = request.session.tempTOTPSecret;

            if (!secret) return reply.status(400).send({ message: 'Setup session expired.' });

            const tokenError = ValidationRules.validate('totp', token);
            if (tokenError) return reply.status(400).send({ message: tokenError });

            try {
                const isValid = await verify({ token, secret });
                if (!isValid || !isValid.valid) return reply.status(400).send({ message: 'Invalid token.' });

                await AuthDB.setTOTPSecret(this.db, request.user.id, secret);
                await AuthDB.setTOTPEnabled(this.db, request.user.id, true);
                delete request.session.tempTOTPSecret;
                return reply.send({ success: true });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Failed to enable TOTP.' });
            }
        });

        /**
         * Disable TOTP.
         */
        this.app.post('/api/auth/totp/disable', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            try {
                await AuthDB.setTOTPEnabled(this.db, request.user.id, false);
                return reply.send({ success: true });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Failed to disable TOTP.' });
            }
        });

        /**
         * Enable Email 2FA.
         */
        this.app.post('/api/auth/email-2fa/enable', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            try {
                await AuthDB.setEmail2FAEnabled(this.db, request.user.id, true);
                return reply.send({ success: true });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Failed to enable Email 2FA.' });
            }
        });

        /**
         * Disable Email 2FA.
         */
        this.app.post('/api/auth/email-2fa/disable', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            try {
                await AuthDB.setEmail2FAEnabled(this.db, request.user.id, false);
                return reply.send({ success: true });
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Failed to disable Email 2FA.' });
            }
        });

        /**
         * WebAuthn Registration - Get options.
         */
        this.app.get('/api/auth/passkey/register-options', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const user = request.user;
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

                request.session.currentChallenge = options.challenge;
                return reply.send(options);
            } catch (err) {
                Logger.error('Error in register-options:', err);
                return reply.status(500).send({ message: 'Failed to generate options.' });
            }
        });

        /**
         * WebAuthn Registration - Verify response.
         */
        this.app.post('/api/auth/passkey/register-verify', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const body = request.body as any;
            const expectedChallenge = request.session.currentChallenge;

            if (!expectedChallenge) return reply.status(400).send({ message: 'Registration session expired.' });

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
                        return reply.status(500).send({ message: 'Verification successful but registration info missing.' });
                    }
                    await AuthDB.saveAuthenticator(this.db, request.user.id, registrationInfo);
                    delete request.session.currentChallenge;
                    return reply.send({ success: true });
                } else {
                    return reply.status(400).send({ message: 'Verification failed.' });
                }
            } catch (err) {
                Logger.error(err);
                return reply.status(500).send({ message: 'Verification error.' });
            }
        });

        /**
         * List user's passkeys.
         */
        this.app.get('/api/auth/passkeys', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            try {
                const keys = await AuthDB.getUserAuthenticators(this.db, request.user.id);
                return reply.send(keys.map(k => ({ id: k.id, created_at: k.created_at })));
            } catch (err) {
                return reply.status(500).send({ message: 'Failed to fetch passkeys.' });
            }
        });

        /**
         * Delete a passkey.
         */
        this.app.delete('/api/auth/passkeys/:id', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            try {
                await AuthDB.deleteAuthenticator(this.db, request.user.id, request.params.id);
                return reply.send({ success: true });
            } catch (err) {
                return reply.status(500).send({ message: 'Failed to delete passkey.' });
            }
        });

        /**
         * Logout user and destroy session.
         */
        this.app.get('/api/auth/logout', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            await request.logOut();
            await request.session.destroy();
            reply.clearCookie(config.session.cookieName);
            return reply.status(200).send({ message: 'Logged out.' });
        });

        /**
         * Get current authentication status.
         */
        this.app.get('/api/auth/status', async (request: any, reply: FastifyReply) => {
            return reply.send({ authenticated: request.isAuthenticated() });
        });

        /**
         * Request password reset.
         */
        this.app.post('/api/auth/reset-password-request', async (request: FastifyRequest, reply: FastifyReply) => {
            const { email } = request.body as any;
            if (!email) return reply.status(400).send({ message: 'Email is required.' });

            try {
                const searchStr = email.toLowerCase();
                // Try exact match first
                let user = await AuthDB.getUserByEmail(this.db, searchStr);
                
                // If not found and doesn't look like an email, try matching the prefix
                if (!user && !searchStr.includes('@')) {
                    user = await this.db.get('SELECT * FROM users WHERE email LIKE ?', [`${searchStr}@%`]);
                }

                if (!user) {
                    return reply.send({ message: 'If an account exists, a reset link has been sent.' });
                }

                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 3600000).toISOString();

                await AuthDB.createPasswordReset(this.db, user.id, token, expiresAt);

                // Need a way to get base URL in fastify
                const protocol = request.protocol;
                const host = request.hostname;
                const baseUrl = `${protocol}://${host}`;
                const resetUrl = `${baseUrl}/set-password?token=${token}`;

                Logger.info(`[RESET] Password reset url for ${user.email}: ${resetUrl}`);

                // Send email asynchronously
                EmailManager.getInstance().sendTemplatedEmail(
                    user.email,
                    'Password Reset Request - DUCC',
                    'password_reset',
                    {
                        name: user.first_name,
                        reset_url: resetUrl
                    }
                ).catch(err => Logger.error('[AuthAPI] Failed to send reset email:', err));

                return reply.send({ message: 'If an account exists, a reset link has been sent.' });
            } catch (e) {
                Logger.error(e);
                return reply.status(500).send({ message: 'Server error.' });
            }
        });

        /**
         * Set new password with token.
         */
        const setPasswordHandler = async (request: FastifyRequest, reply: FastifyReply) => {
            const { token, password } = request.body as any;
            const newPassword = password || (request.body as any).newPassword;

            if (!token || !newPassword) return reply.status(400).send({ message: 'Token and new password required.' });

            try {
                const resetRecord = await AuthDB.getValidPasswordReset(this.db, token);

                if (!resetRecord) {
                    return reply.status(400).send({ message: 'Invalid or expired token.' });
                }

                const hashedPassword = await bcrypt.hash(newPassword, config.auth.bcryptSaltRounds);

                await AuthDB.resetPassword(this.db, resetRecord.user_id, hashedPassword);

                return reply.send({ message: 'Password updated successfully.' });
            } catch (e) {
                Logger.error(e);
                return reply.status(500).send({ message: 'Server error.' });
            }
        };

        this.app.post('/api/auth/set-password', setPasswordHandler);
        this.app.post('/api/auth/reset-password', setPasswordHandler);

        /**
         * Change password for logged in user.
         */
        this.app.post('/api/auth/change-password', { preHandler: [checkAuthentication()] }, async (request: any, reply: FastifyReply) => {
            const { currentPassword, newPassword } = request.body as any;
            if (!currentPassword || !newPassword) return reply.status(400).send({ message: 'Current and new password required.' });

            try {
                const user = await AuthDB.getUserById(this.db, request.user.id);
                if (!user) return reply.status(404).send({ message: 'User not found.' });

                const isMatch = await bcrypt.compare(currentPassword, user.hashed_password);
                if (!isMatch) return reply.status(403).send({ message: 'Incorrect current password.' });

                const hashedPassword = await bcrypt.hash(newPassword, config.auth.bcryptSaltRounds);
                await AuthDB.updatePassword(this.db, request.user.id, hashedPassword);

                return reply.send({ message: 'Password changed successfully.' });
            } catch (e) {
                Logger.error(e);
                return reply.status(500).send({ message: 'Server error.' });
            }
        });
    }

    /**
     * Authentication middleware proxy.
     */
    isAuthenticated() {
        return checkAuthentication();
    }

    /**
     * Permission middleware proxy.
     */
    check(...requirements: string[]) {
        return checkAuthentication(...requirements);
    }
}