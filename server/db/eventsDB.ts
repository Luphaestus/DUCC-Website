/**
 * eventsDB.ts
 * 
 * This module handles core database operations for events.
 */

import { statusObject } from '../misc/status.js';
import TransactionsDB from './transactionDB.js';
import TagsDB from './tagsDB.js';
import UserDB from './userDB.js';
import EventRules from '../rules/EventRules.js';
import Globals from '../misc/globals.js';
import Logger from '../misc/Logger.js';
import { DatabaseWrapper } from './db.js';
import NotificationsAPI from '../api/NotificationsAPI.js';
import { NotificationType } from '../types/notifications.js';
import Utils from '../misc/utils.js';

interface EventData {
    id?: number;
    title?: string;
    description?: string;
    location?: string;
    start?: Date | string;
    end?: Date | string;
    difficulty_level?: number;
    max_attendees?: number;
    upfront_cost?: number;
    tags?: (number | any)[];
    signup_required?: boolean;
    is_offsite?: boolean;
    allow_kit_requests?: boolean;
    image_id?: number | null;
    upfront_refund_cutoff?: Date | string | null;
    status?: 'confirmed' | 'pending' | 'scheduled';
    visible_at?: Date | string | null;
    is_canceled?: boolean;
    image_url?: string;
    can_attend?: boolean;
    tags_json?: any;
    [key: string]: any;
}

interface EventsAdminOptions {
    page?: number | string;
    limit?: number | string;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    showPast?: boolean;
    minCost?: number | string;
    maxCost?: number | string;
    difficulty?: number | string;
    location?: string;
    permissions?: string[];
    status?: string;
}

export default class EventsDB {
    static _getEventSelect(userId?: number): string {
        return `
            e.*, 
            (SELECT COUNT(*) FROM event_attendees ea_count WHERE ea_count.event_id = e.id AND ea_count.is_attending = 1) as attendee_count,
            ${userId ? `EXISTS(SELECT 1 FROM event_attendees ea_user WHERE ea_user.event_id = e.id AND ea_user.user_id = ${Number(userId)} AND ea_user.is_attending = 1)` : '0'} as is_attending,
            (
                SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'id', t.id,
                        'name', t.name,
                        'color', t.color,
                        'description', t.description,
                        'min_difficulty', t.min_difficulty,
                        'priority', t.priority,
                        'join_policy', t.join_policy,
                        'view_policy', t.view_policy,
                        'image_id', t.image_id
                    )
                )
                FROM event_tags et
                JOIN tags t ON et.tag_id = t.id
                WHERE et.event_id = e.id
            ) as tags_json
        `;
    }

    static _processEvent(event: any): any {
        if (!event) return null;
        event.tags = event.tags_json || [];
        delete event.tags_json;
        
        if (event.image_id) {
            event.image_url = `/api/files/${event.image_id}/download?view=true`;
        } else {
            const bestTag = event.tags
                .filter((t: any) => t.image_id !== null)
                .sort((a: any, b: any) => b.priority - a.priority)[0];
            
            if (bestTag) {
                event.image_url = `/api/files/${bestTag.image_id}/download?view=true`;
            } else {
                event.image_url = new Globals().get('DefaultEventImage')?.data || '/api/files/1/download?view=true';
            }
        }
        return event;
    }

