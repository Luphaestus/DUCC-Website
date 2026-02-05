/**
 * EventsAPI.ts
 * 
 * This file handles public and member event listing routes.
 */

import EventsDB from '../../db/eventsDB.js';
import UserDB from '../../db/userDB.js';
import TagsDB from '../../db/tagsDB.js';
import Globals from '../../misc/globals.js';
import check from '../../misc/authentication.js';
import { Permissions } from '../../misc/permissions.js';
import Logger from '../../misc/Logger.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class EventsAPI {
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
     * Registers public and member-facing event listing routes.
     */
    registerRoutes() {
        /**
         * Fetch events for a specific week, filtered by user difficulty.
         */
        this.app.get('/api/events/rweek/:offset', async (request: any, reply: FastifyReply) => {
            const userId = request.user ? request.user.id : null;
            // let max_difficulty_val; // unused in current logic but kept from original if needed
            
            if (userId) {
                const max_difficulty = await UserDB.getElementsById(this.db, userId, "difficulty_level");
                if (max_difficulty.isError()) return max_difficulty.getResponse(reply);
                // max_difficulty_val = max_difficulty.getData().difficulty_level;
            } else {
                // max_difficulty_val = new Globals().getInt("Unauthorized_max_difficulty");
            }

            const offset = parseInt(request.params.offset, 10);
            if (Number.isNaN(offset)) {
                return reply.status(400).send({ message: 'Offset must be an integer' });
            }
            if (Math.abs(offset) > 10000) {
                return reply.status(400).send({ message: 'Offset out of range' });
            }

            const events = await EventsDB.get_events_relative_week(this.db, offset, userId);
            if (events.isError()) { return events.getResponse(reply); }

            return reply.send({ events: events.getData() });
        });

        /**
         * Fetch events paged by logical chunks.
         */
        this.app.get('/api/events/paged/:page', async (request: any, reply: FastifyReply) => {
            const userId = request.user ? request.user.id : null;
            
            if (userId) {
                const max_difficulty = await UserDB.getElementsById(this.db, userId, "difficulty_level");
                if (max_difficulty.isError()) return max_difficulty.getResponse(reply);
            }

            const page = parseInt(request.params.page, 10);
            if (Number.isNaN(page)) return reply.status(400).send({ message: 'Page must be an integer' });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dayOfWeek = today.getDay();
            const isMonday = dayOfWeek === 1;

            let startDate = new Date(today);
            let endDate = new Date(today);

            const currentMonday = new Date(today);
            currentMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            if (page === 0) {
                startDate = new Date(today);
                if (dayOfWeek === 0) {
                    endDate.setDate(today.getDate() + 7);
                } else {
                    endDate.setDate(currentMonday.getDate() + 6);
                }
            } else if (page === -1) {
                if (isMonday) {
                    startDate = new Date(currentMonday);
                    startDate.setDate(currentMonday.getDate() - 7);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6);
                } else {
                    startDate = new Date(currentMonday);
                    endDate = new Date(today);
                    endDate.setDate(today.getDate() - 1);
                }
            } else {
                let weekOffset = page;
                if (!isMonday && page < 0) {
                    weekOffset = page + 1;
                }

                startDate = new Date(currentMonday);
                startDate.setDate(currentMonday.getDate() + (weekOffset * 7));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
            }

            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            const events = await EventsDB.get_events_in_range(this.db, startDate, endDate, userId);
            if (events.isError()) return events.getResponse(reply);

            return reply.send({ events: events.getData(), startDate, endDate });
        });

        /**
         * Fetch specific event details by ID.
         */
        this.app.get('/api/event/:id', async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) {
                return reply.status(400).send({ message: 'Event ID must be an integer' });
            }

            const event = await EventsDB.get_event_by_id(this.db, request.user ? request.user.id : null, eventId);
            if (event.isError()) { return event.getResponse(reply); }

            return reply.send({ event: event.getData() });
        });

        /**
         * Check if the current user is authorized to manage a specific event.
         */
        this.app.get('/api/event/:id/canManage', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) {
                return reply.status(400).send({ message: 'Event ID must be an integer' });
            }

            const canManage = await Permissions.canManageEvent(this.db, request.user.id, eventId);
            return reply.send({ canManage });
        });

        /**
         * Calculate fallback image for an event based on tag IDs.
         */
        this.app.post('/api/admin/events/calculate-fallback-image', { preHandler: [check('perm:event.manage.all | perm:event.manage.scoped')] }, async (request: FastifyRequest<{ Body: { tagIds: number[] } }>, reply: FastifyReply) => {
            const tagIds = request.body.tagIds;
            if (!Array.isArray(tagIds)) {
                return reply.status(400).send({ message: 'tagIds must be an array' });
            }

            try {
                let tags = [];
                if (tagIds.length > 0) {
                    tags = await TagsDB.getTagListByIds(this.db, tagIds);
                }
                const url = await (EventsDB as any)._getFallbackImage(this.db, tags);
                return reply.send({ url });
            } catch (error) {
                Logger.error(error);
                return reply.status(500).send({ message: 'Internal error' });
            }
        });
    }
}