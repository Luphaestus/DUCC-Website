const request = require('supertest');
const express = require('express');
const { setupTestDb } = require('../utils/db');
const AdminAPI = require('../../server/api/AdminAPI');
const Globals = require('../../server/misc/globals');
const { Permissions, SCOPED_PERMS } = require('../../server/misc/permissions.js');

describe('Admin API Scoped Permissions Assignment', () => {
    let app;
    let db;
    let adminId;
    let userId;

    beforeEach(async () => {
        vi.spyOn(Globals.prototype, 'getInt').mockReturnValue(0);
        vi.spyOn(Globals.prototype, 'getFloat').mockReturnValue(0);

        db = await setupTestDb();

        // Setup Permissions
        await db.run("INSERT INTO permissions (slug) VALUES ('user.manage'), ('role.read'), ('role.manage'), ('event.manage.scoped'), ('event.read.scoped'), ('event.write.scoped')");
        
        // Setup Roles
        await db.run("INSERT INTO roles (name) VALUES ('Admin'), ('TestRole')");
        const adminRoleId = (await db.get("SELECT id FROM roles WHERE name = 'Admin'")).id;

        const userManagePerm = (await db.get("SELECT id FROM permissions WHERE slug = 'user.manage'")).id;
        const roleReadPerm = (await db.get("SELECT id FROM permissions WHERE slug = 'role.read'")).id;
        const roleManagePerm = (await db.get("SELECT id FROM permissions WHERE slug = 'role.manage'")).id;
        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [adminRoleId, userManagePerm]);
        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [adminRoleId, roleReadPerm]);
        await db.run("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [adminRoleId, roleManagePerm]);

        // Create Admin
        const adminRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['admin@durham.ac.uk', 'Admin', 'User', 1]
        );
        adminId = adminRes.lastID;
        await db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [adminId, adminRoleId]);

        // Create Regular User
        const userRes = await db.run(
            'INSERT INTO users (email, first_name, last_name, college_id) VALUES (?, ?, ?, ?)',
            ['user@durham.ac.uk', 'Regular', 'User', 1]
        );
        userId = userRes.lastID;

        app = express();
        app.use(express.json());

        app.use((req, res, next) => {
            req.db = db;
            req.isAuthenticated = () => true;
            req.user = { id: adminId };
            next();
        });

        const adminAPI = new AdminAPI(app, db);
        adminAPI.registerRoutes();
    });

    afterEach(async () => {
        await db.close();
        vi.restoreAllMocks();
    });

    test('GET /api/admin/permissions does not list scoped permissions', async () => {
        const res = await request(app).get('/api/admin/permissions');
        expect(res.statusCode).toBe(200);
        const slugs = res.body.map(p => p.slug);
        for (const p of SCOPED_PERMS) {
            expect(slugs).not.toContain(p);
        }
        expect(slugs).toContain('user.manage');
    });

    test('Cannot assign scoped permission directly to user', async () => {
        const scopedPermId = (await db.get("SELECT id FROM permissions WHERE slug = 'event.manage.scoped'")).id;
        const res = await request(app)
            .post(`/api/admin/user/${userId}/permission`)
            .send({ permissionId: scopedPermId });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('cannot be set manually');
    });

    test('Scoped permissions are filtered out when creating a role', async () => {
        const res = await request(app)
            .post('/api/admin/role')
            .send({
                name: 'NewRole',
                permissions: ['user.manage', 'event.manage.scoped']
            });
        
        expect(res.statusCode).toBe(200);
        const newRoleId = res.body.id;

        const assignedPerms = await db.all('SELECT p.slug FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?', [newRoleId]);
        const slugs = assignedPerms.map(p => p.slug);
        expect(slugs).toContain('user.manage');
        expect(slugs).not.toContain('event.manage.scoped');
    });

    test('Dynamically grants scoped perm if user manages a tag', async () => {
        // User has no perm yet
        let hasScopedPerm = await Permissions.hasPermission(db, userId, 'event.manage.scoped');
        expect(hasScopedPerm).toBe(false);

        // Assign user as manager of a tag
        const tagRes = await db.run('INSERT INTO tags (name) VALUES (?)', ['Managed Tag']);
        const tagId = tagRes.lastID;
        await db.run('INSERT INTO user_managed_tags (user_id, tag_id) VALUES (?, ?)', [userId, tagId]);

        // User should now have the permission dynamically
        hasScopedPerm = await Permissions.hasPermission(db, userId, 'event.manage.scoped');
        expect(hasScopedPerm).toBe(true);

        // Remove manager assignment
        await db.run('DELETE FROM user_managed_tags WHERE user_id = ? AND tag_id = ?', [userId, tagId]);

        // Permission should be gone
        hasScopedPerm = await Permissions.hasPermission(db, userId, 'event.manage.scoped');
        expect(hasScopedPerm).toBe(false);
    });
});
