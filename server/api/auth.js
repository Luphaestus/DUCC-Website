const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');


class Auth{
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
        this.app.post('/api/signup', async (req, res) => {
            const { email, password, first_name, last_name } = req.body;

            if (!email || !password || !first_name || !last_name) {
                return res.status(400).send('Email, password, first name, and last name are required.');
            }

            const emailRegex = /^[^@]+\.[^@]+@durham\.ac\.uk$/i;
            if (!emailRegex.test(email)) {
                return res.status(400).send('Invalid email format. You must use your first.last@durham.ac.uk email.');
            }

            try {
                const hashedPassword = await bcrypt.hash(password, 10); 

                await this.db.run('INSERT INTO users (email, hashed_password, first_name, last_name) VALUES (?, ?, ?, ?)', [email, hashedPassword, first_name, last_name]);
                
                res.status(201).send('User registered successfully.');
            
            } catch (err) {
                console.error(err);
                res.status(500).send('Error registering user. Email may already be taken.');
            }
        });

        this.app.post('/api/login', (req, res, next) => {
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

        this.app.get('/logout', (req, res, next) => {
            req.logout((err) => {
                if (err) { return next(err); }
                    res.status(200).send('Logged out successfully.');
            });
        });
    }

    



    isAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next(); 
        }
        res.status(401).json({ message: 'Unauthorized access.' });
    }
}

module.exports = Auth;