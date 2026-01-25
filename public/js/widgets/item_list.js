/**
 * item_list.js
 * Usage:
 * import { ItemList, StandardListItem } from '/js/widgets/item_list.js';
 * thing.innerHTML = ItemList(itemsArray, item => StandardListItem({ title: item.name, value: item.value }));
 * Generic Item List Widget.
 */

/**
 * Renders a list of items.
 * 
 * @param {Object[]} items - Array of item objects.
 * @param {Function} renderItem - Function to render an individual item.
 * @returns {string} HTML string
 */
export const ItemList = (items = [], renderItem) => {
    if (!items || items.length === 0) {
        return '<p class="empty-text">No items found.</p>';
    }

    return `
    <div class="item-list">
        ${items.map(item => renderItem(item)).join('')}
    </div>
    `;
};

/**
 * A standard list item layout.
 * 
 * @param {Object} options
 * @param {string} options.icon - SVG icon or HTML.
 * @param {string} options.iconClass - Additional classes for the icon container.
 * @param {string} options.title - Main title text.
 * @param {string} options.subtitle - Subtitle/date text.
 * @param {string} options.value - Primary value text.
 * @param {string} options.valueClass - Classes for the primary value.
 * @param {string} options.extra - Extra secondary value/text.
 * @param {string} options.actions - HTML for action buttons/icons.
 * @param {string} options.content - Custom HTML content to insert in the middle.
 * @param {string} options.classes - Extra classes for the item container.
 * @param {string} options.dataAttributes - Raw data attributes string (e.g. 'data-id="123"').
 * @returns {string} HTML string
 */
export const StandardListItem = ({
    icon = '',
    iconClass = '',
    title = '',
    subtitle = '',
    value = '',
    valueClass = '',
    extra = '',
    actions = '',
    content = '',
    classes = '',
    dataAttributes = ''
}) => `
    <div class="list-item glass-panel ${classes}" ${dataAttributes}>
        <div class="item-icon ${iconClass}">${icon}</div>
        <div class="item-details">
            <span class="item-title">${title}</span>
            <span class="item-subtitle">${subtitle}</span>
        </div>
        ${content}
        <div class="item-value-group">
            <span class="item-value ${valueClass}">${value}</span>
            ${extra ? `<span class="item-extra">${extra}</span>` : ''}
        </div>
        ${actions ? `<div class="item-actions">${actions}</div>` : ''}
    </div>
`;
