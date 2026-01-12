const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const checkAuthentication = require('../misc/authentication.js');

/**
 * API for authentication, registration, and session management.
 * @module Auth
 */
class Auth {

    /**
     * Initialize Passport strategies and serialization.
     * @param {object} app
     * @param {object} db
     * @param {object} passport
     */
    constructor(app, db, passport) {
        this.app = app;
        this.db = db;
        this.passport = passport;

        passport.use(new LocalStrategy(
            { usernameField: 'email' },
            async (email, password, done) => {
                const lowerEmail = email.toLowerCase();
                try {
                    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [lowerEmail]);
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
                const user = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);
                done(null, user);
            } catch (err) {
                done(err);
            }
        });
    }

    /**
     * Registers authentication routes.
     */
    registerRoutes() {
        /**
         * Register a new user with Durham email validation.
         */
        this.app.post('/api/auth/signup', async (req, res) => {
            let { email, password, first_name, last_name } = req.body;

            if (!email || !password || !first_name || !last_name) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            email = email.toLowerCase();

            const nameRegex = /^[a-zA-Z'-]{1,50}$/;
            if (!nameRegex.test(first_name) || !nameRegex.test(last_name)) {
                return res.status(400).json({ message: 'Invalid name format.' });
            }

            const emailRegex = /^[^@]+\.[^@]+@durham\.ac\.uk$/i;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Invalid email format (must be @durham.ac.uk).' });
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                await this.db.run('INSERT INTO users (email, hashed_password, first_name, last_name) VALUES (?, ?, ?, ?)', [email, hashedPassword, first_name, last_name]);
                res.status(201).json({ message: 'User registered successfully.' });
            } catch (err) {
                res.status(500).json({ message: 'Registration failed. Email may be taken.' });
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
                    return res.status(200).json({ message: 'Login successful.', user });
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