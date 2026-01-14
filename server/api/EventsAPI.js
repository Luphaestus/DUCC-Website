const EventsDB = require('../db/eventsDB.js');
const TransactionsDB = require('../db/transactionDB.js');
const UserDB = require('../db/userDB.js');
const Globals = require('../misc/globals.js');
const { statusObject } = require('../misc/status.js');
const check = require('../misc/authentication.js');

/**
 * Manages event listings, registration, and attendance-related transactions.
 * @module EventsAPI
 */
class EventsAPI {
    /**
     * @param {object} app
     * @param {object} db
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers event-related routes.
     */
    registerRoutes() {
        /**
         * Fetch events for a specific week, filtered by difficulty.
         */
        this.app.get('/api/events/rweek/:offset', async (req, res) => {
            const max_difficulty = await UserDB.getElements(req, this.db, "difficulty_level");
            var errorMaxDifficulty = null;
            if (max_difficulty.getStatus() == 401) {
                errorMaxDifficulty = new Globals().getInt("Unauthorized_max_difficulty");
            } else if (max_difficulty.isError()) { return max_difficulty.getResponse(res); }

            const offset = parseInt(req.params.offset, 10);
            if (Number.isNaN(offset)) {
                return res.status(400).json({ message: 'Offset must be an integer' });
            }

            const events = await EventsDB.get_events_relative_week(this.db, errorMaxDifficulty !== null ? errorMaxDifficulty : max_difficulty.getData().difficulty_level, offset, req.user ? req.user.id : null);
            if (events.isError()) { return events.getResponse(res); }

            res.json({ events: events.getData() });
        });

        /**
         * Fetch all accessible events.
         */
        this.app.get('/api/events', async (req, res) => {
            const max_difficulty = await UserDB.getElements(req, this.db, "difficulty_level");
            if (max_difficulty.isError()) { return max_difficulty.getResponse(res); }

            try {
                const events = await EventsDB.get_all_events(this.db, max_difficulty.getData().difficulty_level);
                res.json({ events });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        /**
         * Fetch event details by ID.
         */
        this.app.get('/api/event/:id', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const event = await EventsDB.get_event_by_id(req, this.db, eventId);
            if (event.isError()) { return event.getResponse(res); }

            res.json({ event: event.getData() });
        });

        /**
         * Check if current user is attending an event.
         */
        this.app.get('/api/event/:id/isAttending', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const isAttending = await EventsDB.is_user_attending_event(req, this.db, eventId);
            if (isAttending.isError()) { return isAttending.getResponse(res); }
            res.json({ isAttending: isAttending.getData() });
        });

        /**
         * Check if current user has paid for an event.
         */
        this.app.get('/api/event/:id/isPaying', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const isPaying = await EventsDB.isUserPayingForEvent(req, this.db, eventId);
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

            const count = await EventsDB.getCoachesAttendingCount(this.db, eventId);
            res.json({ count });
        });

        /**
         * Register current user for an event with validation (timing, capacity, debt, etc.).
         */
        this.app.post('/api/event/:id/attend', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const eventRes = await EventsDB.get_event_by_id(req, this.db, eventId)
            if (eventRes.isError()) return res.status(404).json({ message: 'Event not found' });

            const attendeeCountRes = await EventsDB.get_event_attendance_count(req, this.db, eventId);
            if (attendeeCountRes.isError()) return attendeeCountRes.getResponse(res);
            if (eventRes.getData().max_attendees <= attendeeCountRes.getData() && eventRes.getData().max_attendees !== 0) {
                return res.status(400).json({ message: 'Event is full' });
            }

            const startDate = new Date(eventRes.getData().start);
            const endDate = new Date(eventRes.getData().end);
            const now = new Date();
            if (now >= endDate) return res.status(400).json({ message: 'Event has ended' });
            else if (now >= startDate) return res.status(400).json({ message: 'Event has started' });

            const isUserPaying = await EventsDB.isUserPayingForEvent(req, this.db, eventId);
            if (isUserPaying.isError()) return isUserPaying.getResponse(res);

            if (!isUserPaying.getData()) {
                const balanceRes = await TransactionsDB.get_balance(req, this.db, req.user.id);
                if (balanceRes.isError()) return balanceRes.getResponse(res);
                if (balanceRes.getData() < new Globals().getFloat('MinMoney')) {
                    return res.status(403).json({ message: 'Outstanding debts' });
                }
            }

            const membershipStatus = await UserDB.getElements(req, this.db, ['is_member', 'free_sessions', 'filled_legal_info', 'is_instructor']);
            if (membershipStatus.isError()) return membershipStatus.getResponse(res);

            if (!membershipStatus.getData().is_instructor) {
                const coachCount = await EventsDB.getCoachesAttendingCount(this.db, eventId);
                if (coachCount === 0) return res.status(403).json({ message: 'No coach attending' });
            }

            if (!membershipStatus.getData().filled_legal_info) return res.status(403).json({ message: 'Legal info incomplete' });

            if (!membershipStatus.getData().is_member && membershipStatus.getData().free_sessions <= 0) {
                return res.status(403).json({ message: 'No free sessions remaining' });
            }

            const isAttendingRes = await EventsDB.is_user_attending_event(req, this.db, eventId);
            if (isAttendingRes.isError()) return isAttendingRes.getResponse(res);
            if (isAttendingRes.getData()) return res.status(400).json({ message: 'Already attending' });

            if (!membershipStatus.getData().is_member) {
                const updateStatus = await UserDB.writeElements(req, this.db, { free_sessions: membershipStatus.getData().free_sessions - 1 });
                if (updateStatus.isError()) return updateStatus.getResponse(res);
            }

            let transactionStatus = new statusObject(200, null, null);
            if (eventRes.getData().upfront_cost > 0) {
                transactionStatus = await TransactionsDB.add_transaction(req, this.db, req.user.id, -eventRes.getData().upfront_cost, `${eventRes.getData().title} upfront cost`, eventId);
                if (transactionStatus.isError()) {
                    await EventsDB.leave_event(req, this.db, eventId);
                    return transactionStatus.getResponse(res);
                }

                if (eventRes.getData().upfront_refund_cutoff && (new Date() > new Date(eventRes.getData().upfront_refund_cutoff))) {
                    const refundIdRes = await EventsDB.get_event_refund_id(req, this.db, eventId);
                    if (!refundIdRes.isError()) {
                        const refundData = refundIdRes.getData();
                        if (refundData.user_id) await EventsDB.refundEvent(this.db, eventId, refundData.user_id);
                        else await TransactionsDB.delete_transaction_admin(this.db, refundData.payment_transaction_id);
                    }
                }
            };

            const status = await EventsDB.attend_event(req, this.db, eventId, transactionStatus.getData());
            return status.getResponse(res);
        });

