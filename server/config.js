/**
 * config.js
 * 
 * Centralized configuration for the application.
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');

const config = {
    paths: {
        root: PROJECT_ROOT,
        data: process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : path.join(PROJECT_ROOT, './data'),
        files: path.join(PROJECT_ROOT, './data/files'),
        db: process.env.DATABASE_PATH || path.join(PROJECT_ROOT, './data/database.db'),
        globals: path.join(PROJECT_ROOT, './data/globals.json'),
    },
    session: {
        cookieName: 'ducc_sid',
        secret: process.env.SESSION_SECRET || 'dev-secret-key-change-me-in-prod',
    }
};

export default config;
