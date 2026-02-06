/**
 * server.ts
 * 
 * Main application entry point. Configures Fastify, MySQL, security, sessions, and API routes.
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import fastifyMultipart from '@fastify/multipart';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import fastifyPassport from '@fastify/passport';
import fastifyRateLimit from '@fastify/rate-limit';
import middie from '@fastify/middie';
import colors from 'ansi-colors';
import cliProgress from 'cli-progress';

import { connect, DatabaseWrapper } from './db/db.js';
import MySQLStore from './misc/SessionStore.js';
import Globals from './misc/globals.js';
import Logger from './misc/Logger.js';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000');

/** Catch and log unhandled promise rejections for debugging. */
process.on('unhandledRejection', (reason, promise) => {
  Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const isDev = process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production';

if (isProd && !config.session.secret) {
  Logger.error(colors.red('FATAL: SESSION_SECRET must be defined in production environment.'));
  process.exit(1);
}

const fastify = Fastify({
  logger: false, // We use our own Logger
});

/** Decorate request with DB */
let db: DatabaseWrapper;

/** Bootstraps server: connects DB, registers routes, starts listening. */
const startServer = async () => {
  try {
    db = await connect(config.mysql);

    if (isProd) {
      Logger.info(`Connected to the MySQL database at ${config.mysql.host}.`);
    }

    // Register plugins
    await fastify.register(middie);
    await fastify.register(fastifyFormbody);
    await fastify.register(fastifyMultipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      }
    });
    await fastify.register(fastifyCookie);
    
    const sessionStore = new MySQLStore(db);
    // Periodically clean up expired sessions (every hour)
    setInterval(() => sessionStore.clearExpiredSessions().catch(() => {}), 3600000);

    await fastify.register(fastifySession, {
      secret: config.session.secret,
      cookieName: config.session.cookieName,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
      }
    });

    await fastify.register(fastifyPassport.initialize());
    await fastify.register(fastifyPassport.secureSession());

    /** Static file serving - Register BEFORE routes so reply.sendFile is available */
    await fastify.register(fastifyStatic, {
      root: [path.join(__dirname, '..', 'dist'), path.join(__dirname, '..', 'public')],
      prefix: '/',
      wildcard: false,
      setHeaders: (res, filePath) => {
        if (isDev) {
          // Disable caching entirely in development for all files
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          // In production, cache images and assets for a long time
          if (filePath.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|js|css|woff2?|ttf|otf)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          } else if (filePath.endsWith('index.html')) {
            // Never cache index.html so updates are immediate
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          }
        }
      }
    });

    fastify.decorateRequest('db', null);
    fastify.addHook('preHandler', async (request) => {
      (request as any).db = db;
    });

    /** Rate Limiting */
    await fastify.register(fastifyRateLimit, {
      global: true,
      max: 10000,
      timeWindow: '15m'
    });

    /** Security Headers & CSP */
    fastify.addHook('onSend', async (request, reply, payload) => {
      if (payload === null || payload === undefined || (request.url.startsWith('/api/files/') && request.url.endsWith('/download'))) {
        return payload;
      }

      let csp = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; img-src 'self' data: blob:; font-src 'self' https://fonts.scalar.com https://fonts.gstatic.com; frame-src 'self' https://www.google.com; connect-src 'self' blob: https://proxy.scalar.com https://api.scalar.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";

      if (isDev) {
        csp = csp.replace("script-src 'self'", "script-src 'self' http://localhost:35729 http://localhost:3000");
        csp = csp.replace("connect-src 'self'", "connect-src 'self' ws://localhost:35729 http://localhost:3000");
      }

      reply.header("Content-Security-Policy", csp);
      reply.header("X-Frame-Options", "DENY");
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("Referrer-Policy", "strict-origin-when-cross-origin");
      reply.header("X-Powered-By", ""); // Fastify doesn't add this by default but just in case
      
      return payload;
    });

    /** Configure LiveReload for faster frontend development in dev mode. */
    if (isDev) {
      try {
        const livereload = (await import('livereload')).default;
        const connectLiveReload = (await import('connect-livereload')).default;

        const liveReloadServer = livereload.createServer({
          host: 'localhost',
          port: 35729,
          debug: false,
          delay: 500
        });
        
        const watchDirs = [
          path.join(__dirname, '..', 'public'),
          path.join(__dirname, '..', 'dist')
        ];
        liveReloadServer.watch(watchDirs);
        
        Logger.info(`LiveReload server started, watching: ${watchDirs.join(', ')}`);
        
        // Use middie to support connect-style middleware
        (fastify as any).use(connectLiveReload({
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
      } catch (e: any) {
        Logger.warn('LiveReload not available.');
      }
    }

    /** CSRF Protection (Modern Double Submit Cookie Implementation) */
    if (isProd) {
      fastify.addHook('preHandler', async (request, reply) => {
        // Generate token if it doesn't exist in session
        let token = (request.session as any).get('csrfToken');
        if (!token) {
          token = crypto.randomBytes(32).toString('hex');
          (request.session as any).set('csrfToken', token);
        }

        // Set token in a client-readable cookie
        reply.setCookie('XSRF-TOKEN', token, { 
          httpOnly: false, 
          sameSite: 'lax',
          secure: isProd,
          path: '/'
        });

        // Verify token for state-changing methods
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        if (!safeMethods.includes(request.method)) {
          const headerToken = request.headers['x-csrf-token'];
          if (!token || !headerToken || headerToken !== token) {
            return reply.status(403).send({ message: 'Invalid or missing CSRF token' });
          }
        }
      });
    }

    new Globals();

    fastify.get('/api/health', async (request, reply) => {
      return { ok: true };
    });

    fastify.get('/api/updates', async (request: any, reply: FastifyReply) => {
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      const EventHub = (await import('./misc/EventHub.js')).default;
      EventHub.addClient(reply.raw as any, request.user?.id);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        reply.raw.write(': heartbeat\n\n');
      }, 30000);

      request.raw.on('close', () => {
        clearInterval(heartbeat);
      });
    });

    const Auth = (await import('./api/AuthAPI.js')).default;
    const auth = new Auth(fastify, db, fastifyPassport);
    auth.registerRoutes();

    /** Recursive helper to find all API definition files. */
    const getAllApiFiles = (dir: string, fileList: string[] = []) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const dirent of files) {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
          getAllApiFiles(fullPath, fileList);
        } else if (dirent.isFile() && (dirent.name.endsWith('.js') || dirent.name.endsWith('.ts')) && !dirent.name.endsWith('.d.ts') && !dirent.name.startsWith('AuthAPI.')) {
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
        const apiInstance = new ApiClass(fastify, db, fastifyPassport);
        apiInstance.registerRoutes();
      }
      progressBar.stop();
    } else {
      for (const fullPath of apiFiles) {
        const ApiClass = (await import(pathToFileURL(fullPath).href)).default;
        const apiInstance = new ApiClass(fastify, db, fastifyPassport);
        apiInstance.registerRoutes();
      }
    }

    /** Catch-all route for SPA. */
    fastify.setNotFoundHandler(async (request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.status(404).send({ message: 'Not Found' });
      }

      // Try to serve static file if it looks like one (has an extension)
      const pathname = decodeURIComponent(request.url.split('?')[0]);
      if (pathname.includes('.') && pathname.length > 1) {
        try {
          return await reply.sendFile(pathname.startsWith('/') ? pathname.slice(1) : pathname);
        } catch (e) {
          return reply.status(404).send({ message: 'Not Found' });
        }
      }

      if (isDev) {
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        reply.header('Pragma', 'no-cache');
        reply.header('Expires', '0');
      }

      const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
      
      // In development, wait for the file to exist (Vite might be rebuilding)
      if (isDev && !fs.existsSync(distIndex)) {
        Logger.info(`Waiting for index.html to be built...`);
        for (let i = 0; i < 30; i++) { // Wait up to 3 seconds
          if (fs.existsSync(distIndex)) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (fs.existsSync(distIndex)) {
        return reply.status(200).sendFile('index.html', path.join(__dirname, '..', 'dist'));
      } else {
        if (isDev) {
          Logger.warn(`SPA fallback: index.html not found in dist after waiting. URL: ${request.url}`);
          return reply.status(404).type('text/html').send('<h1>404 - Client not built</h1><p>Vite might still be building the client. Please wait and reload.</p>');
        }
        return reply.status(404).send({ message: 'Not Found' });
      }
    });

    if (process.env.NODE_ENV !== 'test') {
      await fastify.listen({ port: PORT, host: '0.0.0.0' });
      Logger.info(`Server is running on http://localhost:${PORT}`);
    }

    return { fastify, db };
  } catch (err: any) {
    Logger.error(err.message);
    throw err;
  }
};

const serverReady = startServer();

serverReady.then(async ({ db }) => {
  if (process.env.ENABLE_SIMULATOR === 'true') {
    const { ActivitySimulator } = await import('./misc/ActivitySimulator.js');
    const simulator = new ActivitySimulator(db);
    simulator.start();
  }
});

export { fastify as app, serverReady };
