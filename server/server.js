/**
 * server.js
 * 
* Main application entry point. Configures Express, SQLite, security, sessions, and API routes.
 */

const PORT = process.env.PORT || 3000;

/** Catch and log unhandled promise rejections for debugging. */
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

import path from 'path';
import express from 'express';
import { connect } from './db/db.js';
import session from 'express-session';
import expressMySQLSession from 'express-mysql-session';
const MySQLStore = expressMySQLSession(session);
import passport from 'passport';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import Globals from './misc/globals.js';
import cliProgress from 'cli-progress';
import colors from 'ansi-colors';
import csurf from 'csurf';
import rateLimit from 'express-rate-limit';
import Logger from './misc/Logger.js';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const isDev = process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production';

if (isProd && !config.session.secret) {
  Logger.error(colors.red('FATAL: SESSION_SECRET must be defined in production environment.'));
  process.exit(1);
}


/** Disable header for mild obfuscation. */
app.disable('x-powered-by');

/** Configure LiveReload for faster frontend development in dev mode. */
if (isDev) {
  try {
    const livereload = (await import('livereload')).default;
    const connectLiveReload = (await import('connect-livereload')).default;

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
  } catch (e) {
    Logger.warn('LiveReload not available.');
  }
}

/** Rate Limiting */
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { message: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(standardLimiter);
app.use('/api/auth/', strictLimiter);

/** Security Middleware: Sets CSP and other security-related HTTP headers. */
app.use((req, res, next) => {
  if (req.path.startsWith('/api/files/') && req.path.endsWith('/download')) {
    return next();
  }

  let csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.scalar.com https://fonts.gstatic.com; frame-src 'self' https://www.google.com; connect-src 'self' blob: https://proxy.scalar.com https://api.scalar.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";

  if (isDev) {
    csp = csp.replace("script-src 'self'", "script-src 'self' http://localhost:35729 http://localhost:3000");
    csp = csp.replace("connect-src 'self'", "connect-src 'self' ws://localhost:35729 http://localhost:3000");
  }

  res.setHeader("Content-Security-Policy", csp);
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/** Static file serving with caching policies. */
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

const sessionStore = new MySQLStore(config.mysql);

/** Session Management using express-mysql-session. */
app.use(session({
  name: config.session.cookieName,
  store: sessionStore,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(passport.initialize());
app.use(passport.session());

/** CSRF Protection */
if (isProd) {
  app.use(csurf());
  app.use((req, res, next) => {
    const token = req.csrfToken();
    res.cookie('XSRF-TOKEN', token, { httpOnly: false });
    res.locals.csrfToken = token;
    next();
  });
}

new Globals();

let db;

/** Bootstraps server: connects DB, registers routes, starts listening. */
const startServer = async () => {
  try {
    db = await connect(config.mysql);

    if (isProd) {
      Logger.info(`Connected to the MySQL database at ${config.mysql.host}.`);
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
    if (isProd && apiFiles.length > 0) {
      Logger.info('Registering API modules...');
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

        const ApiClass = (await import(pathToFileURL(fullPath).href)).default;
        const apiInstance = new ApiClass(app, db, passport);
        apiInstance.registerRoutes();
      }
      progressBar.stop();
    } else {
      for (const fullPath of apiFiles) {
        const ApiClass = (await import(pathToFileURL(fullPath).href)).default;
        const apiInstance = new ApiClass(app, db, passport);
        apiInstance.registerRoutes();
      }
    }

    /** Catch-all route for SPA. */
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    app.listen(PORT, () => {
      Logger.info(`Server is running on http://localhost:${PORT}`);
      Logger.info('Press Ctrl+C to stop the server.');
    });

    return { app, db };
  } catch (err) {
    Logger.error(err.message);
    throw err;
  }
};

const serverReady = startServer();

export { app, serverReady };