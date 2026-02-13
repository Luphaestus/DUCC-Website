import { FastifyInstance, FastifyReply } from 'fastify';
import webpush from 'web-push';
import { DatabaseWrapper } from '../db/db.js';
import Logger from '../misc/Logger.js';
import checkAuthentication from '../misc/authentication.js';
import { EmailManager } from '../emails/EmailManager.js';
import { NotificationType } from '../types/notifications.js';

// VAPID Keys setup
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BC71D4MNbXqiQxXzSOxAn7w4mWDrhGCFGBGpsG6pmdSuZgXmJ2WZfU38WK7I8bYQi_O1D_mSIY_WX5Lf1_9EVQ4',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'pyzA_8SOxDDJx0dQYdaOES9H4OqeHhfSRnvrK0ix5_I' 
};

// If placeholders are detected, generate fresh ones and log them for the user to save
if (vapidKeys.publicKey.startsWith('YOUR_')) {
    const keys = webpush.generateVAPIDKeys();
    vapidKeys.publicKey = keys.publicKey;
    vapidKeys.privateKey = keys.privateKey;
    Logger.info(`[PWA] Generated fresh VAPID Keys. Add these to your .env to persist subscriptions:`);
    Logger.info(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
    Logger.info(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
}

webpush.setVapidDetails(
    'mailto:canoe.club@durham.ac.uk',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

export default class NotificationsAPI {
    app: FastifyInstance;
    db: DatabaseWrapper;

    constructor(app: FastifyInstance, db: DatabaseWrapper) {
        this.app = app;
        this.db = db;
    }

    registerRoutes() {
        this.app.get('/api/notifications/vapid-key', async (req, reply) => {
            return { key: vapidKeys.publicKey };
        });

        this.app.post('/api/notifications/subscribe', { preHandler: [checkAuthentication()] }, async (req: any, reply: FastifyReply) => {
            const userId = req.user.id;
            const subscription = req.body;

            if (!subscription || !subscription.endpoint) {
                return reply.status(400).send({ error: 'Invalid subscription' });
            }

            try {
                // Check if exists
                const existing = await this.db.all(
                    'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', 
                    [userId, subscription.endpoint]
                );

                if (existing.length === 0) {
                    await this.db.run(
                        'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
                        [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
                    );
                }
                
                // Send welcome notification
                const payload = JSON.stringify({
                    title: 'DUCC Notifications',
                    body: 'You are now subscribed to updates!',
                    url: '/profile/settings'
                });
                
                await (webpush as any).sendNotification(subscription, payload).catch((err: any) => {
                    Logger.error('Failed to send welcome push', err);
                });

                return { success: true };
            } catch (e) {
                Logger.error('Subscription error', e);
                return reply.status(500).send({ error: 'Failed to subscribe' });
            }
        });

        this.app.post('/api/notifications/unsubscribe', { preHandler: [checkAuthentication()] }, async (req: any, reply: FastifyReply) => {
            const userId = req.user.id;
            const { endpoint } = req.body;

            if (!endpoint) {
                return reply.status(400).send({ error: 'Endpoint required' });
            }

            try {
                await this.db.run(
                    'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?', 
                    [userId, endpoint]
                );
                return { success: true };
            } catch (e) {
                Logger.error('Unsubscribe error', e);
                return reply.status(500).send({ error: 'Failed to unsubscribe' });
            }
        });

        this.app.get('/api/notifications/settings', { preHandler: [checkAuthentication()] }, async (req: any, reply: FastifyReply) => {
            const userId = req.user.id;
            try {
                await this.ensureSettingsExist(userId);
                const settings = await this.db.get('SELECT * FROM user_notification_settings WHERE user_id = ?', [userId]);
                return settings;
            } catch (e) {
                Logger.error('Error fetching notification settings', e);
                return reply.status(500).send({ error: 'Failed to fetch settings' });
            }
        });

        this.app.post('/api/notifications/settings', { preHandler: [checkAuthentication()] }, async (req: any, reply: FastifyReply) => {
            const userId = req.user.id;
            const { email_payments, push_payments, email_events, push_events, email_news, push_news, email_event_reminders, push_event_reminders } = req.body;

            try {
                await this.db.run(
                    `UPDATE user_notification_settings 
                     SET email_payments = ?, push_payments = ?, email_events = ?, push_events = ?, email_news = ?, push_news = ?, email_event_reminders = ?, push_event_reminders = ? 
                     WHERE user_id = ?`,
                    [
                        email_payments ? 1 : 0, push_payments ? 1 : 0, 
                        email_events ? 1 : 0, push_events ? 1 : 0, 
                        email_news ? 1 : 0, push_news ? 1 : 0,
                        email_event_reminders ? 1 : 0, push_event_reminders ? 1 : 0,
                        userId
                    ]
                );
                return { success: true };
            } catch (e) {
                Logger.error('Error updating notification settings', e);
                return reply.status(500).send({ error: 'Failed to update settings' });
            }
        });
    }

    private async ensureSettingsExist(userId: number) {
        const existing = await this.db.get('SELECT user_id FROM user_notification_settings WHERE user_id = ?', [userId]);
        if (!existing) {
            await this.db.run('INSERT INTO user_notification_settings (user_id, email_event_reminders, push_event_reminders) VALUES (?, 1, 1)', [userId]);
        }
    }

    // Static Utility to send notifications to specific users from other parts of the app
    static async sendNotificationToUser(db: DatabaseWrapper, userId: number, title: string, body: string, url: string = '/', type: NotificationType = NotificationType.NEWS, templateName: string = 'notification', placeholders: Record<string, string> = {}) {
        try {
            // Fetch user settings
            const settings = await db.get('SELECT * FROM user_notification_settings WHERE user_id = ?', [userId]) || {
                email_payments: 1, push_payments: 1,
                email_events: 1, push_events: 1,
                email_news: 1, push_news: 1,
                email_event_reminders: 1, push_event_reminders: 1
            };

            const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
            if (!user) return;

            const shouldEmail = settings[`email_${type}`] === 1;
            const shouldPush = settings[`push_${type}`] === 1;

            // 1. Send Email Notification
            if (user.email && shouldEmail) {
                EmailManager.getInstance().sendTemplatedEmail(
                    user.email,
                    title,
                    templateName,
                    {
                        name: user.first_name,
                        title: title,
                        body: body,
                        url: url,
                        ...placeholders
                    }
                ).catch(err => Logger.error(`[NotificationsAPI] Failed to send email to user ${userId}`, err));
            }

            // 2. Send Push Notification
            if (shouldPush) {
                await this.sendPushToUser(db, userId, title, body, url);
            }
        } catch (e) {
            Logger.error('Error sending notification', e);
        }
    }

    static async sendPushToUser(db: DatabaseWrapper, userId: number, title: string, body: string, url: string = '/') {
        try {
            const subs = await db.all('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
            if (subs.length === 0) return;

            const payload = JSON.stringify({ title, body, url });

            const promises = subs.map(async (sub: any) => {
                const pushConfig = {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                };
                                    try {
                                        await (webpush as any).sendNotification(pushConfig, payload);
                                    } catch (error: any) {
                                        if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403) {
                                            // Subscription expired/gone/invalid, remove it
                                            await db.run('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                                        } else {
                                            Logger.error(`Push error for user ${userId}`, error);
                                        }
                                    }            });

            await Promise.all(promises);
        } catch (e) {
            Logger.error(`Error in sendPushToUser for user ${userId}`, e);
        }
    }
}