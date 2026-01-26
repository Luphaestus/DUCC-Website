/**
 * Tag.js
 * 
 * Widget for rendering standardized tag badges.
 */

export class Tag {
    /**
     * Calculates contrasting text colour (black or white) for a given hex colour.
     * @param {string} hexColour - Hex code (e.g. #ffffff or #fff).
     * @returns {string} 'black' or 'white'.
     */
    static getContrastColour(hexColour) {
        if (!hexColour || !hexColour.startsWith('#')) return 'white';
        
        let hex = hexColour.replace('#', '');
        
        // Handle 3-digit hex
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }
        
        // Ignore alpha channel if present (e.g. 8 chars)
        if (hex.length > 6) {
            hex = hex.substring(0, 6);
        }

        if (hex.length !== 6) return 'white';

        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        if (isNaN(r) || isNaN(g) || isNaN(b)) return 'white';

        // YIQ equation
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    /**
     * Renders a tag badge.
     * @param {object} tag - Tag object with name and colour.
     * @param {string} [extraClasses=''] - Additional CSS classes.
     * @param {string} [extraStyles=''] - Additional inline styles.
     * @returns {string} HTML string.
     */
    static render(tag, extraClasses = '', extraStyles = '') {
        const colour = tag.color || 'var(--pico-primary)';
        const textColour = Tag.getContrastColour(tag.color);
        return `<span class="tag-badge ${extraClasses}" style="--tag-colour: ${colour}; --tag-text-colour: ${textColour}; ${extraStyles}">${tag.name}</span>`;
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