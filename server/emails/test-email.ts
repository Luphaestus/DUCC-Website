import 'dotenv/config';
import { EmailManager } from './EmailManager.js';
import { GmailProvider } from './providers/GmailProvider.js';
import { GmailAPIProvider } from './providers/GmailAPIProvider.js';
import Logger from '../misc/Logger.js';
import config from '../config.js';
import dns from 'dns/promises';

async function sendTestEmails() {
    try {
        const to = process.argv[2];

        if (!to) {
            console.error('Please provide an email address: npm run email <emailaddress>');
            process.exit(1);
        }

        console.log(`[TestEmail] Starting email test sequence...`);
        console.log(`[TestEmail] Node version: ${process.version}`);
        console.log(`[TestEmail] Environment: ${process.env.NODE_ENV}`);

        // DNS Check (Still useful for API endpoint resolution)
        try {
            console.log('[TestEmail] Checking DNS resolution for gmail.googleapis.com...');
            const ips = await dns.resolve4('gmail.googleapis.com');
            console.log(`[TestEmail] DNS resolved: ${ips.join(', ')}`);
        } catch (dnsErr) {
            console.error('[TestEmail] DNS Resolution FAILED for gmail.googleapis.com:', dnsErr);
        }

        const emailManager = EmailManager.getInstance();
        
        if (config.email.clientId && config.email.clientSecret && config.email.refreshToken && config.email.user) {
            console.log('[TestEmail] Using Gmail API Provider');
            emailManager.setProvider(new GmailAPIProvider(
                config.email.user,
                config.email.clientId,
                config.email.clientSecret,
                config.email.refreshToken
            ));
        } else if (config.email.user && config.email.pass) {
            console.log('[TestEmail] Using Gmail SMTP Provider');
            emailManager.setProvider(new GmailProvider(config.email.user, config.email.pass));
        } else {
            console.error('Email credentials missing in .env file');
            process.exit(1);
        }

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
    } catch (globalErr) {
        console.error('[TestEmail] CRITICAL ERROR:', globalErr);
        process.exit(1);
    }
}

sendTestEmails();