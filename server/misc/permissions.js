/**
 * permissions.js
 * 
 * Provides business logic for evaluates user permissions and administrative scoping.
 * Enforces Role-Based Access Control (RBAC) and granular event management scoping.
 */

const SCOPED_PERMS = ['event.manage.scoped', 'event.read.scoped', 'event.write.scoped'];

/**
 * RBAC and Scoping Evaluation Helper
 */
class Permissions {
    /**
     * Check if a user possesses a specific permission slug.
     * Permission can be granted either via an assigned role or directly.
     * @param {object} db - Database connection.
     * @param {number} userId - ID of the user.
     * @param {string} permissionSlug - The slug to check.
     * @returns {Promise<boolean>}
     */
    static async hasPermission(db, userId, permissionSlug) {
        // Special logic for "scoped" permissions:
        // Possessing a scoped permission is defined as having at least one managed tag.
        if (SCOPED_PERMS.includes(permissionSlug)) {
            const managedTags = await this.getManagedTags(db, userId);
            return managedTags.length > 0;
        }

        // Check if any of the user's roles grant this permission
        const rolePerm = await db.get(
            `SELECT 1 FROM user_roles ur
             JOIN role_permissions rp ON ur.role_id = rp.role_id
             JOIN permissions p ON rp.permission_id = p.id
             WHERE ur.user_id = ? AND p.slug = ?`,
            [userId, permissionSlug]
        );
        if (rolePerm) return true;

        // Check if the user has this permission granted directly (override)
        const userPerm = await db.get(
            `SELECT 1 FROM user_permissions up
             JOIN permissions p ON up.permission_id = p.id
             WHERE up.user_id = ? AND p.slug = ?`,
            [userId, permissionSlug]
        );
        return !!userPerm;
    }

    /**
     * Determine if a user has any administrative capabilities (is an "Exec").
     * Defined as having an entry in the user_roles table.
     */
    static async hasAnyPermission(db, userId) {
        const result = await db.get(
            `SELECT 1 FROM user_roles WHERE user_id = ? LIMIT 1`,
            [userId]
        );
        return !!result;
    }

    /**
     * Check if a user is explicitly assigned a specific role (by name or ID).
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
     * Scoping is calculated by combining role-based managed tags and direct user managed tags.
     * @returns {Promise<Array<number>>} - Sorted list of unique tag IDs.
     */
    static async getManagedTags(db, userId) {
        // Fetch tags linked to the user's role
        const roleTags = await db.all(
            `SELECT rmt.tag_id FROM role_managed_tags rmt
             JOIN user_roles ur ON rmt.role_id = ur.role_id
             WHERE ur.user_id = ?`,
            [userId]
        );

        // Fetch tags linked directly to the user
        const directTags = await db.all(
            `SELECT tag_id FROM user_managed_tags WHERE user_id = ?`,
            [userId]
        );

        // Merge and deduplicate
        return [...new Set([...roleTags.map(t => t.tag_id), ...directTags.map(t => t.tag_id)])];
    }

    /**
     * Check if a user is authorized to manage a specific event.
     * Supports global (manage.all) and scoped (manage.scoped + tag match) authorization.
     * 
     * @param {object} db - Database connection.
     * @param {number} userId - ID of the user.
     * @param {number|null} [eventId=null] - ID of existing event (null for creation check).
     * @param {Array<number>} [eventTagIds=[]] - Tags proposed for a new event.
     * @returns {Promise<boolean>}
     */
    static async canManageEvent(db, userId, eventId = null, eventTagIds = []) {
        // Global permission allows management of everything
        if (await this.hasPermission(db, userId, 'event.manage.all')) return true;

        // Scoped evaluation
        if (await this.hasPermission(db, userId, 'event.manage.scoped') || await this.hasPermission(db, userId, 'event.write.scoped')) {
            const managedTagIds = await this.getManagedTags(db, userId);

            // No managed tags means no scoped management capability
            if (managedTagIds.length === 0) return false;

            if (eventId) {
                // For existing events, check if any of the event's current tags are in the user's scope
                const eventTags = await db.all('SELECT tag_id FROM event_tags WHERE event_id = ?', [eventId]);
                const currentTagIds = eventTags.map(t => t.tag_id);
                return currentTagIds.some(id => managedTagIds.includes(id));
            } else {
                // For new events, check if any of the proposed tags are in the user's scope
                if (eventTagIds.length > 0) {
                    return eventTagIds.some(id => managedTagIds.includes(id));
                }
                // Scoped admins cannot create events with NO tags (as they would be unmanaged)
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