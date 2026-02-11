import 'dotenv/config';
import { EmailManager } from './EmailManager.js';
import { GmailProvider } from './providers/GmailProvider.js';
import Logger from '../misc/Logger.js';
import config from '../config.js';

async function sendTestEmails() {
    const to = process.argv[2];

    if (!to) {
        console.error('Please provide an email address: npm run email <emailaddress>');
        process.exit(1);
    }

    if (!config.email.user || !config.email.pass) {
        console.error('Email credentials missing in .env file (EMAIL_USER, EMAIL_PASS)');
        process.exit(1);
    }

    const emailManager = EmailManager.getInstance();
    emailManager.setProvider(new GmailProvider(config.email.user, config.email.pass));

    console.log(`Sending ALL test emails to ${to}...`);

    const templates = [
        {
            name: 'test',
            subject: 'System Configuration Test',
            placeholders: {
                timestamp: new Date().toLocaleString()
            }
        },
        {
            name: 'login_otp',
            subject: 'Your Login Code',
            placeholders: {
                name: 'Test User',
                otp: '123456'
            }
        },
        {
            name: 'password_reset',
            subject: 'Password Reset Request',
            placeholders: {
                name: 'Test User',
                reset_url: 'https://durhamunicanoe.co.uk/set-password?token=test-token-123'
            }
        },
        {
            name: 'weekly_update',
            subject: 'Weekly River Update',
            placeholders: {
                event_list: `
                    <tr>
                        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
                            <strong style="color: #7E317B; display: block; font-size: 18px; margin-bottom: 4px;">Tuesday - Pool Session</strong>
                            <span style="color: #6b7280; font-size: 14px;">20:00 - Freeman's Quay</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 16px;">
                            <strong style="color: #7E317B; display: block; font-size: 18px; margin-bottom: 4px;">Sunday - River Wear Trip</strong>
                            <span style="color: #6b7280; font-size: 14px;">10:00 - Boat House</span>
                        </td>
                    </tr>
                `
            }
        }
    ];

    let successCount = 0;
    let failCount = 0;

    for (const tmpl of templates) {
        try {
            console.log(`Sending '${tmpl.name}' template...`);
            await emailManager.sendTemplatedEmail(
                to,
                tmpl.subject,
                tmpl.name,
                tmpl.placeholders
            );
            console.log(`✅ Sent '${tmpl.name}' successfully.`);
            successCount++;
        } catch (error) {
            console.error(`❌ Failed to send '${tmpl.name}':`, error);
            failCount++;
        }
    }

    console.log(`\nFinished! Sent: ${successCount}, Failed: ${failCount}`);
    
    if (failCount > 0) {
        process.exit(1);
    }
}

sendTestEmails();