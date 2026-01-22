/**
 * AdminUsersAPI.js
 * 
 * This file handles administrative actions for user management.
 * It includes routes for searching users, viewing detailed profiles, and managing user roles and permissions.
 * 
 * Routes:
 * - GET /api/admin/users: List all users with pagination and administrative filters.
 * - GET /api/admin/user/:id: Fetch a comprehensive user profile (metadata, balance, stats, roles).
 * - POST /api/admin/user/:id/elements: Update user profile fields (admin-level).
 * - POST /api/admin/user/:id/role: Assign a role to a user.
 * - DELETE /api/admin/user/:id/role/:roleId: Remove a role from a user.
 * 
 * Advanced Permission Routes:
 * - POST /api/admin/user/:id/permission: Add a direct permission override to a user.
 * - DELETE /api/admin/user/:id/permission/:permId: Remove a direct permission override.
 * - POST /api/admin/user/:id/managed_tag: Add a managed tag scope to a user.
 * - DELETE /api/admin/user/:id/managed_tag/:tagId: Remove a managed tag scope.
 */

const UserDB = require('../../db/userDB.js');
const RolesDB = require('../../db/rolesDB.js');
const SwimsDB = require('../../db/swimsDB.js');
const transactionsDB = require('../../db/transactionDB.js');
const check = require('../../misc/authentication.js');
const { statusObject } = require('../../misc/status.js');
const { Permissions, SCOPED_PERMS } = require('../../misc/permissions.js');

const bcrypt = require('bcrypt');

/**
 * Admin API for managing users.
 * @module AdminUsers
 */
