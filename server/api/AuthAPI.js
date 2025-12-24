const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const checkAuthentication = require('../misc/authentication.js');

/**
 * Auth API module.
 * Handles user authentication, registration, session management, and authorization checks.
 * Uses Passport.js with a local strategy (email/password).
 *
 * Routes:
 *   POST /api/auth/signup -> Registers a new user.
 *   POST /api/auth/login  -> Authenticates a user and logs them in.
 *   GET  /api/auth/logout -> Logs out the current user and clears session.
 *   GET  /api/auth/status -> Returns the current authentication status.
 *
 * @module Auth
 */
class Auth {

    /**
     * Initializes Passport.js strategy and serialization logic.
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     * @param {object} passport - The Passport.js instance.
     */
    constructor(app, db, passport) {
        this.app = app;
        this.db = db;
        this.passport = passport;

        // Configure the local strategy for email/password authentication
        passport.use(new LocalStrategy(
            { usernameField: 'email' },
            async (email, password, done) => {
                try {
                    // Look up the user by email
                    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [email]);

                    if (!user) {
                        return done(null, false, { message: 'Incorrect email.' });
                    }

                    // Compare the provided password with the stored hash
                    const isMatch = await bcrypt.compare(password, user.hashed_password);

                    if (!isMatch) {
                        return done(null, false, { message: 'Incorrect password.' });
                    }

                    // Authentication successful
                    return done(null, user);

                } catch (err) {
                    return done(err);
                }
            }
        ));

        // Serialize user ID to the session
        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        // Deserialize user object from the session ID
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
     * Registers authentication-related routes.
     */
    registerRoutes() {
        /**
         * POST /api/auth/signup
         * Handles new user registration with validation for Durham University email.
         */
        this.app.post('/api/auth/signup', async (req, res) => {
            const { email, password, first_name, last_name } = req.body;

            // Basic presence validation
            if (!email || !password || !first_name || !last_name) {
                return res.status(400).json({ message: 'Email, password, first name, and last name are required.' });
            }

            // Name format validation (alphabetic, hyphens, apostrophes)
            const nameRegex = /^[a-zA-Z'-]{1,50}$/;
            if (!nameRegex.test(first_name) || !nameRegex.test(last_name)) {
                return res.status(400).json({ message: 'Invalid First Name or Last Name. ' });
            }

            // Strict Durham University email validation
            const emailRegex = /^[^@]+\.[^@]+@durham\.ac\.uk$/i;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Invalid email format. You must use your first.last@durham.ac.uk email.' });
            }

            try {
                // Hash the password before storing it
                const hashedPassword = await bcrypt.hash(password, 10);

                await this.db.run('INSERT INTO users (email, hashed_password, first_name, last_name) VALUES (?, ?, ?, ?)', [email, hashedPassword, first_name, last_name]);

                res.status(201).json({ message: 'User registered successfully.' });

            } catch (err) {
                console.error(err);
                // Usually indicates a unique constraint violation on email
                res.status(500).json({ message: 'Error registering user. Email may already be taken.' });
            }
        });

        /**
         * POST /api/auth/login
         * Authenticates user using the local strategy.
         */
        this.app.post('/api/auth/login', (req, res, next) => {
            this.passport.authenticate('local', (err, user, info) => {
                if (err) {
                    return res.status(500).json({ message: 'An error occurred during authentication.' });
                }
                if (!user) {
                    return res.status(401).json({ message: info.message || 'Authentication failed.' });
                }
                req.logIn(user, (err) => {
                    if (err) {
                        return res.status(500).json({ message: 'An error occurred during login.' });
                    }
                    return res.status(200).json({ message: 'Login successful.', user });
                });
            })(req, res, next);
        });

        /**
         * GET /api/auth/logout
         * Logs out the user, destroys the session, and clears the session cookie.
         */
        this.app.get('/api/auth/logout', this.check(), (req, res, next) => {
            req.logout((err) => {
                if (err) { return next(err); }
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Error destroying session:', err);
                        return res.status(500).json({ message: 'Could not log out.' });
                    }
                    res.clearCookie('connect.sid');
                    res.status(200).json({ message: 'Logged out successfully.' });
                });
            });
        });

        /**
         * GET /api/auth/status
         * Returns whether the current request is authenticated.
         */
        this.app.get('/api/auth/status', (req, res) => {
            if (req.isAuthenticated()) {
                res.json({ authenticated: true });
            } else {
                res.json({ authenticated: false });
            }
        });
    }

    /**
     * Middleware to check if the user is authenticated.
     * Proxies to the checkAuthentication helper.
     * @param {object} req - The Express request object.
     * @param {object} res - The Express response object.
     * @param {function} next - The next middleware function.
     */
    isAuthenticated(req, res, next) {
        return checkAuthentication()(req, res, next);
    }

    /**
     * Middleware factory to check permissions.
     * Proxies to the checkAuthentication helper.
     * @param {...string} requirements - Permission requirements.
     * @returns {function} Express middleware.
     */
    check(...requirements) {
        return checkAuthentication(...requirements);
    }
}

module.exports = Auth;