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

// Trust the reverse proxy (Caddy)
app.set('trust proxy', 1);

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

const dbPath = process.env.DATABASE_PATH || 'database.db';
const dbDir = path.dirname(dbPath);
const dbFile = path.basename(dbPath);

// Session management with SQLite storage
app.use(session({
  store: new SQLiteStore({
    db: dbFile,
    dir: dbDir
  }),
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'prod', // Secure cookies in production
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
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
const startServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable WAL mode and busy timeout to prevent "database is locked" errors
    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA busy_timeout = 5000;');

    if (process.env.NODE_ENV !== 'test') {
      console.log(`Connected to the SQLite database at ${dbPath}.`);
    }

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

    if (require.main === module) {
      app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
        console.log('Press Ctrl+C to stop the server.');
      });
    }

    return { app, db };
  } catch (err) {
    console.error(err.message);
    throw err;
  }
};

// Export the app immediately, and the initialization promise
const serverReady = startServer();

module.exports = app;
module.exports.serverReady = serverReady;
