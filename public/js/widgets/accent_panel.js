/**
 * accent_panel.js
 * Usage:
* import { AccentPanel } from '/js/widgets/accent_panel.js';
* thing.innerHTML = AccentPanel({ title: 'Upgrade Now!', text: 'Push text.', buttonText: 'Upgrade', buttonId: 'upgrade-btn' });
 * Reusable Accent Panel Component.
 * Useful for calls to action or high-priority status information.
 */

/**
 * Renders an accent panel (formerly membership banner).
 * @param {Object} props
 * @param {string} props.title - Main headline.
 * @param {string} props.text - Description text.
 * @param {string} props.buttonText - Text for the action button.
 * @param {string} props.buttonId - ID for the button (for event binding).
 * @param {string} props.classes - Additional classes.
 * @returns {string} HTML string
 */
export const AccentPanel = ({ title, text, buttonText, buttonId, classes = '' }) => `
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