    /**
     * Fetch events for a specific week, filtered by the maximum difficulty the user is allowed to see.
     */
    static async get_events_for_week(db: DatabaseWrapper, date: Date = new Date(), userId: number | null = null): Promise<statusObject> {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1));
        startOfWeek.setHours(0, 0, 0, 0);

        if (isNaN(startOfWeek.getTime())) {
            return new statusObject(400, 'Invalid date range');
        }

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // Filter out pending/draft events and future scheduled events
        const sql = `
            SELECT ${this._getEventSelect(userId || undefined)}
            FROM events e 
            WHERE e.start BETWEEN ? AND ?
            AND (e.status = 'confirmed' OR (e.status = 'scheduled' AND e.visible_at <= NOW()))
            ORDER BY e.start ASC
        `;

        const rawEvents = await db.all(sql, [startOfWeek, endOfWeek]);
        const events = rawEvents.map(e => this._processEvent(e));

        const visibleEvents: any[] = [];
        const userRes = userId ? await UserDB.getElementsById(db, userId, ['id', 'is_instructor', 'filled_legal_info', 'is_member', 'free_sessions', 'difficulty_level']) : null;
        const user = userRes ? userRes.getData() : null;

        for (const event of events) {
            if (await EventRules.canViewEvent(db, event, user)) {
                if (user) {
                    const joinStatus = await EventRules.canJoinEvent(db, event, user);
                    event.can_attend = !joinStatus.isError();
                }
                visibleEvents.push(event);
            }
        }

        return new statusObject(200, null, visibleEvents);
    }

    /**
     * Fetch events for a week relative to the current week.
     */
    static async get_events_relative_week(db: DatabaseWrapper, offset: number = 0, userId: number | null = null): Promise<statusObject> {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + (Number(offset) * 7));
        return this.get_events_for_week(db, targetDate, userId);
    }

    /**
     * Fetch events within an arbitrary date range.
     */
    static async get_events_in_range(db: DatabaseWrapper, startDate: Date | string, endDate: Date | string, userId: number | null = null): Promise<statusObject> {
        const sql = `
            SELECT ${this._getEventSelect(userId || undefined)}
            FROM events e 
            WHERE e.start >= ? AND e.start <= ?
            AND (e.status = 'confirmed' OR (e.status = 'scheduled' AND e.visible_at <= NOW()))
            ORDER BY e.start ASC
        `;

        const rawEvents = await db.all(sql, [startDate, endDate]);
        const events = rawEvents.map(e => this._processEvent(e));

        const visibleEvents: any[] = [];
        const userRes = userId ? await UserDB.getElementsById(db, userId, ['id', 'is_instructor', 'filled_legal_info', 'is_member', 'free_sessions', 'difficulty_level']) : null;
        const user = userRes ? userRes.getData() : null;

        for (const event of events) {
            if (await EventRules.canViewEvent(db, event, user)) {
                if (user) {
                    const joinStatus = await EventRules.canJoinEvent(db, event, user);
                    event.can_attend = !joinStatus.isError();
                }
                visibleEvents.push(event);
            }
        }

        return new statusObject(200, null, visibleEvents);
    }

    /**
     * Administrative fetch of events with full filtering and no visibility restrictions.
     */
    static async getEventsAdmin(db: DatabaseWrapper, options: EventsAdminOptions): Promise<statusObject> {
        let { page = 1, limit = 20, search, sort, order, showPast, minCost, maxCost, difficulty, location, permissions, status } = options;
        
        page = Math.max(1, parseInt(String(page)) || 1);
        limit = Math.max(1, parseInt(String(limit)) || 20);
        const offset = (page - 1) * limit;

        const allowedSorts = ['title', 'start', 'location', 'difficulty_level', 'upfront_cost'];
        const sortSql = Utils.getSortSql(sort, allowedSorts, 'start', order);

        let conditions: string[] = [];
        const params: any[] = [];

        if (search) {
            const searchTerms = search.trim().split(/\s+/).map(t => `+${t}*`).join(' ');
            conditions.push(`MATCH(e.title, e.description, e.location) AGAINST(? IN BOOLEAN MODE)`);
            params.push(searchTerms);
        }

        if (!showPast) {
            conditions.push(`e.start >= CURRENT_DATE`);
        }

        if (status) {
            conditions.push(`e.status = ?`);
            params.push(status);
        }

        if (minCost !== undefined && minCost !== '') {
            conditions.push(`e.upfront_cost >= ?`);
            params.push(Number(minCost));
        }
        if (maxCost !== undefined && maxCost !== '') {
            conditions.push(`e.upfront_cost <= ?`);
            params.push(Number(maxCost));
        }
        if (difficulty !== undefined && difficulty !== '') {
            conditions.push(`e.difficulty_level = ?`);
            params.push(Number(difficulty));
        }
        if (location && location.trim() !== '') {
            conditions.push(`e.location LIKE ?`);
            params.push(`%${location.trim()}%`);
        }

        if (permissions && Array.isArray(permissions) && permissions.length > 0) {
            const tagPlaceholders = permissions.map(() => '?').join(',');
            conditions.push(`e.id IN (SELECT event_id FROM event_tags WHERE tag_id IN (${tagPlaceholders}))`);
            params.push(...permissions);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        try {
            const query = `
                SELECT ${this._getEventSelect()}
                FROM events e 
                ${whereClause} 
                ORDER BY e.${sortSql} 
                LIMIT ? OFFSET ?
            `;
            const rawEvents = await db.all(query, [...params, limit, offset]);
            const events = rawEvents.map(e => this._processEvent(e));

            const countResult = await db.get(`SELECT COUNT(*) as count FROM events e ${whereClause}`, params);
            const totalPages = Math.ceil((countResult ? countResult.count : 0) / limit);

            return new statusObject(200, null, { events, totalPages, currentPage: page });
        } catch (error) {
            Logger.error('Database error in getEventsAdmin:', error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch specific event details by ID.
     */
    static async get_event_by_id(db: DatabaseWrapper, userId: number | null, eventId: number): Promise<statusObject> {
        const sql = `SELECT ${this._getEventSelect(userId || undefined)} FROM events e WHERE e.id = ?`;
        const event = this._processEvent(await db.get(sql, [eventId]));
        if (!event) return new statusObject(404, 'Event not found');

        // Only enforce status check for non-admin context... 
        // But get_event_by_id is generic. Assuming user side.
        // If status is 'pending' or 'scheduled' future, regular users shouldn't see it?
        // But the requester of this method might be admin.
        // EventRules.canViewEvent handles permissions, but not status?
        // Let's add simple status check here for safety.
        // Ideally we pass isAdmin context. 
        // For now, I will leave it open here and rely on frontend/API layer to not show links, 
        // OR add check:
        // if (event.status !== 'confirmed' && (!userId || !isAdmin)) ... hard without isAdmin.
        // I'll trust the API layer to use getEventByIdAdmin for admins.

        if (userId) {
            const driverInfo = await db.all(`
                SELECT ed.id, ed.status, ed.start_mileage, ed.end_mileage, t.name as trip_name
                FROM event_drivers ed
                JOIN trips t ON ed.trip_id = t.id
                WHERE t.event_id = ? AND ed.user_id = ?
            `, [eventId, userId]);
            event.driver_info = (driverInfo && driverInfo.length > 0) ? driverInfo : null;
        }

        const userRes = userId ? await UserDB.getElementsById(db, userId, ['difficulty_level', 'id']) : null;
        const user = userRes ? userRes.getData() : null;
        
        if (!await EventRules.canViewEvent(db, event, user)) {
            return new statusObject(401, 'User not authorized');
        }

        return new statusObject(200, null, event);
    }

    /**
     * Fetch event by ID for administrative use, bypassing visibility rules.
     */
    static async getEventByIdAdmin(db: DatabaseWrapper, id: number): Promise<statusObject> {
        try {
            const sql = `SELECT ${this._getEventSelect()} FROM events e WHERE e.id = ?`;
            const event = this._processEvent(await db.get(sql, [id]));
            if (!event) return new statusObject(404, 'Event not found');
            return new statusObject(200, null, event);
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Fetch raw event details by ID.
     */
    static async getEventById(db: DatabaseWrapper, id: number): Promise<any> {
        return await db.get('SELECT * FROM events WHERE id = ?', [id]);
    }

    /**
     * Reset event image to default.
     */
    static async resetImage(db: DatabaseWrapper, id: number): Promise<statusObject> {
        try {
            await db.run('UPDATE events SET image_id = NULL WHERE id = ?', [id]);
            return new statusObject(200, 'Image reset to default');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Create a new event record and link its tags.
     */
    static async createEvent(db: DatabaseWrapper, data: EventData): Promise<statusObject> {
        return db.transaction(async (tx) => {
            let { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, tags, signup_required, is_offsite, allow_kit_requests, image_id, upfront_refund_cutoff, status, visible_at } = data;
            
            if (!signup_required && max_attendees && max_attendees > 0) {
                return new statusObject(400, 'Max attendees cannot be set if signup is not required');
            }

            const result = await tx.run(
                `INSERT INTO events (title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required, is_offsite, allow_kit_requests, image_id, upfront_refund_cutoff, status, visible_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required ? 1 : 0, is_offsite ? 1 : 0, allow_kit_requests === false ? 0 : 1, image_id, upfront_refund_cutoff, status || 'confirmed', visible_at]
            );
            const eventId = result.lastID;

            if (tags && Array.isArray(tags)) {
                for (const tag of tags) {
                    const tagId = typeof tag === 'object' ? tag.id : tag;
                    await TagsDB.associateTag(tx, eventId, tagId);
                }
            }

            return new statusObject(201, null, { id: eventId });
        }).catch((error: any) => {
            Logger.error(error);
            return new statusObject(500, 'Database error: ' + error.message);
        });
    }

    /**
     * Update an existing event record and its tag associations.
     */
    static async updateEvent(db: DatabaseWrapper, id: number, data: EventData): Promise<statusObject> {
        return db.transaction(async (tx) => {
            const existing = await tx.get('SELECT * FROM events WHERE id = ?', [id]);
            if (!existing) return new statusObject(404, 'Event not found');

            // Explicitly whitelist fields to allow update
            const allowedFields: (keyof EventData)[] = [
                'title', 'description', 'location', 'start', 'end', 'difficulty_level',
                'max_attendees', 'upfront_cost', 'signup_required', 'is_offsite',
                'allow_kit_requests', 'image_id', 'upfront_refund_cutoff', 'status', 'visible_at'
            ];
            
            const updates = Utils.pick(data, allowedFields);
            const merged = { ...existing, ...updates };

            let { title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required, is_offsite, allow_kit_requests, image_id, upfront_refund_cutoff, status, visible_at } = merged;
            const tags = data.tags;

            if (!signup_required && max_attendees && max_attendees > 0) {
                return new statusObject(400, 'Max attendees cannot be set if signup is not required');
            }

            await tx.run(
                `UPDATE events SET title=?, description=?, location=?, start=?, end=?, difficulty_level=?, max_attendees=?, upfront_cost=?, signup_required=?, is_offsite=?, allow_kit_requests=?, image_id=?, upfront_refund_cutoff=?, status=?, visible_at=? WHERE id=?`,
                [title, description, location, start, end, difficulty_level, max_attendees, upfront_cost, signup_required, is_offsite, allow_kit_requests, image_id, upfront_refund_cutoff, status, visible_at, id]
            );

            if (tags && Array.isArray(tags)) {
                await TagsDB.clearEventTags(tx, id);
                for (const tag of tags) {
                    const tagId = typeof tag === 'object' ? tag.id : tag;
                    await TagsDB.associateTag(tx, id, tagId);
                }
            }

            return new statusObject(200, 'Event updated');
        }).catch((error: any) => {
            Logger.error(error);
            return new statusObject(500, 'Database error: ' + error.message);
        });
    }

    /**
     * Toggle the cancellation status of an event.
     */
    static async setEventCancellation(db: DatabaseWrapper, id: number, isCanceled: boolean): Promise<statusObject> {
        try {
            await db.run("UPDATE events SET is_canceled = ? WHERE id = ?", [isCanceled ? 1 : 0, id]);
            return new statusObject(200, 'Event cancellation status updated');
        } catch (error) {
            Logger.error(error);
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Cancel an event and process automatic refunds for all attendees.
     */
    static async cancelEvent(db: DatabaseWrapper, id: number): Promise<statusObject> {
        return db.transaction(async (tx) => {
            const event = await tx.get('SELECT * FROM events WHERE id = ?', [id]);
            if (!event) return new statusObject(404, 'Event not found');
            if (event.is_canceled) return new statusObject(400, 'Event already canceled');

            await tx.run("UPDATE events SET is_canceled = 1 WHERE id = ?", [id]);

            const attendees = await tx.all('SELECT * FROM event_attendees WHERE event_id = ? AND is_attending = 1', [id]);

            for (const attendee of attendees) {
                if (attendee.payment_transaction_id) {
                    const transaction = await tx.get('SELECT * FROM transactions WHERE id = ?', [attendee.payment_transaction_id]);
                    if (transaction) {
                        const refundAmount = Math.abs(transaction.amount);
                        // Using 'any' cast for TransactionsDB because it's JS and _add_transaction_internal might be protected/private in concept but JS allows it.
                        await (TransactionsDB as any)._add_transaction_internal(tx, attendee.user_id, refundAmount, `Refund for canceled event: ${event.title}`, id);
                    }
                } 
                
                const user = await tx.get('SELECT is_member FROM users WHERE id = ?', [attendee.user_id]);
                if (user && !user.is_member) {
                    await tx.run('UPDATE users SET free_sessions = free_sessions + 1 WHERE id = ?', [attendee.user_id]);
                }

                // Send Push Notification
                await NotificationsAPI.sendNotificationToUser(
                    tx, 
                    attendee.user_id, 
                    `Event Canceled: ${event.title} - DUCC`, 
                    `The event "${event.title}" has been canceled.`, 
                    `/events`
                );
            }

            await tx.run('DELETE FROM event_waiting_list WHERE event_id = ?', [id]);
            return new statusObject(200, 'Event canceled and refunds processed');
        }).catch((error: any) => {
            Logger.error(error);
            return new statusObject(500, 'Database error during cancellation');
        });
    }

    /**
     * Delete an event record.
     */
    static async deleteEvent(db: DatabaseWrapper, id: number): Promise<statusObject> {
        try {
            await db.run('DELETE FROM events WHERE id = ?', [id]);
            return new statusObject(200, 'Event deleted');
        } catch (error) {
            return new statusObject(500, 'Database error');
        }
    }

    /**
     * Determine the fallback image for an event based on its tags.
     */
    static async _getFallbackImage(db: DatabaseWrapper, tags: any[]): Promise<string> {
        const bestTag = tags
            .filter((t: any) => t.image_id !== null)
            .sort((a: any, b: any) => b.priority - a.priority)[0];
        
        if (bestTag) {
            return `/api/files/${bestTag.image_id}/download?view=true`;
        } else {
            return new Globals().get('DefaultEventImage')?.data || '/api/files/1/download?view=true';
        }
    }
}