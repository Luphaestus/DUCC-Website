const EventsDB = require('../db/eventsDB.js');
const TransactionsDB = require('../db/transactionDB.js');
const UserDB = require('../db/userDB.js');
const Globals = require('../misc/globals.js');
const { statusObject } = require('../misc/status.js');
const check = require('../misc/authentication.js');

/**
 * Events API module.
 * Manages event listings, registration (attendance), and attendance-related transactions.
 * 
 * Routes:
 * GET  /api/events/rweek/:offset -> Returns events for a specific week relative to today.
 * GET  /api/events               -> Returns all events visible to the user.
 * GET  /api/event/:id            -> Returns detailed information for a single event.
 * GET  /api/event/:id/isAttending -> Checks if the current user is signed up for an event.
 * POST /api/event/:id/attend     -> Registers the current user for an event (handles payments/sessions).
 * POST /api/event/:id/leave      -> Removes the current user from an event (handles refunds).
 * GET  /api/event/:id/attendees  -> Returns a list of users attending an event.
 *
 * @module EventsAPI
 */
class EventsAPI {

    /**
     * @param {object} app - The Express application instance.
     * @param {object} db - The database instance.
     */
    constructor(app, db) {
        this.app = app;
        this.db = db;
    }

    /**
     * Registers all event-related routes.
     */
    registerRoutes() {
        /**
         * GET /api/events/rweek/:offset
         * Fetches events for a specific week.
         * Offset 0 is the current week, 1 is next week, etc.
         * Filters events by user's difficulty level or a default level for guests.
         */
        this.app.get('/api/events/rweek/:offset', async (req, res) => {
            // Determine the maximum difficulty level the user can see
            const max_difficulty = await UserDB.getElements(req, this.db, "difficulty_level");
            var errorMaxDifficulty = null;
            if (max_difficulty.getStatus() == 401) {
                // If not logged in, use a configured default difficulty
                errorMaxDifficulty = new Globals().getInt("Unauthorized_max_difficulty");
            } else if (max_difficulty.isError()) { return max_difficulty.getResponse(res); }

            const offset = parseInt(req.params.offset, 10);
            if (Number.isNaN(offset)) {
                return res.status(400).json({ message: 'Offset must be an integer' });
            }

            // Fetch the events from the database
            const events = await EventsDB.get_events_relative_week(this.db, errorMaxDifficulty !== null ? errorMaxDifficulty : max_difficulty.getData().difficulty_level, offset, req.user ? req.user.id : null);
            if (events.isError()) { return events.getResponse(res); }

            res.json({ events: events.getData() });
        });

        /**
         * GET /api/events
         * Fetches all events the current user is allowed to see based on their difficulty level.
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
         * GET /api/event/:id
         * Fetches details for a specific event by ID.
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
         * GET /api/event/:id/isAttending
         * Checks if the currently authenticated user is attending the specified event.
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
         * POST /api/event/:id/attend
         * Signs the current user up for an event.
         * Includes checks for:
         * - Capacity (max_attendees)
         * - Timing (cannot join past or started events)
         * - Outstanding debts
         * - Legal information completion
         * - Membership status or remaining free sessions
         * - Upfront costs/payments
         */
        this.app.post('/api/event/:id/attend', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const eventRes = await EventsDB.get_event_by_id(req, this.db, eventId)

            if (eventRes.isError()) {
                return res.status(404).json({ message: 'Event not found' });
            }

            // Check capacity
            const attendeeCountRes = await EventsDB.get_event_attendance_count(req, this.db, eventId);
            if (attendeeCountRes.isError()) { return attendeeCountRes.getResponse(res); }
            if (eventRes.getData().max_attendees <= attendeeCountRes.getData() && eventRes.getData().max_attendees !== 0) {
                return res.status(400).json({ message: 'Event has reached maximum number of attendees' });
            }

            // Check timing
            const startDate = new Date(eventRes.getData().start);
            const endDate = new Date(eventRes.getData().end);
            const now = new Date();
            if (now >= endDate) {
                return res.status(400).json({ message: 'Cannot attend an event that has already ended' });
            } else if (now >= startDate) {
                return res.status(400).json({ message: 'Cannot attend an event that has already started' });
            }

            // Check if user has already paid (for re-joining scenarios or specific overrides)
            const isUserPayingForEvent = await EventsDB.isUserPayingForEvent(req, this.db, eventId);
            if (isUserPayingForEvent.isError()) { return isUserPayingForEvent.getResponse(res); }

            // Check for outstanding debts if not already paying for this event
            if (!isUserPayingForEvent.getData()) {
                const balanceRes = await TransactionsDB.get_balance(req, this.db, req.user.id);
                if (balanceRes.isError()) { return balanceRes.getResponse(res); }
                if (balanceRes.getData() < new Globals().getFloat('MinMoney')) {
                    return res.status(403).json({ message: 'User has outstanding debts' });
                }
            }

            // Check membership and legal info
            const membershipStatus = await UserDB.getElements(req, this.db, ['is_member', 'free_sessions', 'filled_legal_info']);
            if (membershipStatus.isError()) { return membershipStatus.getResponse(res); }

            if (!membershipStatus.getData().filled_legal_info) {
                return res.status(403).json({ message: 'User has not filled legal information' });
            }

            // Check membership or free session availability
            if (!membershipStatus.getData().is_member && membershipStatus.getData().free_sessions <= 0) {
                return res.status(403).json({ message: 'User is not a member or has no free sessions' });
            }

            const isAttendingRes = await EventsDB.is_user_attending_event(req, this.db, eventId);
            if (isAttendingRes.isError()) { return isAttendingRes.getResponse(res); }
            if (isAttendingRes.getData()) {
                return res.status(400).json({ message: 'User is already attending this event' });
            }

            // Deduct a free session if user is not a member
            if (!membershipStatus.getData().is_member) {
                const newFreeSessions = membershipStatus.getData().free_sessions - 1;
                const updateStatus = await UserDB.writeElements(req, this.db, { free_sessions: newFreeSessions });
                if (updateStatus.isError()) { return updateStatus.getResponse(res); }
            }

            // Handle upfront cost transaction
            let transactionStatus = new statusObject(200, null, null);
            if (eventRes.getData().upfront_cost > 0) {
                transactionStatus = await TransactionsDB.add_transaction(req, this.db, req.user.id, -eventRes.getData().upfront_cost, `${eventRes.getData().title} upfront cost`, eventId);
                if (transactionStatus.isError()) {
                    // Rollback attendance if payment fails
                    await EventsDB.leave_event(req, this.db, eventId);
                    return transactionStatus.getResponse(res);
                }

                // Handle automatic refund logic if joining after refund cutoff
                if (eventRes.getData().upfront_refund_cutoff && (new Date() > new Date(eventRes.getData().upfront_refund_cutoff))) {
                    const refundIdRes = await EventsDB.get_event_refund_id(req, this.db, eventId);
                    if (!refundIdRes.isError()) {
                        const refundData = refundIdRes.getData();
                        if (refundData.user_id) {
                            await EventsDB.refundEvent(this.db, eventId, refundData.user_id);
                        } else {
                            await TransactionsDB.delete_transaction_admin(this.db, refundData.payment_transaction_id);
                        }
                    }
                }
            };

            // Record attendance in the database
            const status = await EventsDB.attend_event(req, this.db, eventId, transactionStatus.getData());
            return status.getResponse(res);
        });

