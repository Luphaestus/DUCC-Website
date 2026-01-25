/**
 * permissions.js
 * 
 * Provides logic for evaluating user permissions and administrative scoping.
 */

const SCOPED_PERMS = ['event.manage.scoped', 'event.read.scoped', 'event.write.scoped'];

class Permissions {
    /**
     * Check if a user possesses a specific permission slug.
     */
    static async hasPermission(db, userId, permissionSlug) {
        if (SCOPED_PERMS.includes(permissionSlug)) {
            const managedTags = await this.getManagedTags(db, userId);
            return managedTags.length > 0;
        }

        const rolePerm = await db.get(
            `SELECT 1 FROM user_roles ur
             JOIN role_permissions rp ON ur.role_id = rp.role_id
             JOIN permissions p ON rp.permission_id = p.id
             WHERE ur.user_id = ? AND p.slug = ?`,
            [userId, permissionSlug]
        );
        if (rolePerm) return true;

        const userPerm = await db.get(
            `SELECT 1 FROM user_permissions up
             JOIN permissions p ON up.permission_id = p.id
             WHERE up.user_id = ? AND p.slug = ?`,
            [userId, permissionSlug]
        );
        return !!userPerm;
    }

    /**
     * Determine if a user has any administrative capabilities.
     */
    static async hasAnyPermission(db, userId) {
        const result = await db.get(
            `SELECT 1 FROM user_roles WHERE user_id = ? LIMIT 1`,
            [userId]
        );
        return !!result;
    }

    /**
     * Check if a user is explicitly assigned a specific role.
     */
    static async hasRole(db, userId, role) {
        var roleId = role;
        
        if (typeof role === 'string') {
            roleId = await db.get(
                `SELECT id FROM roles WHERE name = ?`,
                [role]
            );
            if (!roleId) return false;
            roleId = roleId.id;
        }

        const result = await db.get(
            `SELECT 1 FROM user_roles WHERE user_id = ? AND role_id = ? LIMIT 1`,
            [userId, roleId]
        );
        return !!result;
    }

    /**
     * Fetch all tag IDs that a user is authorized to manage.
     */
    static async getManagedTags(db, userId) {
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

    /**
     * Check if a user is authorized to manage a specific tag.
     */
    static async canManageTag(db, userId, tagId) {
        if (await this.hasPermission(db, userId, 'event.manage.all') || await this.hasPermission(db, userId, 'user.manage')) return true;

        const managedTagIds = await this.getManagedTags(db, userId);
        return managedTagIds.includes(parseInt(tagId));
    }

    /**
     * Check if a user is authorized to manage a specific event.
     */
    static async canManageEvent(db, userId, eventId = null, eventTagIds = []) {
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

    /**
     * Helper to filter out system-managed scoped permissions from a list.
     */
    static filterScopedPerms(permissions) {
        return permissions.filter(p => !SCOPED_PERMS.includes(p));
    }
}

module.exports = { Permissions, SCOPED_PERMS };