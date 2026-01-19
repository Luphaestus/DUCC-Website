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
const fs = require('fs');
const livereload = require("livereload");
const connectLiveReload = require("connect-livereload");
const app = express();

const isDev = process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development';

app.set('trust proxy', 1);
app.disable('x-powered-by');

if (isDev) {
  const livereload = require("livereload");
  const connectLiveReload = require("connect-livereload");
  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch(path.join(__dirname, '..', 'public'));
  app.use(connectLiveReload({
    ignore: [
      /^\/api\/.*/,
      /\.js$/,
      /\.css$/,
      /\.svg$/,
      /\.ico$/,
      /\.jpg$/,
      /\.jpeg$/,
      /\.png$/,
      /\.pdf$/,
      /\.docx?$/,
      /\.xlsx?$/,
      /\.zip$/,
      /\.mp4$/
    ]
  }));
}

// Security Headers (CSP)
app.use((req, res, next) => {
  // Skip security headers for file downloads to prevent interference with browser PDF viewers/plugins
  if (req.path.startsWith('/api/files/') && req.path.endsWith('/download')) {
    return next();
  }

  let csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-src 'self' https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";
  
  if (isDev) {
    // Allow livereload in dev
    csp = csp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline' http://localhost:35729");
    csp += " connect-src 'self' ws://localhost:35729;";
  }

  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with image caching (disabled in dev)
app.use(express.static('public', {
  maxAge: isDev ? '0' : '1h',
  setHeaders: (res, path) => {
    if (isDev) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else if (path.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
      res.set('Cache-Control', 'public, max-age=86400');
    }
  }
}));

const dbPath = process.env.DATABASE_PATH || 'data/database.db';
const dbDir = path.dirname(dbPath);
const dbFile = path.basename(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Session management with SQLite storage
app.use(session({
  store: new SQLiteStore({
    db: dbFile,
    dir: dbDir
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-me-in-prod',
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

    // Enable WAL mode and busy timeout
    await db.exec('PRAGMA journal_mode = WAL;');
    await db.exec('PRAGMA busy_timeout = 5000;');

    if (process.env.NODE_ENV !== 'test') {
      console.log(`Connected to the SQLite database at ${dbPath}.`);
    }

    app.use((req, res, next) => {
      req.db = db;
      next();
    });

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
    
    const cliProgress = require('cli-progress');
    const colors = require('ansi-colors');

    const getAllApiFiles = (dir, fileList = []) => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const dirent of files) {
            const fullPath = path.join(dir, dirent.name);
            if (dirent.isDirectory()) {
                getAllApiFiles(fullPath, fileList);
            } else if (dirent.isFile() && dirent.name.endsWith('.js') && dirent.name !== 'AuthAPI.js') {
                fileList.push(fullPath);
            }
        }
        return fileList;
    };

    const apiFiles = getAllApiFiles(apiDir);
    
    if (process.env.NODE_ENV !== 'test' && apiFiles.length > 0) {
        console.log(colors.cyan('Registering API modules...'));
        const progressBar = new cliProgress.SingleBar({
            format: colors.cyan('APIs |') + colors.cyan('{bar}') + '| {percentage}% || {value}/{total} Modules || {file}',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        });

        progressBar.start(apiFiles.length, 0, { file: 'Initializing...' });

        for (let i = 0; i < apiFiles.length; i++) {
            const fullPath = apiFiles[i];
            const fileName = path.basename(fullPath);
            progressBar.update(i + 1, { file: fileName });
            
            const ApiClass = require(fullPath);
            const apiInstance = new ApiClass(app, db, passport);
            apiInstance.registerRoutes();
        }
        progressBar.stop();
    } else {
        // Fallback for tests or no files
        for (const fullPath of apiFiles) {
            const ApiClass = require(fullPath);
            const apiInstance = new ApiClass(app, db, passport);
            apiInstance.registerRoutes();
        }
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

const serverReady = startServer();

module.exports = app;
module.exports.serverReady = serverReady;