class AdminUsers {
    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all admin routes for user oversight and authorization management.
     */
    registerRoutes() {
        /**
         * Fetch paginated users list for admin tables.
         * Identifies the current admin's management capabilities to restrict search results.
         */
        this.app.get('/api/admin/users', check('perm:is_exec'), async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search || '';
            const sort = req.query.sort || 'last_name';
            const order = req.query.order || 'asc';

            const inDebt = req.query.inDebt;
            const isMember = req.query.isMember;
            const difficulty = req.query.difficulty;
            const permissions = req.query.permissions;

            // Determine admin permissions to pass to the database layer
            const userPerms = {
                canManageUsers: await Permissions.hasPermission(this.db, req.user.id, 'user.manage'),
                canManageTrans: await Permissions.hasPermission(this.db, req.user.id, 'transaction.manage'),
                canManageEvents: await Permissions.hasPermission(this.db, req.user.id, 'event.manage.all'),
                isScopedExec: await Permissions.hasPermission(this.db, req.user.id, 'event.manage.scoped')
            };

            const result = await UserDB.getUsers(this.db, userPerms, { page, limit, search, sort, order, inDebt, isMember, difficulty, permissions });
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Fetch full user profile, balance, and authorization details.
         * Data returned is filtered based on the admin's specific permissions.
         */
        this.app.get('/api/admin/user/:id', check('perm:user.read | perm:user.manage | perm:transaction.read | perm:transaction.manage | perm:is_exec'), async (req, res) => {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

            const canManageUsers = await Permissions.hasPermission(this.db, req.user.id, 'user.manage') || await Permissions.hasPermission(this.db, req.user.id, 'user.read');
            const canManageTransactions = await Permissions.hasPermission(this.db, req.user.id, 'transaction.manage') || await Permissions.hasPermission(this.db, req.user.id, 'transaction.read');

            // Define which fields the current admin is allowed to see
            let elements;
            if (canManageUsers) {
                elements = [
                    "id", "email", "first_name", "last_name", "date_of_birth", "college_id", "college_name",
                    "emergency_contact_name", "emergency_contact_phone", "home_address", "phone_number",
                    "has_medical_conditions", "medical_conditions_details", "takes_medication", "medication_details",
                    "free_sessions", "is_member", "filled_legal_info", "is_instructor", "first_aid_expiry",
                    "agrees_to_fitness_statement", "agrees_to_club_rules", "agrees_to_pay_debts", "agrees_to_data_storage", "agrees_to_keep_health_data",
                    "difficulty_level", "swims"
                ];
            } else if (canManageTransactions) {
                elements = ["id", "first_name", "last_name", "free_sessions", "is_member", "is_instructor", "difficulty_level", "swims"];
            } else {
                elements = ["id", "first_name", "last_name", "swims"];
            }

            const includeBalance = canManageUsers || canManageTransactions;
            const profileRes = await UserDB.getUserProfile(this.db, userId, elements, includeBalance);
            if (profileRes.isError()) return profileRes.getResponse(res);

            const filteredUser = profileRes.getData();

            // Fetch and attach swimmer statistics (all-time and yearly)
            const [allTimeRes, yearlyRes] = await Promise.all([
                SwimsDB.getUserSwimmerRank(this.db, userId, false),
                SwimsDB.getUserSwimmerRank(this.db, userId, true)
            ]);
            let allTimeData = allTimeRes.getData() || { rank: -1, swims: 0 };
            allTimeData.rank = allTimeData.swims === 0 ? -1 : allTimeData.rank;
            
            let yearlyData = yearlyRes.getData() || { rank: -1, swims: 0 };
            yearlyData.rank = yearlyData.swims === 0 ? -1 : yearlyData.rank;

            filteredUser.swimmer_stats = { allTime: allTimeData, yearly: yearlyData };

            // Fetch and attach roles, direct permissions, and managed tags
            const rolesRes = await RolesDB.getUserRoles(this.db, userId);
            if (!rolesRes.isError()) filteredUser.roles = rolesRes.getData();

            const permsRes = await RolesDB.getUserPermissions(this.db, userId);
            if (!permsRes.isError()) filteredUser.direct_permissions = permsRes.getData();

            const tagsRes = await RolesDB.getUserManagedTags(this.db, userId);
            if (!tagsRes.isError()) filteredUser.direct_managed_tags = tagsRes.getData();

            res.json(filteredUser);
        });

        /**
         * Update profile elements for any user.
         */
        this.app.post('/api/admin/user/:id/elements', check('perm:user.write | perm:user.manage'), async (req, res) => {
            if (req.body.email) req.body.email = req.body.email.toLowerCase();
            const result = await UserDB.writeElements(this.db, req.params.id, req.body);
            result.getResponse(res);
        });

        /**
         * Assign a role to a user.
         * Includes special logic for transferring the 'President' role (requires current admin's password).
         */
        this.app.post('/api/admin/user/:id/role', check('perm:user.manage | perm:role.manage'), async (req, res) => {
            const roleId = req.body.roleId;
            const role = await this.db.get('SELECT name FROM roles WHERE id = ?', [roleId]);
            
            if (role && role.name === 'President') {
                const { password } = req.body;
                if (!password) {
                    return res.status(400).json({ message: 'Password is required to transfer the President role.' });
                }

                // Verify the current admin's password before performing high-stakes transfer
                const isMatch = await bcrypt.compare(password, req.user.hashed_password);
                if (!isMatch) {
                    return res.status(403).json({ message: 'Incorrect password.' });
                }

                // Reset everyone's permissions and assign new President (atomic transfer)
                const result = await UserDB.resetPermissions(this.db, req.params.id);
                return result.getResponse(res);
            }

            const result = await RolesDB.assignRole(this.db, req.params.id, roleId);
            result.getResponse(res);
        });

        /**
         * Remove a role from a user.
         */
        this.app.delete('/api/admin/user/:id/role/:roleId', check('perm:user.manage | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.removeRole(this.db, req.params.id, req.params.roleId);
            result.getResponse(res);
        });

        // --- Advanced User Permissions ---

        /**
         * Add a direct permission override to a user (independent of roles).
         */
        this.app.post('/api/admin/user/:id/permission', check('perm:user.manage | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.addUserPermission(this.db, req.params.id, req.body.permissionId);
            result.getResponse(res);
        });

        /**
         * Remove a direct permission override from a user.
         */
        this.app.delete('/api/admin/user/:id/permission/:permId', check('perm:user.manage | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.removeUserPermission(this.db, req.params.id, req.params.permId);
            result.getResponse(res);
        });

        /**
         * Grant an Exec direct management scope over events with a specific tag.
         */
        this.app.post('/api/admin/user/:id/managed_tag', check('perm:user.manage | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.addManagedTag(this.db, req.params.id, req.body.tagId);
            result.getResponse(res);
        });

        /**
         * Revoke an Exec's direct management scope over a specific tag.
         */
        this.app.delete('/api/admin/user/:id/managed_tag/:tagId', check('perm:user.manage | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.removeManagedTag(this.db, req.params.id, req.params.tagId);
            result.getResponse(res);
        });
    }
}

module.exports = AdminUsers;