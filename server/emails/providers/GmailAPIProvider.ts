import { google } from 'googleapis';
import { EmailProvider, EmailOptions } from '../EmailProvider.js';
import Logger from '../../misc/Logger.js';

export class GmailAPIProvider implements EmailProvider {
    private oauth2Client: any;
    private user: string;

    constructor(user: string, clientId: string, clientSecret: string, refreshToken: string) {
        this.user = user;
        this.oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'http://localhost' // Not used for sending, but required by constructor
        );

        this.oauth2Client.setCredentials({
            refresh_token: refreshToken
        });
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
            Logger.info(`[GmailAPIProvider] Sending email via Gmail API to ${options.to}...`);
            const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

            // Create RFC822 formatted email
            const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
            const messageParts = [
                `From: "DUCC" <${this.user}>`,
                `To: ${options.to}`,
                `Content-Type: text/html; charset=utf-8`,
                `MIME-Version: 1.0`,
                `Subject: ${utf8Subject}`,
                '',
                options.html,
            ];
            const message = messageParts.join('\n');

            // The message needs to be base64url encoded
            const encodedMessage = Buffer.from(message)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: encodedMessage,
                },
            });
            Logger.info(`[GmailAPIProvider] Email sent successfully via API to ${options.to}`);
        } catch (error: any) {
            Logger.error('[GmailAPIProvider] Error sending email via API:', error.message);
            if (error.response) {
                Logger.error('[GmailAPIProvider] API details:', JSON.stringify(error.response.data));
            }
            throw error;
        }
    }
}
