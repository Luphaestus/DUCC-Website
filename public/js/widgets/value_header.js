/**
 * value_header.js
 * 
 * Generic Value Header Widget.
 * Renders a title, a large value display, and an optional actions area.
 */

/**
 * Generates the HTML for a value header.
 * 
 * @param {Object} options
 * @param {string} options.title - The title/label for the value.
 * @param {string} options.value - The value string to display prominently.
 * @param {string} [options.valueId] - Optional ID for the value element (for dynamic updates).
 * @param {string} [options.actions=''] - HTML content for action buttons/elements.
 * @param {string} [options.valueClass=''] - Additional classes for the value element.
 * @param {string} [options.classes=''] - Additional classes for the container.
 * @param {string} [options.id=''] - Optional ID for the container.
 * @returns {string} HTML string
 */
export const ValueHeader = ({
    title = '',
    value = '',
    valueId = '',
    actions = '',
    valueClass = '',
    classes = '',
    id = ''
} = {}) => {
    return `
    <div class="value-header ${classes}" ${id ? `id="${id}"` : ''}>
        <div class="value-info">
            <span class="value-title">${title}</span>
            <span class="value-display ${valueClass}" ${valueId ? `id="${valueId}"` : ''}>${value}</span>
        </div>
        <div class="value-actions">
            ${actions}
        </div>
    </div>
    `;
};

/**
 * Updates the displayed value in a ValueHeader.
 * 
 * @param {string} valueId - The ID of the value element.
 * @param {string} value - The new value string.
 * @param {string} [valueClass] - Optional: classes to set/replace on the value element.
 */
export const updateValueDisplay = (valueId, value, valueClass = null) => {
    const el = document.getElementById(valueId);
    if (el) {
        el.textContent = value;
        if (valueClass !== null) {
            el.className = `value-display ${valueClass}`;
        }
    }
};
