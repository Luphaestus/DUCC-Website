import fs from 'fs/promises';
import path from 'path';

export class TemplateManager {
    private static templateDir = path.join(process.cwd(), 'server/emails/templates');

    static async getTemplate(name: string, placeholders: Record<string, string>): Promise<string> {
        const filePath = path.join(this.templateDir, `${name}.html`);
        let content = await fs.readFile(filePath, 'utf-8');

        // Replace placeholders with support for optional spaces: {{ key }} or {{key}}
        for (const [key, value] of Object.entries(placeholders)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            content = content.replace(regex, value);
        }

        // Strip out unsupported block tags like {% extends ... %}, {% block ... %}, etc.
        // This allows templates to have these tags for compatibility or future-proofing
        // without them appearing in the final email.
        content = content.replace(/{%.*?%}/g, '');

        return content.trim();
    }

    static async getBaseTemplate(bodyContent: string, placeholders: Record<string, string> = {}): Promise<string> {
        const filePath = path.join(this.templateDir, 'base.html');
        let content = await fs.readFile(filePath, 'utf-8');
        
        content = content.replace(/{{\s*body\s*}}/g, bodyContent);
        
        // Replace other placeholders in the base template (like title, year)
        for (const [key, value] of Object.entries(placeholders)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            content = content.replace(regex, value);
        }

        return content;
    }
}
