/**
 * config.ts
 * 
 * Centralized configuration for the application.
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');

interface Config {
    domain: string;
    paths: {
        root: string;
        data: string;
        files: string;
        db: string;
        globals: string;
    };
    session: {
        cookieName: string;
        secret: string;
    };
    auth: {
        bcryptSaltRounds: number;
    };
    mysql: {
        host: string;
        user: string;
        password: string;
        rootPassword: string;
        database: string;
        port: number;
        waitForConnections: boolean;
        connectionLimit: number;
        queueLimit: number;
    };
    email: {
        user: string | null;
        pass: string | null;
        test_destination: string | null;
        clientId: string | null;
        clientSecret: string | null;
        refreshToken: string | null;
    };
}

const config: Config = {
    domain: process.env.DOMAIN_NAME || process.env.DOMAIN || 'localhost',
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
    },
    auth: {
        bcryptSaltRounds: process.env.NODE_ENV === 'test' ? 1 : 10,
    },
    mysql: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        rootPassword: process.env.DB_ROOT_PASSWORD || 'root_password',
        database: (process.env.NODE_ENV === 'test' ? 'ducc_test' : (process.env.DB_NAME || 'ducc_website')) + (process.env.VITEST_WORKER_ID ? `_${process.env.VITEST_WORKER_ID}` : ''),
        port: parseInt(process.env.DB_PORT || '3306', 10),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    },
    email: {
        user: process.env.EMAIL_USER || null,
        pass: process.env.EMAIL_PASS || null,
        test_destination: process.env.EMAIL_TEST_DESTINATION || null,
        clientId: process.env.GMAIL_CLIENT_ID || null,
        clientSecret: process.env.GMAIL_CLIENT_SECRET || null,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN || null
    }
};

export default config;