/**
 * WaitlistAPI.ts
 * 
 * This file manages the waiting list functionality for events.
 */

import EventsDB from '../../db/eventsDB.js';
import WaitlistDB from '../../db/waitlistDB.js';
import AttendanceDB from '../../db/attendanceDB.js';
import UserDB from '../../db/userDB.js';
import check from '../../misc/authentication.js';
import { Permissions } from '../../misc/permissions.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';

export default class WaitlistAPI {
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
     * Registers all waitlist-related routes.
     */
    registerRoutes() {
        /**
         * Check if current user is on the waiting list.
         */
        this.app.get('/api/event/:id/isOnWaitlist', async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) return reply.status(400).send({ message: 'Event ID must be an integer' });

            if (!request.user) return reply.send({ isOnWaitlist: false });

            const onList = await WaitlistDB.is_user_on_waiting_list(this.db, request.user.id, eventId);
            if (onList.isError()) return onList.getResponse(reply);
            return reply.send({ isOnWaitlist: onList.getData() });
        });

        /**
         * Add the current user to the waiting list.
         */
        this.app.post('/api/event/:id/waitlist/join', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) return reply.status(400).send({ message: 'Event ID must be an integer' });

            const eventRes = await EventsDB.get_event_by_id(this.db, request.user.id, eventId);
            if (eventRes.isError()) return eventRes.getResponse(reply);
            const event = eventRes.getData();

            if (!event.enable_waitlist) return reply.status(400).send({ message: 'Waitlist is disabled for this event' });

            const user = await UserDB.getElementsById(this.db, request.user.id, ['filled_legal_info']);
            if (user.isError()) return user.getResponse(reply);
            if (!user.getData().filled_legal_info) return reply.status(403).send({ message: 'Legal info incomplete' });

            const isAttending = await AttendanceDB.is_user_attending_event(this.db, request.user.id, eventId);
            if (isAttending.getData()) return reply.status(400).send({ message: 'Already attending' });

            const maxAttendance = event.max_attendees;
            if (maxAttendance !== null && maxAttendance > 0) {
                const currentAttendance = await AttendanceDB.get_event_attendance_count(this.db, eventId);
                if (currentAttendance.isError()) return currentAttendance.getResponse(reply);
                if (currentAttendance.getData() < maxAttendance) {
                    return reply.status(400).send({ message: 'Event is not full; cannot join waitlist' });
                }
            }

            const status = await WaitlistDB.join_waiting_list(this.db, request.user.id, eventId);
            return status.getResponse(reply);
        });

        /**
         * Remove the current user from the waiting list.
         */
        this.app.post('/api/event/:id/waitlist/leave', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) return reply.status(400).send({ message: 'Event ID must be an integer' });

            const status = await WaitlistDB.leave_waiting_list(this.db, request.user.id, eventId);
            return status.getResponse(reply);
        });

        /**
         * Get waiting list information for an event.
         */
        this.app.get('/api/event/:id/waitlist', async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) {
                return reply.status(400).send({ message: 'Event ID must be an integer' });
            }

            const eventRes = await EventsDB.get_event_by_id(this.db, request.user ? request.user.id : null, eventId);
            if (eventRes.isError()) return eventRes.getResponse(reply);

            const isExec = request.user ? await Permissions.hasAnyPermission(this.db, request.user.id) : false;

            const waitlistCount = await WaitlistDB.get_waiting_list_count(this.db, eventId);
            if (waitlistCount.isError()) return waitlistCount.getResponse(reply);

            const result: any = {
                count: waitlistCount.getData()
            };

            if (isExec) {
                const waitlist = await WaitlistDB.get_waiting_list(this.db, eventId);
                if (waitlist.isError()) return waitlist.getResponse(reply);
                result.waitlist = waitlist.getData();
            }

            if (request.user) {
                const onList = await WaitlistDB.is_user_on_waiting_list(this.db, request.user.id, eventId);
                if (!onList.isError() && onList.getData()) {
                    const position = await WaitlistDB.get_waiting_list_position(this.db, eventId, request.user.id);
                    if (!position.isError()) {
                        result.position = position.getData();
                    }
                }
            }

            return reply.send(result);
        });
    }
}