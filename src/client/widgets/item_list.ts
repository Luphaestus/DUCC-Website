/**
 * item_list.js
 * Usage:
 * import { ItemList, StandardListItem } from '@/widgets/item_list';
 * thing.innerHTML = ItemList(itemsArray, item => StandardListItem({ title: item.name, value: item.value }));
 * Generic Item List Widget.
 */

/**
 * Renders a list of items.
 * 
 * @param {any[]} items - Array of item objects.
 * @param {Function} renderItem - Function to render an individual item.
 * @returns {string} HTML string
 */
export const ItemList = (items: any[] = [], renderItem: (item: any) => string): string => {
    if (!items || items.length === 0) {
        return '<p class="empty-text">No items found.</p>';
    }

    return `
    <div class="item-list">
        ${items.map(item => renderItem(item)).join('')}
    </div>
    `;
};

interface StandardListItemProps {
    icon?: string;
    iconClass?: string;
    title?: string;
    subtitle?: string;
    value?: string;
    valueClass?: string;
    extra?: string;
    actions?: string;
    content?: string;
    classes?: string;
    dataAttributes?: string;
}

/**
 * A standard list item layout.
 * 
 * @param {StandardListItemProps} options
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
}: StandardListItemProps): string => `
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
