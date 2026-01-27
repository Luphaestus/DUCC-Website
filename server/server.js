/**
 * server.js
 * 
 * Main application entry point that configures Express, connects to SQLite, 
 * handles security headers, sessions, and dynamically registers API routes.
 */

const PORT = process.env.PORT || 3000;

/** Catch and log unhandled promise rejections for debugging. */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

import path from 'path';
import express from 'express';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
const SQLiteStore = connectSqlite3(session);
import passport from 'passport';
import fs from 'fs';
import livereload from "livereload";
import connectLiveReload from "connect-livereload";
import { fileURLToPath } from 'url';
import Globals from './misc/globals.js';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import csurf from 'csurf';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const isDev = process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production';

if (isProd && !process.env.SESSION_SECRET) {
  console.error(colors.red('FATAL: SESSION_SECRET must be defined in production environment.'));
  process.exit(1);
}

/** Trust proxy for header-based auth if behind a load balancer. */
app.set('trust proxy', 1);
/** Disable header for mild obfuscation. */
app.disable('x-powered-by');

/** Configure LiveReload for faster frontend development in dev mode. */
if (isDev) {
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

/** Rate Limiting */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  standardHeaders: true,
  legacyHeaders: false, 
});
app.use(limiter);

/** Security Middleware: Sets CSP and other security-related HTTP headers. */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/files/') && req.path.endsWith('/download')) {
    return next();
  }

  let csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.scalar.com https://fonts.gstatic.com; frame-src 'self' https://www.google.com; connect-src 'self' https://proxy.scalar.com https://api.scalar.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";
  
  if (isDev) {
    csp = csp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline' http://localhost:35729");
    csp = csp.replace("connect-src 'self'", "connect-src 'self' ws://localhost:35729");
  }

  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/** Static file serving with appropriate caching policies. */
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

/** Session Management using connect-sqlite3. */
app.use(session({
  store: new SQLiteStore({
    db: dbFile,
    dir: dbDir
  }),
  secret: process.env.SESSION_SECRET || 'dev-secret-key-change-me-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'prod',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(passport.initialize());
app.use(passport.session());

/** CSRF Protection */
if (process.env.NODE_ENV !== 'test') {
    app.use(csurf());
    app.use((req, res, next) => {
        const token = req.csrfToken();
        res.cookie('XSRF-TOKEN', token);
        res.locals.csrfToken = token;
        next();
    });
}

new Globals();

let db;

/** Bootstraps the server: connects to DB, registers routes, and starts listening. */
const startServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

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
      res.status(200).json({ ok: true });
    });

    const Auth = (await import('./api/AuthAPI.js')).default;
    const auth = new Auth(app, db, passport);
    auth.registerRoutes();

    /** Recursive helper to find all API definition files. */
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

    const apiDir = path.join(__dirname, 'api');
    const apiFiles = getAllApiFiles(apiDir);
    
    /** Dynamically register all API modules. */
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
            
            const ApiClass = (await import(fullPath)).default;
            const apiInstance = new ApiClass(app, db, passport);
            apiInstance.registerRoutes();
        }
        progressBar.stop();
    } else {
        for (const fullPath of apiFiles) {
            const ApiClass = (await import(fullPath)).default;
            const apiInstance = new ApiClass(app, db, passport);
            apiInstance.registerRoutes();
        }
    }

    /** Catch-all route for SPA. */
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    if (import.meta.url === `file://${process.argv[1]}`) {
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

export { app, serverReady };
