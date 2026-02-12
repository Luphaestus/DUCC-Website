import nodemailer from 'nodemailer';
import { EmailProvider, EmailOptions } from '../EmailProvider.js';
import Logger from '../../misc/Logger.js';

export class GmailProvider implements EmailProvider {
    private transporter: nodemailer.Transporter;
    private user: string;

    constructor(user: string, pass: string) {
        this.user = user;
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
            auth: {
                user,
                pass
            }
        });
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: `"DUCC" <${this.user}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            });
        } catch (error) {
            Logger.error('[GmailProvider] Error sending email:', error);
            throw error;
        }
    }
}