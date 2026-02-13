/**
 * rolesDB.ts
 * 
 * This module manages the Role-Based Access Control (RBAC) database tables.
 */

import { statusObject } from '../misc/status.js';
import { SCOPED_PERMS, Permissions } from '../misc/permissions.js';
import Logger from '../misc/Logger.js';
import ExecDB from './execDB.js';
import { DatabaseWrapper } from './db.js';

export default class RolesDB {
    /**
     * Fetch the name of a role by its ID.
     */
    static async getRoleNameById(db: DatabaseWrapper, id: number | string): Promise<string | null> {
        const role = await db.get('SELECT name FROM roles WHERE id = ?', [id]);
        return role ? role.name : null;
    }

    /**
     * Fetch all roles currently assigned to a user.
     */
    static async getUserRoles(db: DatabaseWrapper, userId: number | string): Promise<statusObject> {
        try {
            const roles = await db.all('SELECT r.id, r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [userId]);
            return new statusObject(200, 'Success', roles);
        } catch (e) {
            Logger.error('Database error fetching user roles:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Assign a single role to a user.
     */
    static async assignRole(db: DatabaseWrapper, userId: number | string, roleId: number | string): Promise<statusObject> {
        try {
            await db.run('INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleId]);
            await ExecDB.syncExecMember(db, Number(userId));
            return new statusObject(200, 'Role assigned');
        } catch (e) {
            Logger.error('Database error assigning role:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Remove a role from a user.
     */
    static async removeRole(db: DatabaseWrapper, userId: number | string, roleId: number | string): Promise<statusObject> {
        try {
            const role = await db.get('SELECT name FROM roles WHERE id = ?', [roleId]);
            if (role && role.name === 'President') {
                return new statusObject(403, 'The President role cannot be removed.');
            }
            await db.run('DELETE FROM user_roles WHERE user_id = ? AND role_id = ?', [userId, roleId]);
            await ExecDB.syncExecMember(db, Number(userId));
            return new statusObject(200, 'Role removed');
        } catch (e) {
            Logger.error('Database error removing role:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch direct permission overrides assigned to a user.
     */
    static async getUserPermissions(db: DatabaseWrapper, userId: number | string): Promise<statusObject> {
        try {
            const perms = await db.all(
                `SELECT p.id, p.slug, p.description FROM permissions p 
                 JOIN user_permissions up ON p.id = up.permission_id 
                 WHERE up.user_id = ?`,
                [userId]
            );
            return new statusObject(200, 'Success', perms);
        } catch (e) {
            Logger.error('Database error fetching user permissions:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Get all unique permission slugs for a user.
     */
    static async getAllUserPermissions(db: DatabaseWrapper, userId: number | string): Promise<statusObject> {
        try {
            const rolePerms = await db.all(`
                SELECT DISTINCT p.slug 
                FROM permissions p
                JOIN role_permissions rp ON p.id = rp.permission_id
                JOIN user_roles ur ON rp.role_id = ur.role_id
                WHERE ur.user_id = ?
            `, [userId]);
            
            const directPerms = await db.all(`
                SELECT DISTINCT p.slug 
                FROM permissions p
                JOIN user_permissions up ON p.id = up.permission_id
                WHERE up.user_id = ?
            `, [userId]);

            const allSlugs = new Set([
                ...rolePerms.map(p => p.slug), 
                ...directPerms.map(p => p.slug)
            ]);
            
            return new statusObject(200, 'Success', Array.from(allSlugs));
        } catch (e) {
            Logger.error('Database error fetching all user permissions:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Add a direct permission override to a user.
     */
    static async addUserPermission(db: DatabaseWrapper, userId: number | string, permissionId: number | string): Promise<statusObject> {
        try {
            const perm = await db.get('SELECT slug FROM permissions WHERE id = ?', [permissionId]);
            if (!perm) {
                return new statusObject(404, 'Permission not found.');
            }
            if (SCOPED_PERMS.includes(perm.slug)) {
                return new statusObject(400, 'Scoped permissions are assigned automatically and cannot be set manually.');
            }

            await db.run('INSERT IGNORE INTO user_permissions (user_id, permission_id) VALUES (?, ?)', [userId, permissionId]);
            return new statusObject(200, 'Permission added');
        } catch (e) {
            Logger.error('Database error adding user permission:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Assign a permission directly to a role.
     */
    static async addRolePermission(db: DatabaseWrapper, { role_id, permission_id }: { role_id: number, permission_id: number }): Promise<statusObject> {
        try {
            await db.run('INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [role_id, permission_id]);
            return new statusObject(200, 'Permission assigned to role.');
        } catch (e) {
            Logger.error('Database error assigning permission to role:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Remove a direct permission override from a user.
     */
    static async removeUserPermission(db: DatabaseWrapper, userId: number | string, permissionId: number | string): Promise<statusObject> {
        try {
            await db.run('DELETE FROM user_permissions WHERE user_id = ? AND permission_id = ?', [userId, permissionId]);
            return new statusObject(200, 'Permission removed');
        } catch (e) {
            Logger.error('Database error removing user permission:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch all event tags that a user is directly authorized to manage.
     */
    static async getUserManagedTags(db: DatabaseWrapper, userId: number | string): Promise<statusObject> {
        try {
            const tags = await db.all(
                `SELECT t.id, t.name, t.color FROM tags t
                 JOIN user_managed_tags umt ON t.id = umt.tag_id
                 WHERE umt.user_id = ?`,
                [userId]
            );
            return new statusObject(200, 'Success', tags);
        } catch (e) {
            Logger.error('Database error fetching user managed tags:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Add a managed tag scope to a user.
     */
    static async addManagedTag(db: DatabaseWrapper, userId: number | string, tagId: number | string): Promise<statusObject> {
        try {
            await db.run('INSERT IGNORE INTO user_managed_tags (tag_id, user_id) VALUES (?, ?)', [tagId, userId]);
            return new statusObject(200, 'Tag scope added');
        } catch (e) {
            Logger.error('Database error adding managed tag:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Remove a managed tag scope from a user.
     */
    static async removeManagedTag(db: DatabaseWrapper, userId: number | string, tagId: number | string): Promise<statusObject> {
        try {
            await db.run('DELETE FROM user_managed_tags WHERE user_id = ? AND tag_id = ?', [userId, tagId]);
            return new statusObject(200, 'Tag scope removed');
        } catch (e) {
            Logger.error('Database error removing managed tag:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Check if a user has a role that grants management of a specific tag.
     */
    static async hasRoleForTag(db: DatabaseWrapper, userId: number | string, tagId: number | string): Promise<boolean> {
        const hasRole = await db.get(
            `SELECT 1 FROM user_roles ur
             JOIN role_managed_tags rmt ON ur.role_id = rmt.role_id
             WHERE ur.user_id = ? AND rmt.tag_id = ?`,
            [userId, tagId]
        );
        return !!hasRole;
    }

    /**
     * Fetch all permissions registered in the system.
     */
    static async getAllPermissions(db: DatabaseWrapper): Promise<statusObject> {
        try {
            let perms = await db.all('SELECT * FROM permissions ORDER BY slug ASC');
            perms = Permissions.filterScopedPerms(perms.map(p => p.slug)).map(slug => perms.find(p => p.slug === slug));
            return new statusObject(200, 'Success', perms);
        } catch (e) {
            Logger.error('Database error fetching permissions:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch all defined roles and their permission mappings.
     */
    static async getAllRoles(db: DatabaseWrapper): Promise<statusObject> {
        try {
            const roles = await db.all('SELECT * FROM roles');
            for (const role of roles) {
                const perms = await db.all(
                    `SELECT p.slug FROM permissions p 
                     JOIN role_permissions rp ON p.id = rp.permission_id 
                     WHERE rp.role_id = ?`,
                    [role.id]
                );
                role.permissions = perms.map(p => p.slug);
            }
            return new statusObject(200, 'Success', roles);
        } catch (e) {
            Logger.error('Database error fetching roles:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch a specific role by its ID and include its permission mappings.
     */
    static async getRoleById(db: DatabaseWrapper, id: number | string): Promise<statusObject> {
        try {
            const role = await db.get('SELECT * FROM roles WHERE id = ?', [id]);
            if (!role) return new statusObject(404, 'Role not found');

            const perms = await db.all(
                `SELECT p.slug FROM permissions p 
                 JOIN role_permissions rp ON p.id = rp.permission_id 
                 WHERE rp.role_id = ?`,
                [id]
            );
            role.permissions = perms.map(p => p.slug);
            
            return new statusObject(200, 'Success', role);
        } catch (e) {
            Logger.error('Database error fetching role by ID:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new role definition.
     */
    static async createRole(db: DatabaseWrapper, name: string, description: string, permissions: string[], execRanking: number = 4): Promise<statusObject> {
        try {
            const existingRole = await db.get('SELECT id FROM roles WHERE name = ?', [name]);
            if (existingRole) {
                return new statusObject(409, 'A role with this name already exists.');
            }

            const result = await db.run('INSERT INTO roles (name, description, exec_ranking) VALUES (?, ?, ?)', [name, description, execRanking]);
            const roleId = result.lastID;

            if (permissions && Array.isArray(permissions)) {
                permissions = Permissions.filterScopedPerms(permissions);
                for (const slug of permissions) {
                    const perm = await db.get('SELECT id FROM permissions WHERE slug = ?', [slug]);
                    if (perm) {
                        await db.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, perm.id]);
                    }
                }
            }
            return new statusObject(201, 'Role created', { id: roleId });
        } catch (e) {
            Logger.error('Database error creating role:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Update an existing role definition and its permission mappings.
     */
    static async updateRole(db: DatabaseWrapper, id: number | string, name: string, description: string, permissions: string[], execRanking: number = 4): Promise<statusObject> {
        try {
            const role = await db.get('SELECT name FROM roles WHERE id = ?', [id]);
            if (role && role.name === 'President' && name !== 'President') {
                return new statusObject(403, 'The President role name cannot be changed.');
            }

            await db.run('UPDATE roles SET name = ?, description = ?, exec_ranking = ? WHERE id = ?', [name, description, execRanking, id]);

            if (permissions && Array.isArray(permissions)) {
                await db.run('DELETE FROM role_permissions WHERE role_id = ?', [id]);
                permissions = Permissions.filterScopedPerms(permissions);
                for (const slug of permissions) {
                    const perm = await db.get('SELECT id FROM permissions WHERE slug = ?', [slug]);
                    if (perm) {
                        await db.run('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)', [id, perm.id]);
                    }
                }
            }
            return new statusObject(200, 'Role updated');
        } catch (e) {
            Logger.error('Database error updating role:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Permanently delete a role definition.
     */
    static async deleteRole(db: DatabaseWrapper, id: number | string): Promise<statusObject> {
        try {
            const role = await db.get('SELECT name FROM roles WHERE id = ?', [id]);
            if (role && role.name === 'President') {
                return new statusObject(403, 'The President role cannot be deleted.');
            }

            await db.run('DELETE FROM roles WHERE id = ?', [id]);
            return new statusObject(200, 'Role deleted');
        } catch (e) {
            Logger.error('Database error deleting role:', e);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Find the ID of the first user assigned to a specific role.
     */
    static async getFirstUserIdByRoleName(db: DatabaseWrapper, roleName: string): Promise<statusObject> {
        try {
            const role = await db.get('SELECT id FROM roles WHERE name = ?', [roleName]);
            if (!role) return new statusObject(404, 'Role not found');

            const result = await db.get('SELECT user_id FROM user_roles WHERE role_id = ?', [role.id]);
            if (!result) return new statusObject(404, 'User not found in role');

            return new statusObject(200, 'Success', result.user_id);
        } catch (e) {
            Logger.error('Database error fetching first user by role name:', e);
            return new statusObject(500, 'Database error');
        }
    }
}
