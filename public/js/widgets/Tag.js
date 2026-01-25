/**
 * Tag.js
 * 
 * Widget for rendering standardized tag badges.
 */

export class Tag {
    /**
     * Renders a tag badge.
     * @param {object} tag - Tag object with name and color.
     * @param {string} [extraClasses=''] - Additional CSS classes.
     * @param {string} [extraStyles=''] - Additional inline styles.
     * @returns {string} HTML string.
     */
    static render(tag, extraClasses = '', extraStyles = '') {
        const color = tag.color || 'var(--pico-primary)';
        return `<span class="tag-badge ${extraClasses}" style="--tag-color: ${color}; ${extraStyles}">${tag.name}</span>`;
    }

    /**
     * Renders a list of tags.
     * @param {object[]} tags - Array of tag objects.
     * @param {string} [extraClasses='']
     * @returns {string} HTML string.
     */
    static renderList(tags, extraClasses = '') {
        if (!tags || tags.length === 0) return '';
        return tags.map(tag => Tag.render(tag, extraClasses)).join('');
    }
}
