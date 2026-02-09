/**
 * AdminRolesAPI.ts
 * 
 * This file handles management of roles and their associated permissions.
 */

import check from '../../misc/authentication.js';
import RolesDB from '../../db/rolesDB.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class AdminRoles {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify application instance.
     * @param {object} db - Database connection instance.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
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
        this.app.get('/api/admin/roles/permissions', { preHandler: [check('perm:role.read | perm:role.manage')] }, async (request: FastifyRequest, reply: FastifyReply) => {
            const result = await RolesDB.getAllPermissions(this.db);
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        /**
         * Update a permission description.
         */
        this.app.put<{ Params: { id: string }, Body: { description: string } }>('/api/admin/permissions/:id', { preHandler: [check('perm:role.manage')] }, async (request, reply) => {
            const { description } = request.body;
            const { id } = request.params;
            try {
                await this.db.run('UPDATE permissions SET description = ? WHERE id = ?', [description, id]);
                return reply.status(200).send({ message: 'Permission updated.' });
            } catch (e) {
                return reply.status(500).send({ message: 'Database error.' });
            }
        });

        /**
         * List all defined roles and their metadata.
         */
        this.app.get('/api/admin/roles', { preHandler: [check('perm:is_exec')] }, async (request, reply) => {
            const result = await RolesDB.getAllRoles(this.db);
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        /**
         * Fetch a specific role by ID.
         */
        this.app.get<{ Params: { id: string } }>('/api/admin/roles/:id', { preHandler: [check('perm:role.manage')] }, async (request, reply) => {
            const result = await RolesDB.getRoleById(this.db, request.params.id);
            if (result.isError()) return result.getResponse(reply);
            return reply.send(result.getData());
        });

        /**
         * Create a new role.
         */
        this.app.post('/api/admin/roles', { preHandler: [check('perm:role.write | perm:role.manage')] }, async (request, reply) => {
            const { name, description, permissions, execRanking } = request.body as any;
            const result = await RolesDB.createRole(this.db, name, description, permissions, execRanking);
            return result.getResponse(reply);
        });

        /**
         * Update an existing role definition.
         */
        this.app.put<{ Params: { id: string } }>('/api/admin/roles/:id', { preHandler: [check('perm:role.write | perm:role.manage')] }, async (request, reply) => {
            const { name, description, permissions, execRanking } = request.body as any;
            const result = await RolesDB.updateRole(this.db, request.params.id, name, description, permissions, execRanking);
            if (result.isError()) return result.getResponse(reply);
            return reply.send({ message: result.getMessage() });
        });

        /**
         * Delete a role definition.
         */
        this.app.delete<{ Params: { id: string } }>('/api/admin/roles/:id', { preHandler: [check('perm:role.write | perm:role.manage')] }, async (request, reply) => {
            const result = await RolesDB.deleteRole(this.db, request.params.id);
            if (result.isError()) return result.getResponse(reply);
            return reply.send({ message: result.getMessage() });
        });
    }
}