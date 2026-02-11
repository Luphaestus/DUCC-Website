import { EmailProvider, EmailOptions } from './EmailProvider.js';
import { TemplateManager } from './TemplateManager.js';
import Logger from '../misc/Logger.js';
import config from '../config.js';

export class EmailManager {
    private static instance: EmailManager;
    private provider: EmailProvider | null = null;

    private constructor() {}

    static getInstance(): EmailManager {
        if (!EmailManager.instance) {
            EmailManager.instance = new EmailManager();
        }
        return EmailManager.instance;
    }

    setProvider(provider: EmailProvider): void {
        this.provider = provider;
    }

    async sendTemplatedEmail(to: string, subject: string, templateName: string, placeholders: Record<string, string>): Promise<void> {
        if (!this.provider) {
            Logger.warn('[EmailManager] No email provider configured. Email not sent.');
            return;
        }

        let recipient = to;
        let finalSubject = subject;

        if (config.email.test_destination) {
            recipient = config.email.test_destination;
            finalSubject = `[TEST -> ${to}] ${subject}`;
            Logger.info(`[EmailManager] Rerouting email for ${to} to ${recipient}`);
        }

        try {
            const year = new Date().getFullYear().toString();
            // Create a title from subject by removing " - DUCC" suffix if present
            const header_title = subject.replace(/\s*-\s*DUCC$/, '');
            const allPlaceholders = { ...placeholders, year, header_title };
            
            const bodyContent = await TemplateManager.getTemplate(templateName, allPlaceholders);
            const finalHtml = await TemplateManager.getBaseTemplate(bodyContent, allPlaceholders);

            await this.provider.sendEmail({
                to: recipient,
                subject: finalSubject,
                html: finalHtml
            });
            Logger.info(`[EmailManager] Email sent to ${recipient} with subject: ${finalSubject}`);
        } catch (error) {
            Logger.error(`[EmailManager] Failed to send email to ${recipient}:`, error);
            throw error;
        }
    }
}