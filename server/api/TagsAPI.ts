/**
 * TagsAPI.ts
 * 
 * This file handles all event tag management routes.
 */

import TagsDB from '../db/tagsDB.js';
import check from '../misc/authentication.js';
import { Permissions } from '../misc/permissions.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../db/db.js';

export default class TagsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify app instance.
     * @param {object} db - Database connection.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all tag-related management and lookup routes.
     */
    registerRoutes() {
        /**
         * Fetch all tags.
         */
        this.app.get('/api/tags', async (request: FastifyRequest, reply: FastifyReply) => {
            const result = await TagsDB.getAllTags(this.db);
            return result.getResponse(reply);
        });

        /**
         * Create a new tag.
         */
        this.app.post('/api/tags', { preHandler: [check('perm:event.write.all | perm:manage.all | perm:user.manage')] }, async (request: FastifyRequest, reply: FastifyReply) => {
            const result = await TagsDB.createTag(this.db, request.body as any);
            return result.getResponse(reply);
        });

        /**
         * Update an existing tag.
         */
        this.app.put('/api/tags/:id', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            if (!await Permissions.canManageTag(this.db, request.user.id, request.params.id)) {
                return reply.status(403).send({ message: 'Forbidden' });
            }

            const result = await TagsDB.updateTag(this.db, request.params.id, request.body as any);
            return result.getResponse(reply);
        });

        /**
         * Reset tag image to default (none).
         */
        this.app.post('/api/tags/:id/reset-image', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            if (!await Permissions.canManageTag(this.db, request.user.id, request.params.id)) {
                return reply.status(403).send({ message: 'Forbidden' });
            }

            const result = await TagsDB.resetImage(this.db, request.params.id);
            return result.getResponse(reply);
        });

        /**
         * Delete a tag.
         */
        this.app.delete<{ Params: { id: string } }>('/api/tags/:id', { preHandler: [check('perm:event.manage.all | perm:user.manage')] }, async (request, reply) => {
            const result = await TagsDB.deleteTag(this.db, request.params.id);
            return result.getResponse(reply);
        });

        /**
         * Fetch whitelisted users for a tag.
         */
        this.app.get<{ Params: { id: string } }>('/api/tags/:id/whitelist', { preHandler: [check('perm:event.manage.all | perm:user.manage')] }, async (request, reply) => {
            const result = await TagsDB.getWhitelist(this.db, request.params.id);
            return result.getResponse(reply);
        });

        /**
         * Add a user to a tag's whitelist.
         */
        this.app.post<{ Params: { id: string }, Body: { userId: string } }>('/api/tags/:id/whitelist', { preHandler: [check('perm:event.manage.all | perm:user.manage')] }, async (request, reply) => {
            const result = await TagsDB.addToWhitelist(this.db, request.params.id, request.body.userId);
            return result.getResponse(reply);
        });

        /**
         * Remove a user from a tag's whitelist.
         */
        this.app.delete<{ Params: { id: string, userId: string } }>('/api/tags/:id/whitelist/:userId', { preHandler: [check('perm:event.manage.all | perm:user.manage')] }, async (request, reply) => {
            const result = await TagsDB.removeFromWhitelist(this.db, request.params.id, request.params.userId);
            return result.getResponse(reply);
        });

        /**
         * Fetch managers for a tag.
         */
        this.app.get<{ Params: { id: string } }>('/api/tags/:id/managers', { preHandler: [check('perm:event.manage.all | perm:user.manage')] }, async (request, reply) => {
            const result = await TagsDB.getManagers(this.db, request.params.id);
            return result.getResponse(reply);
        });

        /**
         * Assign a manager to a tag.
         */
        this.app.post<{ Params: { id: string }, Body: { userId: string } }>('/api/tags/:id/managers', { preHandler: [check('perm:event.manage.all | perm:user.manage')] }, async (request, reply) => {
            const result = await TagsDB.addManager(this.db, request.params.id, request.body.userId);
            return result.getResponse(reply);
        });

        /**
         * Remove a manager from a tag.
         */
        this.app.delete<{ Params: { id: string, userId: string } }>('/api/tags/:id/managers/:userId', { preHandler: [check('perm:event.manage.all | perm:user.manage')] }, async (request, reply) => {
            const result = await TagsDB.removeManager(this.db, request.params.id, request.params.userId);
            return result.getResponse(reply);
        });

        /**
         * Fetch tags for a specific user.
         */
        this.app.get('/api/user/:userId/tags', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            if (request.user.id != request.params.userId) {
                if (!await Permissions.hasPermission(this.db, request.user.id, 'user.manage')) {
                    return reply.status(403).send({ message: 'Forbidden' });
                }
            }

            try {
                const tags = await TagsDB.getTagsForUser(this.db, request.params.userId);
                return reply.send(tags);
            } catch (error) {
                return reply.status(500).send({ message: 'Internal error' });
            }
        });

        /**
         * Fetch tags for current authenticated user.
         */
        this.app.get('/api/user/tags', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            try {
                const tags = await TagsDB.getTagsForUser(this.db, request.user.id);
                return reply.send(tags);
            } catch (error) {
                return reply.status(500).send({ message: 'Internal error' });
            }
        });
    }
}