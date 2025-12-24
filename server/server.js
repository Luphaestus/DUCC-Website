/**
 * Main server entry point for the DUCC Website.
 * Sets up Express, middleware (session, passport, static files), 
 * initializes database connections, and registers API routes.
 */

const PORT = process.env.PORT || 3000;

// Global error handler for unhandled promise rejections
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

// Middleware to parse JSON and URL-encoded request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory with basic caching for images
app.use(express.static('public', {
  maxAge: '1h',
  setHeaders: (res, path) => {
    if (path.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
      res.set('Cache-Control', 'public, max-age=86400'); // 1 day for images
    }
  }
}));

// Configure session management with SQLite storage
app.use(session({
  store: new SQLiteStore({
    db: 'database.db',
    dir: '.'
  }),
  secret: 'supersecretkey',
  resave: false,
  saveUninitialized: false,
}));

// Initialize Passport for authentication
app.use(passport.initialize());
app.use(passport.session());

// Initialize global variables/configuration
const Globals = require('./misc/globals.js');
new Globals();

let db;

/**
 * Async initialization block.
 * Connects to the database and registers all API routes before starting the server.
 */
(async () => {
  try {
    // Open the SQLite database
    db = await open({
      filename: 'database.db',
      driver: sqlite3.Database
    });

    console.log('Connected to the SQLite database.');

    // Basic health check endpoint
    app.get('/api/health', (req, res) => {
      res.status(200).send('OK');
    });

    // Initialize Authentication API specifically first as other routes might depend on it
    const Auth = require('./api/AuthAPI.js');
    const auth = new Auth(app, db, passport);
    auth.registerRoutes();

    // Example protected dashboard route
    app.get('/dashboard', auth.isAuthenticated, (req, res) => {
      res.send(`<h1>Welcome to your dashboard, ${req.user.first_name}!</h1><a href="/logout">Logout</a>`);
    });

    // Dynamically load and register all other API route modules from the 'api' directory
    const apiDir = path.join(__dirname, 'api');
    const apiFiles = fs.readdirSync(apiDir).filter(file => file.endsWith('.js') && file !== 'AuthAPI.js');

    for (const file of apiFiles) {
      const ApiClass = require(path.join(apiDir, file));
      const apiInstance = new ApiClass(app, db, passport);
      apiInstance.registerRoutes();
    }

    // Catch-all route to serve the SPA (Single Page Application) frontend
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    // Start listening for incoming requests
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log('Press Ctrl+C to stop the server.');
    });

  } catch (err) {
    console.error(err.message);
  }
})();