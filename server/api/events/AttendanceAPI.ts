/**
 * AttendanceAPI.ts
 * 
 * This file handles user participation in events.
 */

import EventsDB from '../../db/eventsDB.js';
import AttendanceDB from '../../db/attendanceDB.js';
import TransactionsDB from '../../db/transactionDB.js';
import UserDB from '../../db/userDB.js';
import EventRules from '../../rules/EventRules.js';
import check from '../../misc/authentication.js';
import { statusObject } from '../../misc/status.js';
import { Permissions } from '../../misc/permissions.js';
import WaitlistDB from '../../db/waitlistDB.js';
import KitDB from '../../db/kitDB.js';
import Logger from '../../misc/Logger.js';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { DatabaseWrapper } from '../../db/db.js';
import NotificationsAPI from '../NotificationsAPI.js';
import { NotificationType } from '../../types/notifications.js';

export default class AttendanceAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    /**
     * @param {object} app - Fastify app.
     * @param {object} db - SQLite database.
     */
    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all routes related to event attendance and participation.
     */
    registerRoutes() {
        /**
         * Check if current user is attending an event.
         */
        this.app.get('/api/event/:id/isAttending', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) {
                return reply.status(400).send({ message: 'Event ID must be an integer' });
            }

            const eventRes = await EventsDB.get_event_by_id(this.db, request.user.id, eventId);
            if (eventRes.isError()) return eventRes.getResponse(reply);

            const isAttending = await AttendanceDB.is_user_attending_event(this.db, request.user.id, eventId);
            if (isAttending.isError()) { return isAttending.getResponse(reply); }
            return reply.send({ isAttending: isAttending.getData() });
        });

        /**
         * Check if current user has paid for an event.
         */
        this.app.get('/api/event/:id/isPaying', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) {
                return reply.status(400).send({ message: 'Event ID must be an integer' });
            }

            const isPaying = await AttendanceDB.isUserPayingForEvent(this.db, request.user.id, eventId);
            if (isPaying.isError()) { return isPaying.getResponse(reply); }
            return reply.send({ isPaying: isPaying.getData() });
        });

        /**
         * Get count of instructors attending an event.
         */
        this.app.get('/api/event/:id/coachCount', async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) {
                return reply.status(400).send({ message: 'Event ID must be an integer' });
            }

            const count = await AttendanceDB.getCoachesAttendingCount(this.db, eventId);
            return reply.send({ count });
        });

        /**
         * Check if user can join an event.
         */
        this.app.get('/api/event/:id/canJoin', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) return reply.status(400).send({ message: 'Event ID must be an integer' });

            const eventRes = await EventsDB.get_event_by_id(this.db, request.user.id, eventId);
            if (eventRes.isError()) return reply.status(404).send({ message: 'Event not found' });

            const user = await UserDB.getElementsById(this.db, request.user.id, ['id', 'is_instructor', 'filled_legal_info', 'is_member', 'free_sessions', 'difficulty_level']);
            if (user.isError()) return user.getResponse(reply);

            const status = await EventRules.canJoinEvent(this.db, eventRes.getData(), user.getData());
            return reply.send({ canJoin: !status.isError(), reason: status.getMessage() });
        });

        /**
         * Register current user for an event.
         */
        this.app.post('/api/event/:id/attend', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) {
                return reply.status(400).send({ message: 'Event ID must be an integer' });
            }

            try {
                const resultStatus = await this.db.transaction(async (trxDb) => {
                    const eventRes = await EventsDB.get_event_by_id(trxDb, request.user.id, eventId)
                    if (eventRes.isError()) return eventRes;
                    const event = eventRes.getData();

                    const user = await UserDB.getElementsById(trxDb, request.user.id, ['id', 'is_instructor', 'filled_legal_info', 'is_member', 'free_sessions', 'difficulty_level']);
                    if (user.isError()) return user;

                    const canJoin = await EventRules.canJoinEvent(trxDb, event, user.getData());
                    if (canJoin.isError()) return canJoin;

                    const membershipStatus = user.getData();

                    if (membershipStatus.is_instructor && event.is_canceled) {
                        await EventsDB.setEventCancellation(trxDb, eventId, false);
                    }

                    if (!membershipStatus.is_member) {
                        const updateStatus = await UserDB.writeElementsById(trxDb, request.user.id, { free_sessions: membershipStatus.free_sessions - 1 });
                        if (updateStatus.isError()) return updateStatus;
                    }

                    let transactionStatus = new statusObject(200, null, null);
                    if (event.upfront_cost > 0) {
                        transactionStatus = await TransactionsDB.add_transaction(trxDb, request.user.id, -event.upfront_cost, `${event.title} upfront cost`, eventId);
                        if (transactionStatus.isError()) return transactionStatus;

                        if (event.upfront_refund_cutoff && (new Date() > new Date(event.upfront_refund_cutoff))) {
                            const refundIdRes = await AttendanceDB.get_event_refund_id(trxDb, request.user.id, eventId);
                            if (!refundIdRes.isError()) {
                                const refundData = refundIdRes.getData();
                                if (refundData.user_id) await AttendanceDB.refundEvent(trxDb, eventId, refundData.user_id);
                                else await TransactionsDB.delete_transaction(trxDb, refundData.payment_transaction_id);
                            }
                        }
                    };

                    const status = await AttendanceDB.attend_event(trxDb, request.user.id, eventId, transactionStatus.getData());
                    if (status.isError()) return status;

                    await KitDB.applyUserDefaultKit(trxDb, request.user.id, eventId);
                    
                    return status;
                });

                if (resultStatus.isError()) {
                    return resultStatus.getResponse(reply);
                }

                const EventHub = (await import('../../misc/EventHub.js')).default;
                const userFull = await UserDB.getElementsById(this.db, request.user.id, [
                    'id', 'first_name', 'last_name', 'profile_picture_color', 
                    'profile_picture_font', 'profile_picture_initials', 'profile_picture_path'
                ]);

                EventHub.broadcast('attendance_update', { 
                    eventId, 
                    user: userFull.getData(), 
                    action: 'joined' 
                });
                
                return resultStatus.getResponse(reply);
            } catch (error: any) {
                Logger.error(error);
                return reply.status(500).send({ message: 'Internal server error' });
            }
        });

        /**
         * Unregister current user from an event.
         */
        this.app.post('/api/event/:id/leave', { preHandler: [check()] }, async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) return reply.status(400).send({ message: 'Event ID must be an integer' });

            if (!(await AttendanceDB.is_user_attending_event(this.db, request.user.id, eventId)).getData()) {
                return reply.status(400).send({ message: 'Not attending' });
            }

            const eventRes = await EventsDB.get_event_by_id(this.db, request.user.id, eventId)
            if (eventRes.isError()) return reply.status(404).send({ message: 'Event not found' });
            const event = eventRes.getData();

            if (event.is_canceled) return reply.status(400).send({ message: 'Event is canceled' });

            const userStatus = await UserDB.getElementsById(this.db, request.user.id, ['is_instructor']);
            if (!!userStatus.getData().is_instructor) {
                const coachCount = await AttendanceDB.getCoachesAttendingCount(this.db, eventId);
                if (coachCount === 1) {
                    await EventsDB.setEventCancellation(this.db, eventId, true);
                }
            }

            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            const now = new Date();
            if (now >= endDate) return reply.status(400).send({ message: 'Event ended' });
            else if (now >= startDate) return reply.status(400).send({ message: 'Event started' });

            const membershipStatus = await UserDB.getElementsById(this.db, request.user.id, ['is_member', 'free_sessions']);
            if (membershipStatus.isError()) return membershipStatus.getResponse(reply);

            if (!membershipStatus.getData().is_member) {
                const updateStatus = await UserDB.writeElementsById(this.db, request.user.id, { free_sessions: membershipStatus.getData().free_sessions + 1 });
                if (updateStatus.isError()) return updateStatus.getResponse(reply);
            }

            const status = await AttendanceDB.leave_event(this.db, request.user.id, eventId);
            if (status.isError()) return status.getResponse(reply);

            const EventHub = (await import('../../misc/EventHub.js')).default;
            EventHub.broadcast('attendance_update', { eventId, userId: request.user.id, action: 'left' });

            if (event.upfront_cost > 0) {
                if (!event.upfront_refund_cutoff || (new Date() <= new Date(event.upfront_refund_cutoff))) {
                    const txIdStatus = await TransactionsDB.get_transactionid_by_event(this.db, eventId, request.user.id);
                    if (!txIdStatus.isError()) await TransactionsDB.delete_transaction(this.db, txIdStatus.getData());
                }
            }

            const nextUserRes = await WaitlistDB.get_next_on_waiting_list(this.db, eventId);
            const nextUserId = nextUserRes.getData();

            if (nextUserId) {
                try {
                    const nextUser = await UserDB.getElementsById(this.db, nextUserId, ['is_member', 'free_sessions', 'filled_legal_info']);
                    if (!nextUser.isError()) {
                        const u = nextUser.getData();

                        let eligible = true;
                        if (!u.filled_legal_info) eligible = false;
                        if (!u.is_member && u.free_sessions <= 0) eligible = false;

                        if (eligible) {
                            if (!u.is_member) {
                                await UserDB.writeElementsById(this.db, nextUserId, { free_sessions: u.free_sessions - 1 });
                            }

                            let transactionId = null;
                            if (event.upfront_cost > 0) {
                                const txRes = await TransactionsDB.add_transaction(this.db, nextUserId, -event.upfront_cost, `${event.title} upfront cost (Waitlist Promotion)`);
                                if (!txRes.isError()) {
                                    transactionId = txRes.getData();
                                }
                            }

                            await AttendanceDB.attend_event(this.db, nextUserId, eventId, transactionId);
                            await WaitlistDB.remove_user_from_waiting_list(this.db, eventId, nextUserId);

                            // Send Push Notification
                            await NotificationsAPI.sendNotificationToUser(
                                this.db,
                                nextUserId,
                                `Promoted from Waitlist: ${event.title} - DUCC`,
                                `Good news! You've been promoted to the attendee list for "${event.title}".`,
                                `/event/${eventId}`,
                                NotificationType.EVENTS
                            );
                        }
                    }
                } catch (e) {
                    Logger.error("Error promoting user from waitlist:", e);
                }
            }

            return status.getResponse(reply);
        });

        /**
         * Fetch list of attendees for an event.
         */
        this.app.get('/api/event/:id/attendees', async (request: any, reply: FastifyReply) => {
            const eventId = parseInt(request.params.id, 10);
            if (Number.isNaN(eventId)) return reply.status(400).send({ message: 'Event ID must be an integer' });

            const userId = request.user ? request.user.id : null;
            const eventCheck = await EventsDB.get_event_by_id(this.db, userId, eventId);
            if (eventCheck.isError()) return eventCheck.getResponse(reply);

            const isExec = userId ? await Permissions.hasAnyPermission(this.db, userId) : false;

            let attendees;
            if (isExec) {
                attendees = await AttendanceDB.get_all_event_attendees_history(this.db, eventId);
            } else {
                attendees = await AttendanceDB.get_users_attending_event(this.db, eventId);
            }

            if (attendees.isError()) return attendees.getResponse(reply);
            return reply.send({ attendees: attendees.getData() });
        });
    }
}
