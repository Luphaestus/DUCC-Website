const PORT = process.env.PORT || 3000;

const path = require('path');
const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public', {
  maxAge: '0d'
}));

app.use(session({
  store: new SQLiteStore({
    db: 'database.db',
    dir: '.'
  }),
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

let db;
(async () => {
  try {
    db = await open({
      filename: 'database.db',
      driver: sqlite3.Database
    });

    console.log('Connected to the SQLite database.');

    app.get('/api/health', (req, res) => {
      res.status(200).send('OK');
    });

    const Auth = require('./api/auth.js');
    const auth = new Auth(app, db, passport);
    auth.registerRoutes();

    app.get('/dashboard', auth.isAuthenticated, (req, res) => {
      res.send(`<h1>Welcome to your dashboard, ${req.user.first_name}!</h1><a href="/logout">Logout</a>`);
    });

    const slides = require('./api/slides.js');
    new slides(app).registerRoutes();

    const events = require('./api/events.js');
    new events(app, db).registerRoutes();

    const User = require('./api/user.js');
    new User(app, db).registerRoutes();

    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log('Press Ctrl+C to stop the server.');
    });

  } catch (err) {
    console.error(err.message);
  }
})();
