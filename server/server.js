const PORT = process.env.PORT || 3000;

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const path = require('path');
const express = require('express');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const app = express();
const fs = require('fs');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public', {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
      res.set('Cache-Control', 'public, max-age=86400'); // 1 day for images
    }
  }
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

const Globals = require('./misc/globals.js');
new Globals();

let db;

/**
 * Main application entry point.
 * Initializes database connection, sets up middleware, registers routes, and starts the server.
 */
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

    const Auth = require('./api/AuthAPI.js');
    const auth = new Auth(app, db, passport);
    auth.registerRoutes();

    app.get('/dashboard', auth.isAuthenticated, (req, res) => {
      res.send(`<h1>Welcome to your dashboard, ${req.user.first_name}!</h1><a href="/logout">Logout</a>`);
    });

    const apiDir = path.join(__dirname, 'api');
    const apiFiles = fs.readdirSync(apiDir).filter(file => file.endsWith('.js') && file !== 'AuthAPI.js');

    for (const file of apiFiles) {
      const ApiClass = require(path.join(apiDir, file));
      const apiInstance = new ApiClass(app, db, passport);
      apiInstance.registerRoutes();
    }

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