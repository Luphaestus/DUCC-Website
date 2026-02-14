import { DatabaseWrapper } from '../db/db.js';

/**
 * permissions.ts
 *
 * Logic for user permission evaluation.
 */

export const SCOPED_PERMS = ['event.manage.scoped', 'event.read.scoped', 'event.write.scoped'];

export class Permissions {
    /** Determines permission implications (hierarchy). */
    static getImplyingPermissions(slug: string): string[] {
        const implying = new Set([slug, 'user.manage']);
        
        const parts = slug.split('.');
        if (parts.length >= 2) {
            const entity = parts[0];
            const action = parts[1];
            const scope = parts[2];

            const actionOrder = ['read', 'write', 'manage'];
            const currentActionIdx = actionOrder.indexOf(action);

            if (currentActionIdx !== -1) {
                for (let i = currentActionIdx + 1; i < actionOrder.length; i++) {
                    implying.add(`${entity}.${actionOrder[i]}${scope ? '.' + scope : ''}`);
                }
            }

            if (scope === 'scoped') {
                implying.add(`${entity}.${action}.all`);
                
                if (currentActionIdx !== -1) {
                    for (let i = currentActionIdx + 1; i < actionOrder.length; i++) {
                        implying.add(`${entity}.${actionOrder[i]}.all`);
                    }
                }
            }
        }
        return Array.from(implying);
    }

    /** Check if user has permission. */
    static async hasPermission(db: DatabaseWrapper, userId: number, permissionSlug: string): Promise<boolean> {
        const implying = this.getImplyingPermissions(permissionSlug);
        const placeholders = implying.map(() => '?').join(',');

        const result = await db.get(`
            SELECT 1 FROM (
                SELECT p.slug FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                JOIN permissions p ON rp.permission_id = p.id
                WHERE ur.user_id = ?
                UNION
                SELECT p.slug FROM user_permissions up
                JOIN permissions p ON up.permission_id = p.id
                WHERE up.user_id = ?
            ) as user_perms
            WHERE slug IN (${placeholders})
        `, [userId, userId, ...implying]);

        if (result) return true;

        if (SCOPED_PERMS.includes(permissionSlug)) {
            const managedTags = await this.getManagedTags(db, userId);
            return managedTags.length > 0;
        }

        return false;
    }

    /** Check if user has ANY administrative permission. */
    static async hasAnyPermission(db: DatabaseWrapper, userId: number): Promise<boolean> {
        const result = await db.get(`
            SELECT 1 FROM (
                SELECT rp.permission_id FROM user_roles ur
                JOIN role_permissions rp ON ur.role_id = rp.role_id
                WHERE ur.user_id = ?
                UNION
                SELECT up.permission_id FROM user_permissions up
                WHERE up.user_id = ?
            ) as user_perms
            LIMIT 1
        `, [userId, userId]);
        
        return !!result;
    }

    /** Check if user has specific role. */
    static async hasRole(db: DatabaseWrapper, userId: number, role: string | number): Promise<boolean> {
        let roleId = role;
        
        if (typeof role === 'string') {
            const row = await db.get(
                `SELECT id FROM roles WHERE name = ?`,
                [role]
            );
            if (!row) return false;
            roleId = row.id;
        }

        const result = await db.get(
            `SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1`,
            [userId, roleId]
        );
        return !!result;
    }

    /** Get managed tag IDs for user. */
    static async getManagedTags(db: DatabaseWrapper, userId: number): Promise<number[]> {
        const roleTags = await db.all(
            `SELECT rmt.tag_id FROM role_managed_tags rmt
             JOIN user_roles ur ON rmt.role_id = ur.role_id
             WHERE ur.user_id = ?`,
            [userId]
        );

        const directTags = await db.all(
            `SELECT tag_id FROM user_managed_tags WHERE user_id = ?`,
            [userId]
        );

        return [...new Set([...roleTags.map(t => t.tag_id), ...directTags.map(t => t.tag_id)])];
    }

    /** Fetch all users with a specific permission. */
    static async getUsersWithPermission(db: DatabaseWrapper, permissionSlug: string): Promise<any[]> {
        const implying = this.getImplyingPermissions(permissionSlug);
        const placeholders = implying.map(() => '?').join(',');

        return await db.all(`
            SELECT DISTINCT u.id, u.email, u.first_name, u.last_name FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN role_permissions rp ON ur.role_id = rp.role_id
            LEFT JOIN user_permissions up ON u.id = up.user_id
            LEFT JOIN permissions p_role ON rp.permission_id = p_role.id
            LEFT JOIN permissions p_direct ON up.permission_id = p_direct.id
            WHERE p_role.slug IN (${placeholders}) OR p_direct.slug IN (${placeholders})
        `, [...implying, ...implying]);
    }

    /** Check if user manages specific tag. */
    static async canManageTag(db: DatabaseWrapper, userId: number, tagId: number | string): Promise<boolean> {
        if (await this.hasPermission(db, userId, 'event.manage.all') || await this.hasPermission(db, userId, 'user.manage')) return true;

        const managedTagIds = await this.getManagedTags(db, userId);
        return managedTagIds.includes(parseInt(tagId.toString()));
    }

    /** Check if user manages specific event. */
    static async canManageEvent(db: DatabaseWrapper, userId: number, eventId: number | string | null = null, eventTagIds: number[] = []): Promise<boolean> {
        if (await this.hasPermission(db, userId, 'event.manage.all')) return true;

        if (await this.hasPermission(db, userId, 'event.manage.scoped') || await this.hasPermission(db, userId, 'event.write.scoped')) {
            const managedTagIds = await this.getManagedTags(db, userId);

            if (managedTagIds.length === 0) return false;

            if (eventId) {
                const eventTags = await db.all('SELECT tag_id FROM event_tags WHERE event_id = ?', [eventId]);
                const currentTagIds = eventTags.map(t => t.tag_id);
                return currentTagIds.some(id => managedTagIds.includes(id));
            } else {
                if (eventTagIds.length > 0) {
                    return eventTagIds.some(id => managedTagIds.includes(id));
                }
                return false;
            }
        }

        return false;
    }

    /** Filter out system-managed permissions. */
    static filterScopedPerms(permissions: string[]): string[] {
        return permissions.filter(p => !SCOPED_PERMS.includes(p));
    }
}
