/**
 * accent_panel.js
 * Usage:
* import { AccentPanel } from '@/widgets/accent_panel';
* thing.innerHTML = AccentPanel({ title: 'Upgrade Now!', text: 'Push text.', buttonText: 'Upgrade', buttonId: 'upgrade-btn' });
 * Reusable Accent Panel Component.
 * Useful for calls to action or high-priority status information.
 */

interface AccentPanelProps {
    title: string;
    text: string;
    buttonText: string;
    buttonId: string;
    classes?: string;
}

/**
 * Renders an accent panel (formerly membership banner).
 * @param {AccentPanelProps} props
 * @returns {string} HTML string
 */
export const AccentPanel = ({ title, text, buttonText, buttonId, classes = '' }: AccentPanelProps): string => `
    <div class="accent-panel ${classes}">
        <div class="panel-content">
            <h2>${title}</h2>
            <p>${text}</p>
        </div>
        <div class="panel-action">
            <button id="${buttonId}">${buttonText}</button>
        </div>
    </div>
`;
