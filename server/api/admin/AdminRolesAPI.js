/**
 * AdminRolesAPI.js
 * 
 * This file handles management of roles and their associated permissions.
 * It allows admins to define roles (e.g. "Canoe Captain") and assign permissions to them.
 * 
 * Routes:
 * - GET /api/admin/permissions: Fetch all available system permissions.
 * - GET /api/admin/roles: Fetch all currently defined roles.
 * - POST /api/admin/role: Create a new role definition.
 * - PUT /api/admin/role/:id: Update a role's name, description, and permission list.
 * - DELETE /api/admin/role/:id: Remove a role definition (does not delete users).
 */

const check = require('../../misc/authentication.js');
const RolesDB = require('../../db/rolesDB.js');

/**
 * Admin API for managing roles and permissions.
 * @module AdminRoles
 */
class AdminRoles {
    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all admin routes for role and permission management.
     */
    registerRoutes() {
        /**
         * List all valid system permissions.
         * Used when creating or editing roles to see available options.
         */
        this.app.get('/api/admin/permissions', check('perm:role.read | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.getAllPermissions(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * List all defined roles and their metadata.
         */
        this.app.get('/api/admin/roles', check('perm:role.manage'), async (req, res) => {
            const result = await RolesDB.getAllRoles(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Create a new role.
         */
        this.app.post('/api/admin/role', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const { name, description, permissions } = req.body;
            const result = await RolesDB.createRole(this.db, name, description, permissions);
            result.getResponse(res);
        });

        /**
         * Update an existing role definition.
         * Updates basic metadata and syncs the associated permissions.
         */
        this.app.put('/api/admin/role/:id', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const { name, description, permissions } = req.body;
            const result = await RolesDB.updateRole(this.db, req.params.id, name, description, permissions);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });

        /**
         * Delete a role definition.
         * Users assigned this role will lose its associated permissions.
         */
        this.app.delete('/api/admin/role/:id', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.deleteRole(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });
    }
}

module.exports = AdminRoles;