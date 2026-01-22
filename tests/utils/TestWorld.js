const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('./db');
const Globals = require('../../server/misc/globals');
const TransactionsDB = require('../../server/db/transactionDB');

class TestWorld {
    constructor() {
        this.db = null;
        this.app = null;
        this.data = {
            users: {}, // alias -> id
            roles: {}, // name -> id
            events: {}, // alias -> id
            tags: {}, // name -> id
            perms: {} // slug -> id
        };
        this.globalInts = {};
        this.globalFloats = {};
        this.globalObjects = {};
    }

    async setUp() {
        this.db = await setupTestDb();
        this.app = express();
        this.app.use(express.json());

        this.app.use((req, res, next) => {
            req.db = this.db;
            const userAlias = req.headers['x-test-user'];
            if (userAlias && this.data.users[userAlias]) {
                req.isAuthenticated = () => true;
                req.user = { id: this.data.users[userAlias], email: `${userAlias}@test.com` };
            } else {
                req.isAuthenticated = () => false;
            }
            req.logout = (cb) => { if(cb) cb(); };
            next();
        });

        // Default Mocks
        vi.spyOn(Globals.prototype, 'getInt').mockImplementation((k) => this.globalInts[k] !== undefined ? this.globalInts[k] : 0);
        vi.spyOn(Globals.prototype, 'getFloat').mockImplementation((k) => this.globalFloats[k] !== undefined ? this.globalFloats[k] : 0);
        vi.spyOn(Globals.prototype, 'get').mockImplementation((k) => this.globalObjects[k]);
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

    async tearDown() {
        if (this.db) {
            await this.db.close();
        }
        vi.restoreAllMocks();
        this.globalInts = {};
        this.globalFloats = {};
        this.globalObjects = {};
    }

    // --- Global Mocks ---
    mockGlobalInt(key, value) {
        this.globalInts[key] = value;
    }
    
    mockGlobalFloat(key, value) {
        this.globalFloats[key] = value;
    }

    mockGlobalObject(key, valueContainer) {
        this.globalObjects[key] = valueContainer;
    }

    // --- Factories ---

    async createPermission(slug) {
        if (this.data.perms[slug]) return this.data.perms[slug];
        await this.db.run('INSERT OR IGNORE INTO permissions (slug) VALUES (?)', [slug]);
        const res = await this.db.get('SELECT id FROM permissions WHERE slug = ?', [slug]);
        this.data.perms[slug] = res.id;
        return res.id;
    }

    async createRole(name, permSlugs = []) {
        await this.db.run('INSERT OR IGNORE INTO roles (name) VALUES (?)', [name]);
        const role = await this.db.get('SELECT id FROM roles WHERE name = ?', [name]);
        this.data.roles[name] = role.id;

        for (const slug of permSlugs) {
            const permId = await this.createPermission(slug);
            await this.db.run('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role.id, permId]);
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
            start: start.toISOString(),
            end: end.toISOString(),
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

    // --- Request Helper ---
    
    as(userAlias) {
        return {
            get: (url) => request(this.app).get(url).set('x-test-user', userAlias),
            post: (url) => request(this.app).post(url).set('x-test-user', userAlias),
            delete: (url) => request(this.app).delete(url).set('x-test-user', userAlias),
            put: (url) => request(this.app).put(url).set('x-test-user', userAlias),
        };
    }
    
    get request() {
        return request(this.app);
    }
}

module.exports = TestWorld;
