/**
 * AdminRolesAPI.ts
 * 
 * This file handles management of roles and their associated permissions.
 */

import check from '../../misc/authentication.js';
import RolesDB from '../../db/rolesDB.js';
import { Express, Request, Response } from 'express';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminRoles {
    app: Express;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Express application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app: Express, db: DatabaseWrapper) {
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
        this.app.get('/api/admin/roles/permissions', check('perm:role.read | perm:role.manage'), async (req: Request, res: Response) => {
            const result = await RolesDB.getAllPermissions(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Update a permission description.
         */
        this.app.put('/api/admin/permissions/:id', check('perm:role.manage'), async (req: Request, res: Response) => {
            const { description } = req.body;
            const { id } = req.params;
            try {
                await this.db.run('UPDATE permissions SET description = ? WHERE id = ?', [description, id]);
                res.status(200).json({ message: 'Permission updated.' });
            } catch (e) {
                res.status(500).json({ message: 'Database error.' });
            }
        });

        /**
         * List all defined roles and their metadata.
         */
        this.app.get('/api/admin/roles', check('perm:is_exec'), async (req: Request, res: Response) => {
            const result = await RolesDB.getAllRoles(this.db);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Fetch a specific role by ID.
         */
        this.app.get('/api/admin/roles/:id', check('perm:role.manage'), async (req: Request, res: Response) => {
            const result = await RolesDB.getRoleById(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json(result.getData());
        });

        /**
         * Create a new role.
         */
        this.app.post('/api/admin/roles', check('perm:role.write | perm:role.manage'), async (req: Request, res: Response) => {
            const { name, description, permissions, execRanking } = req.body;
            const result = await RolesDB.createRole(this.db, name, description, permissions, execRanking);
            result.getResponse(res);
        });

        /**
         * Update an existing role definition.
         */
        this.app.put('/api/admin/roles/:id', check('perm:role.write | perm:role.manage'), async (req: Request, res: Response) => {
            const { name, description, permissions, execRanking } = req.body;
            const result = await RolesDB.updateRole(this.db, req.params.id, name, description, permissions, execRanking);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });

        /**
         * Delete a role definition.
         */
        this.app.delete('/api/admin/roles/:id', check('perm:role.write | perm:role.manage'), async (req: Request, res: Response) => {
            const result = await RolesDB.deleteRole(this.db, req.params.id);
            if (result.isError()) return result.getResponse(res);
            res.json({ message: result.getMessage() });
        });
    }
}
