const EventsDB = require('../../db/eventsDB.js');
const AttendanceDB = require('../../db/attendanceDB.js');
const TransactionsDB = require('../../db/transactionDB.js');
const UserDB = require('../../db/userDB.js');
const Rules = require('../../misc/rules.js');
const check = require('../../misc/authentication.js');
const { statusObject } = require('../../misc/status.js');
const { Permissions } = require('../../misc/permissions.js');

class AttendanceAPI {
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

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
        this.app.get('/api/event/:id/coachCount', async (req, res) => {
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

            const status = await Rules.canJoinEvent(this.db, eventRes.getData(), user.getData());
            res.json({ canJoin: !status.isError(), reason: status.getMessage() });
        });

        /**
         * Register current user for an event with validation (timing, capacity, debt, etc.).
         */
        this.app.post('/api/event/:id/attend', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const eventRes = await EventsDB.get_event_by_id(this.db, req.user.id, eventId)
            if (eventRes.isError()) return res.status(404).json({ message: 'Event not found' });
            const event = eventRes.getData();

            // Check Consolidated Rules
            const user = await UserDB.getElementsById(this.db, req.user.id, ['id', 'is_instructor', 'filled_legal_info', 'is_member', 'free_sessions', 'difficulty_level']);
            if (user.isError()) return user.getResponse(res);

            const canJoin = await Rules.canJoinEvent(this.db, event, user.getData());
            if (canJoin.isError()) return canJoin.getResponse(res);

            // 2. Handle Payment / Free Sessions Logic (Actions)
            const membershipStatus = user.getData();
            let usedFreeSession = false;

            if (membershipStatus.is_instructor && event.status === 'canceled') {
                await EventsDB.updateEventStatus(this.db, eventId, 'active');
            }

            if (!membershipStatus.is_member) {
                const updateStatus = await UserDB.writeElementsById(this.db, req.user.id, { free_sessions: membershipStatus.free_sessions - 1 });
                if (updateStatus.isError()) return updateStatus.getResponse(res);
                usedFreeSession = true;
            }

            let transactionStatus = new statusObject(200, null, null);
            if (event.upfront_cost > 0) {
                transactionStatus = await TransactionsDB.add_transaction(this.db, req.user.id, -event.upfront_cost, `${event.title} upfront cost`, eventId);
                if (transactionStatus.isError()) {
                    if (usedFreeSession) {
                        await UserDB.writeElementsById(this.db, req.user.id, { free_sessions: membershipStatus.free_sessions });
                    }
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
            return status.getResponse(res);
        });

        /**
         * Unregister current user from an event, handling refunds and mass removal if last coach leaves.
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

            const userStatus = await UserDB.getElementsById(this.db, req.user.id, ['is_instructor']);
            if (!!userStatus.getData().is_instructor) {
                const coachCount = await AttendanceDB.getCoachesAttendingCount(this.db, eventId);
                if (coachCount === 1) {
                    await EventsDB.updateEventStatus(this.db, eventId, 'canceled');
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

            // Check waiting list and promote
            const WaitlistDB = require('../../db/waitlistDB.js'); // Lazy load to ensure file exists or imported correctly
            const nextUserRes = await WaitlistDB.get_next_on_waiting_list(this.db, eventId);
            const nextUserId = nextUserRes.getData();

            if (nextUserId) {
                try {
                    // Fetch user details for eligibility check
                    const nextUser = await UserDB.getElementsById(this.db, nextUserId, ['is_member', 'free_sessions', 'filled_legal_info']);
                    if (!nextUser.isError()) {
                        const u = nextUser.getData();

                        // Check eligibility (ignoring debt for waiting list promotion)
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

                            // Promote user
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

module.exports = AttendanceAPI;