        /**
         * POST /api/event/:id/leave
         * Removes the current user from an event.
         * Handles session restoration and upfront cost refunds (if before cutoff).
         */
        this.app.post('/api/event/:id/leave', async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            // Ensure the user is actually attending
            if (!(await EventsDB.is_user_attending_event(req, this.db, eventId)).getData()) {
                return res.status(400).json({ message: 'User is not attending this event' });
            }

            const eventRes = await EventsDB.get_event_by_id(req, this.db, eventId)

            if (eventRes.isError()) {
                return res.status(404).json({ message: 'Event not found' });
            }

            // Check timing
            const startDate = new Date(eventRes.getData().start);
            const endDate = new Date(eventRes.getData().end);
            const now = new Date();
            if (now >= endDate) {
                return res.status(400).json({ message: 'Cannot leave an event that has already ended' });
            } else if (now >= startDate) {
                return res.status(400).json({ message: 'Cannot leave an event that has already started' });
            }

            // Restore free session if applicable
            const membershipStatus = await UserDB.getElements(req, this.db, ['is_member', 'free_sessions']);
            if (membershipStatus.isError()) { return membershipStatus.getResponse(res); }

            if (!membershipStatus.getData().is_member) {
                const newFreeSessions = membershipStatus.getData().free_sessions + 1;
                const updateStatus = await UserDB.writeElements(req, this.db, { free_sessions: newFreeSessions });
                if (updateStatus.isError()) { return updateStatus.getResponse(res); }
            }

            // Remove attendance record
            const status = await EventsDB.leave_event(req, this.db, eventId);
            if (status.isError()) { return status.getResponse(res); }

            // Handle refund of upfront cost if before cutoff
            if (eventRes.getData().upfront_cost > 0) {
                if (!eventRes.getData().upfront_refund_cutoff || (new Date() <= new Date(eventRes.getData().upfront_refund_cutoff))) {
                    const transactionIdStatus = await TransactionsDB.get_transactionid_by_event(req, this.db, eventId, req.user.id);
                    if (transactionIdStatus.isError()) {
                        // Rollback leave if transaction lookup fails
                        await EventsDB.attend_event(req, this.db, eventId);
                        return transactionIdStatus.getResponse(res);
                    }

                    const refundStatus = await TransactionsDB.delete_transaction(req, this.db, transactionIdStatus.getData());
                    if (refundStatus.isError()) {
                        // Rollback leave if refund fails
                        await EventsDB.attend_event(req, this.db, eventId);
                        return refundStatus.getResponse(res);
                    }
                }
            }

            return status.getResponse(res);
        });

        /**
         * GET /api/event/:id/attendees
         * Fetches the list of users attending a specific event.
         * Requires authentication.
         */
        this.app.get('/api/event/:id/attendees', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) {
                return res.status(400).json({ message: 'Event ID must be an integer' });
            }

            const attendees = await EventsDB.get_users_attending_event(req, this.db, eventId);
            if (attendees.isError()) { return attendees.getResponse(res); }
            res.json({ attendees: attendees.getData() });
        });
    }
}

module.exports = EventsAPI;