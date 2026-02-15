/**
 * RecapManager.ts
 * 
 * This module handles the generation and sending of year-end recap emails.
 */

import { DatabaseWrapper } from '../db/db.js';
import { EmailManager } from '../emails/EmailManager.js';
import Logger from '../misc/Logger.js';
import EmailsDB from '../db/emailsDB.js';

export default class RecapManager {
    /**
     * Send recap emails to all users.
     * @param db - Database connection.
     * @param newExecWinners - Array of { role_name, winners: [{ first_name, last_name }] }.
     */
    static async sendRecapEmails(db: DatabaseWrapper, newExecWinners: any[]) {
        try {
            const users = await db.all('SELECT id, first_name, email FROM users WHERE is_verified = 1');
            
            // Pre-render new exec list since TemplateManager is simple
            let newExecHtml = '<ul style="list-style: none; padding: 0;">';
            for (const role of newExecWinners) {
                const winnersList = role.winners.map((w: any) => `${w.first_name} ${w.last_name}`).join(', ');
                newExecHtml += `<li style="margin-bottom: 8px;"><strong>${role.role_name}:</strong> ${winnersList}</li>`;
            }
            newExecHtml += '</ul>';

            for (const user of users) {
                const stats = await this.calculateUserStats(db, user.id);
                const hasMultipleEmails = await this.checkMultipleEmails(db, user.id);

                EmailManager.getInstance().sendTemplatedEmail(
                    user.email,
                    'Your DUCC Year in Review! - DUCC',
                    'recap',
                    {
                        name: user.first_name,
                        new_exec_html: newExecHtml,
                        total_hours: stats.total_hours.toString(),
                        most_frequented_title: stats.most_frequented_title,
                        most_frequented_count: stats.most_frequented_count.toString(),
                        top_companion: stats.top_companion,
                        companion_count: stats.companion_count.toString(),
                        warn_emails_html: !hasMultipleEmails ? `
                        <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 8px; margin-top: 30px;">
                            <p style="color: #991b1b; margin: 0; font-weight: bold;">⚠️ Don't lose your account!</p>
                            <p style="color: #b91c1c; font-size: 14px; margin-top: 8px;">
                                If you are leaving Durham soon, you might lose access to your university email. To keep your DUCC profile and stats, please add a personal email address to your account now in your profile settings.
                            </p>
                        </div>` : ''
                    }
                ).catch(err => Logger.error(`[RecapManager] Failed to send recap email to ${user.email}:`, err));
            }
        } catch (error) {
            Logger.error('[RecapManager] Error in sendRecapEmails:', error);
        }
    }

    /**
     * Calculate personalized stats for a user.
     */
    static async calculateUserStats(db: DatabaseWrapper, userId: number) {
        // Total hours spent with the club (attended events)
        const totalHoursRes = await db.get(`
            SELECT SUM(TIMESTAMPDIFF(HOUR, e.start, e.end)) as total_hours
            FROM event_attendees ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.user_id = ? AND ea.is_attending = 1 AND e.start < NOW()
        `, [userId]);

        // Most frequented event (same title)
        const mostFrequentedEvent = await db.get(`
            SELECT e.title, COUNT(*) as count
            FROM event_attendees ea
            JOIN events e ON ea.event_id = e.id
            WHERE ea.user_id = ? AND ea.is_attending = 1 AND e.start < NOW()
            GROUP BY e.title
            ORDER BY count DESC
            LIMIT 1
        `, [userId]);

        // Person you spent the most events with
        const mostFrequentCompanion = await db.get(`
            SELECT u.first_name, u.last_name, COUNT(*) as common_events
            FROM event_attendees ea1
            JOIN event_attendees ea2 ON ea1.event_id = ea2.event_id
            JOIN users u ON ea2.user_id = u.id
            WHERE ea1.user_id = ? AND ea2.user_id != ? 
              AND ea1.is_attending = 1 AND ea2.is_attending = 1
            GROUP BY u.id
            ORDER BY common_events DESC
            LIMIT 1
        `, [userId, userId]);

        return {
            total_hours: totalHoursRes?.total_hours || 0,
            most_frequented_title: mostFrequentedEvent?.title || 'N/A',
            most_frequented_count: mostFrequentedEvent?.count || 0,
            top_companion: mostFrequentCompanion ? `${mostFrequentCompanion.first_name} ${mostFrequentCompanion.last_name}` : 'N/A',
            companion_count: mostFrequentCompanion?.common_events || 0
        };
    }

    /**
     * Check if a user has multiple email addresses set up.
     */
    static async checkMultipleEmails(db: DatabaseWrapper, userId: number): Promise<boolean> {
        const res = await db.get('SELECT COUNT(*) as count FROM user_emails WHERE user_id = ?', [userId]);
        return res.count > 1;
    }
}
