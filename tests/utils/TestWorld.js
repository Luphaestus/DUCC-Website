/**
 * TestWorld.js
 * 
 * Test environment utility.
 */

import { setupTestDb } from './db.js';
import Globals from '../../server/misc/globals.js';
import TransactionsDB from '../../server/db/transactionDB.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class TestWorld {
    constructor() {
        this.db = null;
        this.app = null;
        this.data = {
            users: {}, 
            roles: {},   
            events: {},  
            tags: {},   
            perms: {}  
        };
        this.globalInts = {};
        this.globalFloats = {};
        this.globalObjects = {};
    }

    /** Initialize test environment. */
    async setUp() {
        this.db = await setupTestDb();
        
        const Fastify = (await import('fastify')).default;
        const fastifyCookie = (await import('@fastify/cookie')).default;
        const fastifySession = (await import('@fastify/session')).default;
        const fastifyPassport = (await import('@fastify/passport')).default;
        const fastifyStatic = (await import('@fastify/static')).default;
        const fastifyMultipart = (await import('@fastify/multipart')).default;

        this.app = Fastify();
        
        this.app.setErrorHandler((error, request, reply) => {
            console.error('Fastify Test Error:', error);
            reply.status(500).send({ message: error.message });
        });

        await this.app.register(fastifyMultipart);
        await this.app.register(fastifyCookie);
        await this.app.register(fastifySession, { 
            secret: 'test-secret-must-be-long-enough-for-session-plugin', 
            cookieName: 'ducc_sid',
            saveUninitialized: true,
            cookie: { secure: false }
        });
        await this.app.register(fastifyPassport.initialize());
        await this.app.register(fastifyPassport.secureSession());

        // Register static for reply.sendFile support
        await this.app.register(fastifyStatic, {
            root: path.join(__dirname, '..', '..', 'public'),
            prefix: '/public/',
        });

        /** Auth Simulation Middleware. */
        this.app.addHook('preHandler', async (request) => {
            request.db = this.db;
            const userAlias = request.headers['x-test-user'];
            if (userAlias && this.data.users[userAlias]) {
                request.isAuthenticated = () => true;
                const userId = this.data.users[userAlias];
                const user = await this.db.get('SELECT * FROM users WHERE id = ?', [userId]);
                request.user = user || { id: userId, email: `${userAlias}@test.com` };
            } else {
                request.isAuthenticated = () => false;
            }
            request.logOut = async () => {};
        });

        // Global Configuration Mocks
        vi.spyOn(Globals.prototype, 'getInt').mockImplementation((k) => {
            if (this.globalInts[k] !== undefined) return this.globalInts[k];
            if (k === 'Unauthorized_max_difficulty') return 2;
            return 0;
        });
        vi.spyOn(Globals.prototype, 'getFloat').mockImplementation((k) => this.globalFloats[k] !== undefined ? this.globalFloats[k] : 0);
        vi.spyOn(Globals.prototype, 'get').mockImplementation((k) => {
            if (k === 'DefaultEventImage') {
                return this.globalObjects[k] || { data: '/images/misc/ducc.png' };
            }
            return this.globalObjects[k];
        });
        vi.spyOn(Globals.prototype, 'getAll').mockImplementation(() => this.globalObjects);
        vi.spyOn(Globals.prototype, 'getKeys').mockImplementation((keys, permission) => {
            const validPermissions = ['Guest', 'Authenticated', 'President'];
            const allowedPermissions = validPermissions.slice(0, validPermissions.indexOf(permission) + 1);
            const result = {};
            for (const key of keys) {
                if (this.globalObjects[key] && allowedPermissions.includes(this.globalObjects[key].permission)) {
                    result[key] = this.globalObjects[key];
                }
            }
            return result;
        });
        vi.spyOn(Globals.prototype, 'set').mockImplementation((k, v) => {
            if (this.globalObjects[k]) {
                const regexp = new RegExp(this.globalObjects[k].regexp);
                if (!regexp.test(v.toString())) throw new Error(this.globalObjects[k].error);
                this.globalObjects[k].data = v;
            }
        });
    }

    /** Cleanup test environment. */
    async tearDown() {
        if (this.app) {
            await this.app.close();
        }
        vi.restoreAllMocks();
        this.globalInts = {};
        this.globalFloats = {};
        this.globalObjects = {};
    }

    // --- State Control Helpers ---

    mockGlobalInt(key, value) {
        this.globalInts[key] = value;
    }
    
    mockGlobalFloat(key, value) {
        this.globalFloats[key] = value;
    }

    mockGlobalObject(key, valueContainer) {
        this.globalObjects[key] = valueContainer;
    }

    // Entity

    async createPermission(slug) {
        if (this.data.perms[slug]) return this.data.perms[slug];
        await this.db.run('INSERT IGNORE INTO permissions (slug) VALUES (?)', [slug]);
        const res = await this.db.get('SELECT id FROM permissions WHERE slug = ?', [slug]);
        this.data.perms[slug] = res.id;
        return res.id;
    }

    async createRole(name, permSlugs = []) {
        await this.db.run('INSERT IGNORE INTO roles (name) VALUES (?)', [name]);
        const role = await this.db.get('SELECT id FROM roles WHERE name = ?', [name]);
        this.data.roles[name] = role.id;

        for (const slug of permSlugs) {
            const permId = await this.createPermission(slug);
            await this.db.run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, permId]);
        }
        return role.id;
    }

    async createUser(alias, overrides = {}, roleNames = []) {
        const defaultUser = {
            email: `${alias}@test.com`,
            first_name: alias,
            last_name: 'User',
            college_id: 1,
            difficulty_level: 1,
            is_member: 0,
            filled_legal_info: 1,
            free_sessions: 3,
            is_instructor: 0
        };
        const userData = { ...defaultUser, ...overrides };
        
        const keys = Object.keys(userData);
        const values = Object.values(userData);
        const placeholders = keys.map(() => '?').join(',');
        
        const res = await this.db.run(
            `INSERT INTO users (${keys.join(',')}) VALUES (${placeholders})`, 
            values
        );
        this.data.users[alias] = res.lastID;

        for (const roleName of roleNames) {
            const roleId = this.data.roles[roleName];
            if (roleId) {
                await this.db.run('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [res.lastID, roleId]);
            }
        }
        return res.lastID;
    }

    async createEvent(alias, overrides = {}) {
        const now = new Date();
        const start = new Date(now); start.setDate(start.getDate() + 1);
        const end = new Date(start); end.setHours(end.getHours() + 2);

        const defaultEvent = {
            title: alias,
            start: start.toISOString().slice(0, 19).replace('T', ' '),
            end: end.toISOString().slice(0, 19).replace('T', ' '),
            difficulty_level: 1,
            max_attendees: 10,
            upfront_cost: 0,
            is_canceled: 0
        };
        const eventData = { ...defaultEvent, ...overrides };
        const keys = Object.keys(eventData);
        const values = Object.values(eventData);
        const placeholders = keys.map(() => '?').join(',');

        const res = await this.db.run(
            `INSERT INTO events (${keys.join(',')}) VALUES (${placeholders})`, 
            values
        );
        this.data.events[alias] = res.lastID;
        return res.lastID;
    }

    async createTag(alias, overrides = {}) {
        const defaultTag = {
            name: alias,
            color: '#000000',
            description: '',
            min_difficulty: 1
        };
        const tagData = { ...defaultTag, ...overrides };
        const keys = Object.keys(tagData);
        const values = Object.values(tagData);
        const placeholders = keys.map(() => '?').join(',');

        const res = await this.db.run(
             `INSERT INTO tags (${keys.join(',')}) VALUES (${placeholders})`, 
            values
        );
        this.data.tags[alias] = res.lastID;
        return res.lastID;
    }

    async createFile(title, overrides = {}) {
        const defaultFile = {
            title: title,
            filename: `${title}.jpg`,
            hash: title,
            visibility: 'members',
            size: 1024
        };
        const fileData = { ...defaultFile, ...overrides };
        const keys = Object.keys(fileData);
        const values = Object.values(fileData);
        const placeholders = keys.map(() => '?').join(',');

        const res = await this.db.run(
            `INSERT INTO files (${keys.join(',')}) VALUES (${placeholders})`,
            values
        );
        return res.lastID;
    }

    async assignTag(type, entityAlias, tagAlias) {
        const tagId = this.data.tags[tagAlias];
        if (type === 'event') {
            const eventId = this.data.events[entityAlias];
            await this.db.run('INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)', [eventId, tagId]);
        } else if (type === 'user_managed') {
            const userId = this.data.users[entityAlias];
            await this.db.run('INSERT INTO user_managed_tags (user_id, tag_id) VALUES (?, ?)', [userId, tagId]);
        }
    }

    async addTransaction(userAlias, amount, description = 'Test', eventId = null) {
        const userId = this.data.users[userAlias];
        await TransactionsDB.add_transaction(this.db, userId, amount, description, eventId);
    }
    
    async joinEvent(userAlias, eventAlias) { 
         const eventId = this.data.events[eventAlias];
         const userId = this.data.users[userAlias];
         await this.db.run('INSERT INTO event_attendees (event_id, user_id) VALUES (?, ?)', [eventId, userId]);
    }

    /** Get current week ISO date. */
    getCurrentWeekDate() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - (day === 0 ? 6 : day - 1); // diff to Monday
        const monday = new Date(now.setDate(diff));
        monday.setHours(12, 0, 0, 0); // Midday Monday
        return monday.toISOString().slice(0, 19).replace('T', ' ');
    }

    /** Set the app instance for injection. */
    setApp(app) {
        this.app = app;
    }

    /** Impersonate user using fastify.inject. */
    as(userAlias) {
        if (!this.app) throw new Error('App not set in TestWorld');
        return {
            get: (url) => this.app.inject({ method: 'GET', url, headers: { 'x-test-user': userAlias } }),
            post: (url, payload) => this.app.inject({ method: 'POST', url, payload, headers: { 'x-test-user': userAlias } }),
            delete: (url, payload) => this.app.inject({ method: 'DELETE', url, payload, headers: { 'x-test-user': userAlias } }),
            put: (url, payload) => this.app.inject({ method: 'PUT', url, payload, headers: { 'x-test-user': userAlias } }),
        };
    }
    
    /** Simple guest requester. */
    get request() {
        if (!this.app) throw new Error('App not set in TestWorld');
        return {
            get: (url) => this.app.inject({ method: 'GET', url }),
            post: (url, payload) => this.app.inject({ method: 'POST', url, payload }),
            delete: (url, payload) => this.app.inject({ method: 'DELETE', url, payload }),
            put: (url, payload) => this.app.inject({ method: 'PUT', url, payload }),
        };
    }
}
