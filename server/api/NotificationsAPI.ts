import { FastifyInstance, FastifyReply } from 'fastify';
import webpush from 'web-push';
import { DatabaseWrapper } from '../db/db.js';
import Logger from '../misc/Logger.js';
import checkAuthentication from '../misc/authentication.js';
import { EmailManager } from '../emails/EmailManager.js';

// VAPID Keys setup
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
    privateKey: process.env.VAPID_PRIVATE_KEY || 'Y9ubkR-wAACO9ROf_J-D5v1-2G-3g7y123456789012' 
};

// Generate keys if the placeholders are invalid
if (vapidKeys.publicKey.includes(' ')) {
    const keys = webpush.generateVAPIDKeys();
    vapidKeys.publicKey = keys.publicKey;
    vapidKeys.privateKey = keys.privateKey;
    Logger.info(`Generated VAPID Keys: Public: ${vapidKeys.publicKey}, Private: ${vapidKeys.privateKey}`);
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
                    url: '/profile?tab=settings'
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
    }

    // Static Utility to send notifications to specific users from other parts of the app
    static async sendNotificationToUser(db: DatabaseWrapper, userId: number, title: string, body: string, url: string = '/') {
        try {
            // 1. Send Email Notification
            const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
            if (user && user.email) {
                EmailManager.getInstance().sendTemplatedEmail(
                    user.email,
                    title,
                    'notification',
                    {
                        name: user.first_name,
                        title: title,
                        body: body,
                        url: url
                    }
                ).catch(err => Logger.error(`[NotificationsAPI] Failed to send email to user ${userId}`, err));
            }

            // 2. Send Push Notification
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
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Subscription expired/gone, remove it
                        await db.run('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                    } else {
                        Logger.error(`Push error for user ${userId}`, error);
                    }
                }
            });

            await Promise.all(promises);
        } catch (e) {
            Logger.error('Error sending notification', e);
        }
    }
}