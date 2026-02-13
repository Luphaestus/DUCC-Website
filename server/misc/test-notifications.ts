import 'dotenv/config';
import { connect } from '../db/db.js';
import config from '../config.js';
import NotificationsAPI from '../api/NotificationsAPI.js';
import { NotificationType } from '../types/notifications.js';
import Logger from './Logger.js';

async function testNotifications() {
    let db;
    try {
        const identifier = process.argv[2];

        if (!identifier) {
            console.error('Please provide a user email or ID: npm run notify <email|id>');
            process.exit(1);
        }

        console.log(`[TestNotify] Connecting to database...`);
        db = await connect(config.mysql);

        // Find user
        let user;
        if (isNaN(parseInt(identifier))) {
            user = await db.get('SELECT id, email, first_name FROM users WHERE email = ?', [identifier]);
        } else {
            user = await db.get('SELECT id, email, first_name FROM users WHERE id = ?', [parseInt(identifier)]);
        }

        if (!user) {
            console.error(`User not found: ${identifier}`);
            process.exit(1);
        }

        console.log(`[TestNotify] Testing notifications for user: ${user.first_name} (${user.email}, ID: ${user.id})`);

        // Check if user has push subscriptions
        const subs = await db.all('SELECT id FROM push_subscriptions WHERE user_id = ?', [user.id]);
        console.log(`[TestNotify] Found ${subs.length} active push subscriptions.`);

        const tests = [
            {
                title: 'System Test',
                body: 'This is a test notification from the DUCC system.',
                url: '/profile/settings',
                type: NotificationType.NEWS
            },
            {
                title: 'Payment Received',
                body: 'Your payment of £10.00 has been verified.',
                url: '/profile/balance',
                type: NotificationType.PAYMENTS
            },
            {
                title: 'Upcoming Event',
                body: 'Reminder: Pool Session tomorrow at 20:00!',
                url: '/events',
                type: NotificationType.EVENTS
            },
            {
                title: 'Event Starting Soon',
                body: 'Reminder: "River Wear Trip" starts in 30 minutes!',
                url: '/events',
                type: NotificationType.EVENT_REMINDERS
            }
        ];

        let successCount = 0;
        for (const test of tests) {
            console.log(`[TestNotify] Sending Push: "${test.title}"...`);
            try {
                await NotificationsAPI.sendPushToUser(
                    db,
                    user.id,
                    test.title,
                    test.body,
                    test.url
                );
                console.log(`✅ Push "${test.title}" dispatched.`);
                successCount++;
            } catch (err: any) {
                console.error(`❌ Failed to send push "${test.title}":`, err.message || err);
                if (err.statusCode === 403) {
                    console.warn(`[!] TIP: A 403 Forbidden (Invalid JWT) usually means your VAPID keys changed. Try disabling and re-enabling notifications in Settings.`);
                }
            }
        }

        console.log(`\n[TestNotify] Finished! Sent: ${successCount}/${tests.length}`);
        
        // Give some time for async background tasks (emails/push) to complete
        setTimeout(() => {
            process.exit(0);
        }, 2000);

    } catch (err) {
        console.error('[TestNotify] CRITICAL ERROR:', err);
        process.exit(1);
    }
}

testNotifications();
