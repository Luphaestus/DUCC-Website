/**
 * AttendanceAPI.js
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

export default class AttendanceAPI {
    /**
     * @param {object} app - Express app.
     * @param {object} db - SQLite database.
     */
    constructor(app, db) {
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
        this.app.get('/api/event/:id/isAttending', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const eventRes = await EventsDB.get_event_by_id(this.db, req.user.id, eventId);
            if (eventRes.isError()) return eventRes.getResponse(res);

            const isAttending = await AttendanceDB.is_user_attending_event(this.db, req.user.id, eventId);
            if (isAttending.isError()) { return isAttending.getResponse(res); }
            res.json({ isAttending: isAttending.getData() });
        });

        /**
         * Check if current user has paid for an event.
         */
        this.app.get('/api/event/:id/isPaying', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const isPaying = await AttendanceDB.isUserPayingForEvent(this.db, req.user.id, eventId);
            if (isPaying.isError()) { return isPaying.getResponse(res); }
            res.json({ isPaying: isPaying.getData() });
        });

        /**
         * Get count of instructors attending an event.
         */
        this.app.get('/api/event/:id/coachCount', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const count = await AttendanceDB.getCoachesAttendingCount(this.db, eventId);
            res.json({ count });
        });

        /**
         * Check if user can join an event.
         */
        this.app.get('/api/event/:id/canJoin', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            const eventRes = await EventsDB.get_event_by_id(this.db, req.user.id, eventId);
            if (eventRes.isError()) return res.status(404).json({ message: 'Event not found' });

            const user = await UserDB.getElementsById(this.db, req.user.id, ['id', 'is_instructor', 'filled_legal_info', 'is_member', 'free_sessions', 'difficulty_level']);
            if (user.isError()) return user.getResponse(res);

            const status = await EventRules.canJoinEvent(this.db, eventRes.getData(), user.getData());
            res.json({ canJoin: !status.isError(), reason: status.getMessage() });
        });

        /**
         * Register current user for an event.
         */
        this.app.post('/api/event/:id/attend', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            try {
                await this.db.run('BEGIN IMMEDIATE');

                const eventRes = await EventsDB.get_event_by_id(this.db, req.user.id, eventId)
                if (eventRes.isError()) {
                    await this.db.run('ROLLBACK');
                    return res.status(404).json({ message: 'Event not found' });
                }
                const event = eventRes.getData();

                const user = await UserDB.getElementsById(this.db, req.user.id, ['id', 'is_instructor', 'filled_legal_info', 'is_member', 'free_sessions', 'difficulty_level']);
                if (user.isError()) {
                    await this.db.run('ROLLBACK');
                    return user.getResponse(res);
                }

                const canJoin = await EventRules.canJoinEvent(this.db, event, user.getData());
                if (canJoin.isError()) {
                    await this.db.run('ROLLBACK');
                    return canJoin.getResponse(res);
                }

                const membershipStatus = user.getData();
                let usedFreeSession = false;

                if (membershipStatus.is_instructor && event.is_canceled) {
                    await EventsDB.setEventCancellation(this.db, eventId, false);
                }

                if (!membershipStatus.is_member) {
                    const updateStatus = await UserDB.writeElementsById(this.db, req.user.id, { free_sessions: membershipStatus.free_sessions - 1 });
                    if (updateStatus.isError()) {
                        await this.db.run('ROLLBACK');
                        return updateStatus.getResponse(res);
                    }
                    usedFreeSession = true;
                }

                let transactionStatus = new statusObject(200, null, null);
                if (event.upfront_cost > 0) {
                    transactionStatus = await TransactionsDB.add_transaction(this.db, req.user.id, -event.upfront_cost, `${event.title} upfront cost`, eventId);
                    if (transactionStatus.isError()) {
                        // UserDB write will be rolled back by transaction rollback
                        await this.db.run('ROLLBACK');
                        return transactionStatus.getResponse(res);
                    }

                    if (event.upfront_refund_cutoff && (new Date() > new Date(event.upfront_refund_cutoff))) {
                        const refundIdRes = await AttendanceDB.get_event_refund_id(this.db, req.user.id, eventId);
                        if (!refundIdRes.isError()) {
                            const refundData = refundIdRes.getData();
                            if (refundData.user_id) await AttendanceDB.refundEvent(this.db, eventId, refundData.user_id);
                            else await TransactionsDB.delete_transaction(this.db, refundData.payment_transaction_id);
                        }
                    }
                };

                const status = await AttendanceDB.attend_event(this.db, req.user.id, eventId, transactionStatus.getData());
                if (status.isError()) {
                    await this.db.run('ROLLBACK');
                    return status.getResponse(res);
                }

                await this.db.run('COMMIT');
                return status.getResponse(res);
            } catch (error) {
                await this.db.run('ROLLBACK');
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        /**
         * Unregister current user from an event.
         */
        this.app.post('/api/event/:id/leave', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            if (!(await AttendanceDB.is_user_attending_event(this.db, req.user.id, eventId)).getData()) {
                return res.status(400).json({ message: 'Not attending' });
            }

            const eventRes = await EventsDB.get_event_by_id(this.db, req.user.id, eventId)
            if (eventRes.isError()) return res.status(404).json({ message: 'Event not found' });
            const event = eventRes.getData();

            if (event.is_canceled) return res.status(400).json({ message: 'Event is canceled' });

            const userStatus = await UserDB.getElementsById(this.db, req.user.id, ['is_instructor']);
            if (!!userStatus.getData().is_instructor) {
                const coachCount = await AttendanceDB.getCoachesAttendingCount(this.db, eventId);
                if (coachCount === 1) {
                    await EventsDB.setEventCancellation(this.db, eventId, true);
                }
            }

            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            const now = new Date();
            if (now >= endDate) return res.status(400).json({ message: 'Event ended' });
            else if (now >= startDate) return res.status(400).json({ message: 'Event started' });

            const membershipStatus = await UserDB.getElementsById(this.db, req.user.id, ['is_member', 'free_sessions']);
            if (membershipStatus.isError()) return membershipStatus.getResponse(res);

            if (!membershipStatus.getData().is_member) {
                const updateStatus = await UserDB.writeElementsById(this.db, req.user.id, { free_sessions: membershipStatus.getData().free_sessions + 1 });
                if (updateStatus.isError()) return updateStatus.getResponse(res);
            }

            const status = await AttendanceDB.leave_event(this.db, req.user.id, eventId);
            if (status.isError()) return status.getResponse(res);

            if (event.upfront_cost > 0) {
                if (!event.upfront_refund_cutoff || (new Date() <= new Date(event.upfront_refund_cutoff))) {
                    const txIdStatus = await TransactionsDB.get_transactionid_by_event(this.db, eventId, req.user.id);
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
                        }
                    }
                } catch (e) {
                    console.error("Error promoting user from waitlist:", e);
                }
            }

            return status.getResponse(res);
        });

        /**
         * Fetch list of attendees for an event.
         */
        this.app.get('/api/event/:id/attendees', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            const eventCheck = await EventsDB.get_event_by_id(this.db, req.user.id, eventId);
            if (eventCheck.isError()) return eventCheck.getResponse(res);

            const isExec = await Permissions.hasAnyPermission(this.db, req.user.id);

            let attendees;
            if (isExec) {
                attendees = await AttendanceDB.get_all_event_attendees_history(this.db, eventId);
            } else {
                attendees = await AttendanceDB.get_users_attending_event(this.db, eventId);
            }

            if (attendees.isError()) return attendees.getResponse(res);
            res.json({ attendees: attendees.getData() });
        });
    }
}
