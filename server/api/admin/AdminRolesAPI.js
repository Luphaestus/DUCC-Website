const check = require('../../misc/authentication.js');
const RolesDB = require('../../db/rolesDB.js');

/**
 * Admin API for managing roles and permissions.
 * @module AdminRoles
 */
class AdminRoles {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers admin role routes.
     */
    registerRoutes() {
        /**
         * List all permissions.
         */
        this.app.get('/api/admin/permissions', check('perm:role.read | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.getAllPermissions(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * List all roles.
         */
        this.app.get('/api/admin/roles', check('perm:role.manage'), async (req, res) => {
            const result = await RolesDB.getAllRoles(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Create role.
         */
        this.app.post('/api/admin/role', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const { name, description, permissions } = req.body;
            const result = await RolesDB.createRole(this.db, name, description, permissions);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Update role.
         */
        this.app.put('/api/admin/role/:id', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const { name, description, permissions } = req.body;
            const result = await RolesDB.updateRole(this.db, req.params.id, name, description, permissions);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });

        /**
         * Delete role definition.
         */
        this.app.delete('/api/admin/role/:id', check('perm:role.write | perm:role.manage'), async (req, res) => {
            const result = await RolesDB.deleteRole(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });
    }
}

module.exports = AdminRoles;