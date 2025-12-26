/**
 * Main server entry point. Sets up Express, middleware, database, and routes.
 */

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

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with image caching
app.use(express.static('public', {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
      res.set('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Session management with SQLite storage
app.use(session({
  store: new SQLiteStore({
    db: 'database.db',
    dir: '.'
  }),
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
}));

// Passport authentication
app.use(passport.initialize());
app.use(passport.session());

// Global configuration
const Globals = require('./misc/globals.js');
new Globals();

let db;

/**
 * Initialize database, register routes, and start server.
 */
(async () => {
  try {
    const dbPath = process.env.DATABASE_PATH || 'database.db';
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    console.log(`Connected to the SQLite database at ${dbPath}.`);

    app.get('/api/health', (req, res) => {
      res.status(200).send('OK');
    });

    // Register Auth API first
    const Auth = require('./api/AuthAPI.js');
    const auth = new Auth(app, db, passport);
    auth.registerRoutes();

    app.get('/dashboard', auth.isAuthenticated, (req, res) => {
      res.send(`<h1>Welcome to your dashboard, ${req.user.first_name}!</h1><a href="/logout">Logout</a>`);
    });

    // Register remaining API modules dynamically
    const apiDir = path.join(__dirname, 'api');
    const apiFiles = fs.readdirSync(apiDir).filter(file => file.endsWith('.js') && file !== 'AuthAPI.js');

    for (const file of apiFiles) {
      const ApiClass = require(path.join(apiDir, file));
      const apiInstance = new ApiClass(app, db, passport);
      apiInstance.registerRoutes();
    }

    // SPA catch-all route
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