/**
 * WaitlistAPI.js
 * 
 * This file manages the waiting list functionality for events.
 */

import EventsDB from '../../db/eventsDB.js';
import WaitlistDB from '../../db/waitlistDB.js';
import AttendanceDB from '../../db/attendanceDB.js';
import UserDB from '../../db/userDB.js';
import check from '../../misc/authentication.js';
import { Permissions } from '../../misc/permissions.js';

export default class WaitlistAPI {
    /**
     * @param {object} app - Express app instance.
     * @param {object} db - Database connection.
     */
    constructor(app, db) {
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
        this.app.get('/api/event/:id/isOnWaitlist', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            const onList = await WaitlistDB.is_user_on_waiting_list(this.db, req.user.id, eventId);
            if (onList.isError()) return onList.getResponse(res);
            res.json({ isOnWaitlist: onList.getData() });
        });

        /**
         * Add the current user to the waiting list.
         */
        this.app.post('/api/event/:id/waitlist/join', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            const eventRes = await EventsDB.get_event_by_id(this.db, req.user.id, eventId);
            if (eventRes.isError()) return eventRes.getResponse(res);
            const event = eventRes.getData();

            if (!event.enable_waitlist) return res.status(400).json({ message: 'Waitlist is disabled for this event' });

            const user = await UserDB.getElementsById(this.db, req.user.id, ['filled_legal_info']);
            if (user.isError()) return user.getResponse(res);
            if (!user.getData().filled_legal_info) return res.status(403).json({ message: 'Legal info incomplete' });

            const isAttending = await AttendanceDB.is_user_attending_event(this.db, req.user.id, eventId);
            if (isAttending.getData()) return res.status(400).json({ message: 'Already attending' });

            const maxAttendance = event.max_attendees;
            if (maxAttendance !== null && maxAttendance > 0) {
                const currentAttendance = await AttendanceDB.get_event_attendance_count(this.db, eventId);
                if (currentAttendance.isError()) return currentAttendance.getResponse(res);
                if (currentAttendance.getData() < maxAttendance) {
                    return res.status(400).json({ message: 'Event is not full; cannot join waitlist' });
                }
            }

            const status = await WaitlistDB.join_waiting_list(this.db, req.user.id, eventId);
            return status.getResponse(res);
        });

        /**
         * Remove the current user from the waiting list.
         */
        this.app.post('/api/event/:id/waitlist/leave', check(), async (req, res) => {
            const eventId = parseInt(req.params.id, 10);
            if (Number.isNaN(eventId)) return res.status(400).json({ message: 'Event ID must be an integer' });

            const status = await WaitlistDB.leave_waiting_list(this.db, req.user.id, eventId);
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

            const eventRes = await EventsDB.get_event_by_id(this.db, req.user ? req.user.id : null, eventId);
            if (eventRes.isError()) return eventRes.getResponse(res);

            const isExec = req.user ? await Permissions.hasAnyPermission(this.db, req.user.id) : false;

            const waitlistCount = await WaitlistDB.get_waiting_list_count(this.db, eventId);
            if (waitlistCount.isError()) return waitlistCount.getResponse(res);

            const result = {
                count: waitlistCount.getData()
            };

            if (isExec) {
                const waitlist = await WaitlistDB.get_waiting_list(this.db, eventId);
                if (waitlist.isError()) return waitlist.getResponse(res);
                result.waitlist = waitlist.getData();
            }

            if (req.user) {
                const onList = await WaitlistDB.is_user_on_waiting_list(this.db, req.user.id, eventId);
                if (!onList.isError() && onList.getData()) {
                    const position = await WaitlistDB.get_waiting_list_position(this.db, eventId, req.user.id);
                    if (!position.isError()) {
                        result.position = position.getData();
                    }
                }
            }

            res.json(result);
        });
    }
}
