/**
 * AdminRolesAPI.js
 * 
 * This file handles management of roles and their associated permissions.
 * It allows admins to define roles (e.g. "Canoe Captain") and assign permissions to them.
 * 
 * Routes:
 * - GET /api/admin/roles/permissions: Fetch all available system permissions.
 * - GET /api/admin/roles: Fetch all currently defined roles.
 * - GET /api/admin/roles/:id: Fetch a specific role definition.
 * - POST /api/admin/roles: Create a new role definition.
 * - PUT /api/admin/roles/:id: Update a role's name and permission list.
 * - DELETE /api/admin/roles/:id: Remove a role definition (does not delete users).
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
        this.app.get('/api/admin/roles/permissions', check('perm:role.read | perm:role.manage'), async (req, res) => {
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
         * Fetch a specific role by ID.
         */
        this.app.get('/api/admin/roles/:id', check('perm:role.manage'), async (req, res) => {
            const result = await RolesDB.getRoleById(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Create a new role.
         */
        this.app.post('/api/admin/roles', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const { name, description, permissions } = req.body;
            const result = await RolesDB.createRole(this.db, name, description, permissions);
            result.getResponse(res);
        });

        /**
         * Update an existing role definition.
         * Updates basic metadata and syncs the associated permissions.
         */
        this.app.put('/api/admin/roles/:id', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const { name, description, permissions } = req.body;
            const result = await RolesDB.updateRole(this.db, req.params.id, name, description, permissions);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });

        /**
         * Delete a role definition.
         * Users assigned this role will lose its associated permissions.
         */
        this.app.delete('/api/admin/roles/:id', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.deleteRole(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });
    }
}

module.exports = AdminRoles;