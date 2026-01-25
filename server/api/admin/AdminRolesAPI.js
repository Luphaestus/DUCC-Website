/**
 * AdminRolesAPI.js
 * 
 * This file handles management of roles and their associated permissions.
 */

const check = require('../../misc/authentication.js');
const RolesDB = require('../../db/rolesDB.js');

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
         */
        this.app.put('/api/admin/roles/:id', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const { name, description, permissions } = req.body;
            const result = await RolesDB.updateRole(this.db, req.params.id, name, description, permissions);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });

        /**
         * Delete a role definition.
         */
        this.app.delete('/api/admin/roles/:id', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.deleteRole(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });
    }
}

module.exports = AdminRoles;