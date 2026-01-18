const { setupTestDb } = require('../utils/db');
const { seedData } = require('../../server/db/init/seed.js');
const { Permissions } = require('../../server/misc/permissions.js');

describe('Permissions Logic Abuse', () => {
    let db;

    beforeEach(async () => {
        db = await setupTestDb();
        
        // Manual seed of roles/permissions needed for tests
        await db.run("INSERT INTO roles (name) VALUES ('Social Secretary (Durham)'), ('Admin'), ('ScopedAdmin')");
        const socialRole = await db.get("SELECT id FROM roles WHERE name = 'Social Secretary (Durham)'");
        
        await db.run("INSERT INTO permissions (slug) VALUES ('event.manage.scoped'), ('event.manage.all'), ('user.manage'), ('transaction.manage'), ('event.write.scoped')");
        const scopedPerm = await db.get("SELECT id FROM permissions WHERE slug = 'event.manage.scoped'");
        
        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [socialRole.id, scopedPerm.id]);

        await db.run("INSERT INTO tags (name) VALUES ('socials'), ('slalom')");
        const socialsTag = await db.get("SELECT id FROM tags WHERE name = 'socials'");
        
        await db.run("INSERT INTO role_managed_tags (role_id, tag_id) VALUES (?, ?)", [socialRole.id, socialsTag.id]);
    });

    afterEach(async () => {
        await db.close();
    });

    test('hasPermission returns false for invalid user', async () => {
        const has = await Permissions.hasPermission(db, 99999, 'user.manage');
        expect(has).toBe(false);
    });

    test('Normal user has no admin permissions', async () => {
        // Create normal user
        const res = await db.run("INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level) VALUES (?, ?, ?, ?, ?)", ['normal@test.com', 'hash', 'Normal', 'User', 1]);
        const userId = res.lastID;

        const has = await Permissions.hasPermission(db, userId, 'user.manage');
        expect(has).toBe(false);
    });

    test('Scoped admin has scoped permission but not global', async () => {
        // Create user
        const res = await db.run("INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level) VALUES (?, ?, ?, ?, ?)", ['scope@test.com', 'hash', 'Scoped', 'Admin', 5]);
        const userId = res.lastID;

        // Assign Social Sec role (scoped)
        const socialRole = await db.get("SELECT id FROM roles WHERE name LIKE 'Social%'");
        if (!socialRole) throw new Error("Social role not found in seed");
        
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, socialRole.id]);

        const hasScoped = await Permissions.hasPermission(db, userId, 'event.manage.scoped');
        const hasGlobal = await Permissions.hasPermission(db, userId, 'event.manage.all');
        expect(hasScoped).toBe(true);
        expect(hasGlobal).toBe(false);
    });

    test('Scoped admin cannot manage event without tag match', async () => {
        const res = await db.run("INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level) VALUES (?, ?, ?, ?, ?)", ['scope@test.com', 'hash', 'Scoped', 'Admin', 5]);
        const userId = res.lastID;

        const socialRole = await db.get("SELECT id FROM roles WHERE name LIKE 'Social%'");
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, socialRole.id]);

        // Create event with 'slalom' tag (Social Sec manages 'socials')
        // Ensure tags exist (seed creates them)
        const tag = await db.get("SELECT id FROM tags WHERE name = 'slalom'");
        if (!tag) throw new Error("Tag 'slalom' not found");

        const eventRes = await db.run("INSERT INTO events (title, start, end, difficulty_level) VALUES ('Test', '2025-01-01', '2025-01-01', 1)");
        await db.run("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)", [eventRes.lastID, tag.id]);

        const canManage = await Permissions.canManageEvent(db, userId, eventRes.lastID);
        expect(canManage).toBe(false);
    });

    test('Scoped admin CAN manage event with matching tag', async () => {
        const res = await db.run("INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level) VALUES (?, ?, ?, ?, ?)", ['scope@test.com', 'hash', 'Scoped', 'Admin', 5]);
        const userId = res.lastID;

        const socialRole = await db.get("SELECT id FROM roles WHERE name LIKE 'Social%'");
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, socialRole.id]);

        // Create event with 'socials' tag
        const tag = await db.get("SELECT id FROM tags WHERE name = 'socials'");
        if (!tag) throw new Error("Tag 'socials' not found");

        const eventRes = await db.run("INSERT INTO events (title, start, end, difficulty_level) VALUES ('Test Social', '2025-01-01', '2025-01-01', 1)");
        await db.run("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)", [eventRes.lastID, tag.id]);

        const canManage = await Permissions.canManageEvent(db, userId, eventRes.lastID);
        expect(canManage).toBe(true);
    });

    test('User with direct permission override has access', async () => {
        const res = await db.run("INSERT INTO users (email, hashed_password, first_name, last_name, difficulty_level) VALUES (?, ?, ?, ?, ?)", ['normal@test.com', 'hash', 'Normal', 'User', 1]);
        const userId = res.lastID;

        const perm = await db.get("SELECT id FROM permissions WHERE slug = 'transaction.manage'");
        
        // Assign direct permission
        await db.run("INSERT INTO user_permissions (user_id, permission_id) VALUES (?, ?)", [userId, perm.id]);

        const has = await Permissions.hasPermission(db, userId, 'transaction.manage');
        expect(has).toBe(true);
    });
});