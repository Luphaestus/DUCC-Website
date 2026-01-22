const SCOPED_PERMS = ['event.manage.scoped', 'event.read.scoped', 'event.write.scoped'];

/**
 * RBAC Permission Helper
 */
class Permissions {
    /**
     * Check if user has a specific permission.
     * @param {object} db
     * @param {number} userId
     * @param {string} permissionSlug
     * @returns {Promise<boolean>}
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
     * Check if user has ANY permission (is an Exec).
     * @param {object} db
     * @param {number} userId
     * @returns {Promise<boolean>}
     */
    static async hasAnyPermission(db, userId) {
        const result = await db.get(
            `SELECT 1 FROM user_roles WHERE user_id = ? LIMIT 1`,
            [userId]
        );
        return !!result;
    }

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
     * Get all tag IDs a user can manage.
     * @param {object} db
     * @param {number} userId
     * @returns {Promise<Array<number>>}
     */
    static async getManagedTags(db, userId) {
        // Get user's managed tags (Role + Direct)
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
     * Check if user can manage an event (Global or Scoped).
     * @param {object} db
     * @param {number} userId
     * @param {number} eventId - If new event, pass null (checks generic create permission).
     * @param {Array<number>} eventTagIds - Tags of the event (for creation check).
     * @returns {Promise<boolean>}
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
    static filterScopedPerms(permissions) {
        return permissions.filter(p => !SCOPED_PERMS.includes(p));
    }
}

module.exports = { Permissions, SCOPED_PERMS };
