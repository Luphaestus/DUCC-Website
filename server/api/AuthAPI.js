/**
 * AuthAPI.js
 * 
 * This file handles all authentication-related routes.
 */

const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const checkAuthentication = require('../misc/authentication.js');
const Utils = require('../misc/utils.js');
const ValidationRules = require('../rules/ValidationRules.js');
const AuthDB = require('../db/authDB.js');

class Auth {
    /**
     * Initialize Passport strategies and serialization.
     */
    constructor(app, db, passport) {
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

        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        passport.deserializeUser(async (id, done) => {
            try {
                const user = await AuthDB.getUserById(this.db, id);
                done(null, user);
            } catch (err) {
                done(err);
            }
        });
    }

    /**
     * Registers authentication-related routes.
     */
    registerRoutes() {
        /**
         * Register a new user or restore a deleted account.
         */
        this.app.post('/api/auth/signup', async (req, res) => {
            let { email, password, first_name, last_name } = req.body;

            if (!email || !password || !first_name || !last_name) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            email = email.replace(/\s/g, '').toLowerCase();

            const errors = {};
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

                const hashedPassword = await bcrypt.hash(password, 10);

                if (existingUser) {
                    const status = await AuthDB.restoreUser(this.db, existingUser.id, email, hashedPassword, first_name, last_name);
                    status.getResponse(res);
                } else {
                    const status = await AuthDB.createUser(this.db, email, hashedPassword, first_name, last_name);
                    status.getResponse(res);
                }
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Registration failed.' });
            }
        });

        /**
         * Authenticate user and start session.
         */
        this.app.post('/api/auth/login', (req, res, next) => {
            this.passport.authenticate('local', (err, user, info) => {
                if (err) return res.status(500).json({ message: 'Authentication error.' });
                if (!user) return res.status(401).json({ message: info.message || 'Authentication failed.' });

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
         * Logout user and destroy session.
         */
        this.app.get('/api/auth/logout', this.check(), (req, res, next) => {
            req.logout((err) => {
                if (err) return next(err);
                req.session.destroy((err) => {
                    if (err) return res.status(500).json({ message: 'Logout failed.' });
                    res.clearCookie('connect.sid');
                    res.status(200).json({ message: 'Logged out.' });
                });
            });
        });

        /**
         * Get current authentication status.
         */
        this.app.get('/api/auth/status', (req, res) => {
            res.json({ authenticated: req.isAuthenticated() });
        });

        /**
         * Request password reset.
         */
        this.app.post('/api/auth/reset-password-request', async (req, res) => {
            const { email } = req.body;
            if (!email) return res.status(400).json({ message: 'Email is required.' });

            try {
                const user = await AuthDB.getUserByEmail(this.db, email.toLowerCase());
                if (!user) {
                    return res.json({ message: 'If an account exists, a reset link has been sent.' });
                }

                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 3600000).toISOString();

                await AuthDB.createPasswordReset(this.db, user.id, token, expiresAt);

                const baseUrl = Utils.getBaseUrl(req);

                console.log(`[RESET] Password reset url for ${email}: ${baseUrl}/set-password?token=${token}`);

                res.json({ message: 'If an account exists, a reset link has been sent.' });
            } catch (e) {
                console.error(e);
                res.status(500).json({ message: 'Server error.' });
            }
        });

        /**
         * Reset password with token.
         */
        this.app.post('/api/auth/reset-password', async (req, res) => {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required.' });

            try {
                const resetRecord = await AuthDB.getValidPasswordReset(this.db, token);

                if (!resetRecord) {
                    return res.status(400).json({ message: 'Invalid or expired token.' });
                }

                const hashedPassword = await bcrypt.hash(newPassword, 10);

                await AuthDB.resetPassword(this.db, resetRecord.user_id, hashedPassword);

                res.json({ message: 'Password updated successfully.' });
            } catch (e) {
                console.error(e);
                res.status(500).json({ message: 'Server error.' });
            }
        });

        /**
         * Change password for logged in user.
         */
        this.app.post('/api/auth/change-password', this.check(), async (req, res) => {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password required.' });

            try {
                const user = await AuthDB.getUserById(this.db, req.user.id);
                if (!user) return res.status(404).json({ message: 'User not found.' });

                const isMatch = await bcrypt.compare(currentPassword, user.hashed_password);
                if (!isMatch) return res.status(403).json({ message: 'Incorrect current password.' });

                const hashedPassword = await bcrypt.hash(newPassword, 10);
                await AuthDB.updatePassword(this.db, req.user.id, hashedPassword);

                res.json({ message: 'Password changed successfully.' });
            } catch (e) {
                console.error(e);
                res.status(500).json({ message: 'Server error.' });
            }
        });
    }

    /**
     * Authentication middleware proxy.
     */
    isAuthenticated(req, res, next) {
        return checkAuthentication()(req, res, next);
    }

    /**
     * Permission middleware proxy.
     */
    check(...requirements) {
        return checkAuthentication(...requirements);
    }
}

module.exports = Auth;