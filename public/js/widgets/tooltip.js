/**
 * tooltip.js
 * Usage:
 * import { attachTooltip } from '/js/widgets/tooltip.js';
 * attachTooltip(myElement, 'Tooltip Text');
 */

/**
 * Attaches tooltip behavior to a target element.
 * 
 * @param {HTMLElement} target - The element to attach the tooltip to.
 * @param {string} text - The text to display in the tooltip.
 * @param {string} [className='attendee-name-tooltip'] - CSS class for styling.
 */
export function attachTooltip(target, text, className = 'attendee-name-tooltip') {
    if (!target || !text) return;

    const showTooltip = () => {
        if (target.querySelector(`.${className}`)) return;
        
        const tooltip = document.createElement('div');
        tooltip.className = className;
        tooltip.textContent = text;
        target.appendChild(tooltip);
    };

    const hideTooltip = () => {
        const tooltip = target.querySelector(`.${className}`);
        if (tooltip) {
            tooltip.classList.add('hiding');
            tooltip.addEventListener('animationend', () => tooltip.remove());
        }
    };

    target.onmouseenter = showTooltip;
    target.onmouseleave = hideTooltip;
    
    target.onclick = (e) => {
        showTooltip();
    };
}

/**
 * Helper to initialize tooltips on a list of elements.
 * 
 * @param {NodeList|HTMLElement[]} elements - Collection of elements.
 * @param {string} [dataAttribute='name'] - Dataset key to read text from (e.g. data-name).
 */
export function initTooltips(elements, dataAttribute = 'name') {
    elements.forEach(el => {
        const text = el.dataset[dataAttribute];
        if (text) {
            attachTooltip(el, text);
        }
    });
}
