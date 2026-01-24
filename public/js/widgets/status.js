/**
 * status.js
 * Usage:
 * import { StatusIndicator } from '/js/widgets/status.js';
 * thing.innerHTML = StatusIndicator({ active: true, activeText: 'Good Text', inactiveText: 'Bad Text', content: '<p>Everything is running smoothly.</p>' });
 * Reusable Status Indicator Component.
 */

import { CHECK_SVG, BRIGHTNESS_ALERT_SVG } from '../../images/icons/outline/icons.js';

/**
 * Renders a status indicator box.
 * @param {Object} props
 * @param {boolean} props.active - Success vs Error state.
 * @param {string} props.activeText - Title when active.
 * @param {string} props.inactiveText - Title when inactive.
 * @param {string} props.content - Body content HTML.
 * @returns {string} HTML string
 */
export const StatusIndicator = ({ active, activeText = 'Active', inactiveText = 'Action Required', content }) => `
    <div class="status-indicator-box ${active ? 'status-green' : 'status-red'}">
        <div class="indicator-header">
            ${active ? CHECK_SVG : BRIGHTNESS_ALERT_SVG} 
            <span>${active ? activeText : inactiveText}</span>
        </div>
        <div class="indicator-body">
            ${content}
        </div>
    </div>
`;
