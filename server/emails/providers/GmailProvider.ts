import nodemailer from 'nodemailer';
import { EmailProvider, EmailOptions } from '../EmailProvider.js';
import Logger from '../../misc/Logger.js';

export class GmailProvider implements EmailProvider {
    private transporter: nodemailer.Transporter;
    private user: string;

    constructor(user: string, pass: string) {
        Logger.info(`[GmailProvider] Initializing SMTP provider for ${user}`);
        this.user = user;
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use STARTTLS
            auth: {
                user,
                pass
            },
            family: 4,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        });
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
            Logger.info(`[GmailProvider] Verifying connection to smtp.gmail.com...`);
            await this.transporter.verify();
            Logger.info(`[GmailProvider] Connection verified. Sending email to ${options.to}...`);
            await this.transporter.sendMail({
                from: `"DUCC" <${this.user}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            });
            Logger.info(`[GmailProvider] Email sent successfully to ${options.to}`);
        } catch (error) {
            Logger.error('[GmailProvider] Error sending email:', error);
            throw error;
        }
    }
}