        /**
         * Unregister current user from an event, handling refunds and mass removal if last coach leaves.
         */
        this.app.post('/api/event/:id/leave', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            if (!(await EventsDB.is_user_attending_event(req, this.db, eventId)).getData()) {
                return res.status(400).json({ message: 'Not attending' });
            }

            const eventRes = await EventsDB.get_event_by_id(req, this.db, eventId)
            if (eventRes.isError()) return res.status(404).json({ message: 'Event not found' });
            const event = eventRes.getData();

            const userStatus = await UserDB.getElements(req, this.db, ['is_instructor']);
            if (!!userStatus.getData().is_instructor) {
                const coachCount = await EventsDB.getCoachesAttendingCount(this.db, eventId);
                if (coachCount === 1) {
                    const attendees = await EventsDB.get_users_attending_event(req, this.db, eventId);
                    if (!attendees.isError()) {
                        for (const attendee of attendees.getData()) {
                            if (attendee.id === req.user.id) continue;
                            const hasPaid = await EventsDB.isUserPayingForEvent({ user: { id: attendee.id }, isAuthenticated: () => true }, this.db, eventId);
                            if (hasPaid.getData()) await EventsDB.refundEvent(this.db, eventId, attendee.id);

                            const attInfo = await UserDB.getElementsById(this.db, attendee.id, ['is_member', 'free_sessions']);
                            if (!attInfo.getData().is_member) await UserDB.writeElementsById(this.db, attendee.id, { free_sessions: attInfo.getData().free_sessions + 1 });
                        }
                        await EventsDB.removeAllAttendees(this.db, eventId);
                    }
                }
            }

            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            const now = new Date();
            if (now >= endDate) return res.status(400).json({ message: 'Event ended' });
            else if (now >= startDate) return res.status(400).json({ message: 'Event started' });

            const membershipStatus = await UserDB.getElements(req, this.db, ['is_member', 'free_sessions']);
            if (membershipStatus.isError()) return membershipStatus.getResponse(res);

            if (!membershipStatus.getData().is_member) {
                const updateStatus = await UserDB.writeElements(req, this.db, { free_sessions: membershipStatus.getData().free_sessions + 1 });
                if (updateStatus.isError()) return updateStatus.getResponse(res);
            }

            const status = await EventsDB.leave_event(req, this.db, eventId);
            if (status.isError()) return status.getResponse(res);

            if (event.upfront_cost > 0) {
                if (!event.upfront_refund_cutoff || (new Date() <= new Date(event.upfront_refund_cutoff))) {
                    const txIdStatus = await TransactionsDB.get_transactionid_by_event(req, this.db, eventId, req.user.id);
                    if (!txIdStatus.isError()) await TransactionsDB.delete_transaction(req, this.db, txIdStatus.getData());
                }
            }

            // Check waiting list and promote
            const nextUserRes = await EventsDB.get_next_on_waiting_list(this.db, eventId);
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
                                const txRes = await TransactionsDB.add_transaction_admin(this.db, nextUserId, -event.upfront_cost, `${event.title} upfront cost (Waitlist Promotion)`);
                                if (!txRes.isError()) {
                                    transactionId = txRes.getData();
                                }
                            }

