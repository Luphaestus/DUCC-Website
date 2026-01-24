/**
 * panel.js
 * usage:
 * import { Panel } from '/js/widgets/panel.js';
 * thing.innerHTML = Panel({ id: 'my-panel', title: 'Panel Title', icon: '<svg>...</svg>', content: '<p>Panel content goes here.</p>', action: '<button>Action</button>', classes: 'additional-classes' });
 * Reusable Glass Panel Component.
 */

/**
 * Renders a glass panel with an optional header.
 * @param {Object} props
 * @param {string} props.id - Optional ID for the panel container.
 * @param {string} props.title - Title text or HTML.
 * @param {string} props.icon - Icon SVG string.
 * @param {string} props.content - Inner HTML content.
 * @param {string} props.action - HTML for the header action button.
 * @param {string} props.classes - Additional classes.
 * @returns {string} HTML string
 */
export const Panel = ({ id = '', title, icon = '', content = '', action = '', classes = '' }) => `
    <div ${id ? `id="${id}"` : ''} class="glass-panel ${classes}">
        ${title ? `
        <div class="box-header">
            <h3>${icon} ${title}</h3>
            ${action}
        </div>
        ` : ''}
        ${content}
    </div>
`;
