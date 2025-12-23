const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const checkAuthentication = require('../misc/authentication');

/**
 * Routes:
 *   POST /api/auth/signup -> Registers a new user.
 *   POST /api/auth/login  -> Authenticates a user and logs them in.
 *   GET  /logout     -> Logs out the current user.
 *
 * Middleware:
 *   isAuthenticated -> Checks if the user is authenticated.
 *   check -> Checks if the user is authenticated and has specific permissions.
 *
 * @module Auth
 */
class Auth {

    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     * @param {object} passport - The Passport.js instance.
     */
    constructor(app, db, passport) {
        this.app = app;
        this.db = db;
        this.passport = passport;

        passport.use(new LocalStrategy(
            { usernameField: 'email' },
            async (email, password, done) => {
                try {
                    const user = await this.db.get('SELECT * FROM users WHERE email = ?', [email]);

                    if (!user) {
                        return done(null, false, { message: 'Incorrect email.' });
                    }

                    const isMatch = await bcrypt.compare(password, user.hashed_password);

                    if (!isMatch) {
                        return done(null, false, { message: 'Incorrect password.' });
                    }

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

    registerRoutes() {
        this.app.post('/api/auth/signup', async (req, res) => {
            const { email, password, first_name, last_name } = req.body;

            if (!email || !password || !first_name || !last_name) {
                return res.status(400).json({ message: 'Email, password, first name, and last name are required.' });
            }

            const nameRegex = /^[a-zA-Z'-]{1,50}$/;
            if (!nameRegex.test(first_name) || !nameRegex.test(last_name)) {
                return res.status(400).json({ message: 'Invalid First Name or Last Name. ' });
            }

            const emailRegex = /^[^@]+\.[^@]+@durham\.ac\.uk$/i;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ message: 'Invalid email format. You must use your first.last@durham.ac.uk email.' });
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10);

                await this.db.run('INSERT INTO users (email, hashed_password, first_name, last_name) VALUES (?, ?, ?, ?)', [email, hashedPassword, first_name, last_name]);

                res.status(201).json({ message: 'User registered successfully.' });

            } catch (err) {
                console.error(err);
                res.status(500).json({ message: 'Error registering user. Email may already be taken.' });
            }
        });

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
     * @param {object} req - The Express request object.
     * @param {object} res - The Express response object.
     * @param {function} next - The next middleware function.
     */
    isAuthenticated(req, res, next) {
        return checkAuthentication()(req, res, next);
    }

    /**
     * Middleware factory to check permissions.
     * @param {...string} requirements - Permission requirements.
     * @returns {function} Express middleware.
     */
    check(...requirements) {
        return checkAuthentication(...requirements);
    }
}

module.exports = Auth;