                            // Promote user
                            const mockReq = { user: { id: nextUserId }, isAuthenticated: () => true };
                            await EventsDB.attend_event(mockReq, this.db, eventId, transactionId);
                            await EventsDB.remove_user_from_waiting_list(this.db, eventId, nextUserId);
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

            const eventCheck = await EventsDB.get_event_by_id(req, this.db, eventId);
            if (eventCheck.isError()) return eventCheck.getResponse(res);

            const userElements = await UserDB.getElements(req, this.db, 'is_exec');
            const isExec = !userElements.isError() && !!userElements.getData().is_exec;

            let attendees;
            if (isExec) {
                attendees = await EventsDB.get_all_event_attendees_history(this.db, eventId);
            } else {
                attendees = await EventsDB.get_users_attending_event(req, this.db, eventId);
            }

            if (attendees.isError()) return attendees.getResponse(res);
            res.json({ attendees: attendees.getData() });
        });

        /**
         * Check if current user is on the waiting list.
         */
        this.app.get('/api/event/:id/isOnWaitlist', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            const onList = await EventsDB.is_user_on_waiting_list(req, this.db, eventId);
            if (onList.isError()) return onList.getResponse(res);
            res.json({ isOnWaitlist: onList.getData() });
        });

        /**
         * Join waiting list.
         */
        this.app.post('/api/event/:id/waitlist/join', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            const eventRes = await EventsDB.get_event_by_id(req, this.db, eventId);
            if (eventRes.isError()) return res.status(404).json({ message: 'Event not found' });

            // Ensure event is actually full or meets criteria?
            // User can only join waitlist if they are NOT attending.
            const isAttending = await EventsDB.is_user_attending_event(req, this.db, eventId);
            if (isAttending.getData()) return res.status(400).json({ message: 'Already attending' });

            const status = await EventsDB.join_waiting_list(req, this.db, eventId);
            return status.getResponse(res);
        });

        /**
         * Leave waiting list.
         */
        this.app.post('/api/event/:id/waitlist/leave', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            const status = await EventsDB.leave_waiting_list(req, this.db, eventId);
            return status.getResponse(res);
        });

        /**
         * Get waiting list information for an event.
         */
        this.app.get('/api/event/:id/waitlist', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const userElements = await UserDB.getElements(req, this.db, 'is_exec');
            const isExec = !userElements.isError() && !!userElements.getData().is_exec;

            const waitlistCount = await EventsDB.get_waiting_list_count(this.db, eventId);
            if (waitlistCount.isError()) return waitlistCount.getResponse(res);

            const result = {
                count: waitlistCount.getData()
            };

            if (isExec) {
                const waitlist = await EventsDB.get_waiting_list(this.db, eventId);
                if (waitlist.isError()) return waitlist.getResponse(res);
                result.waitlist = waitlist.getData();
            }

            if (req.user) {
                const onList = await EventsDB.is_user_on_waiting_list(req, this.db, eventId);
                if (!onList.isError() && onList.getData()) {
                    const position = await EventsDB.get_waiting_list_position(this.db, eventId, req.user.id);
                    if (!position.isError()) {
                        result.position = position.getData();
                    }
                }
            }

            res.json(result);
        });
    }
}

module.exports = EventsAPI;