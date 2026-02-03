/**
 * tooltip.js
 * Usage:
 * import { attachTooltip } from '@/widgets/tooltip';
 * attachTooltip(myElement, 'Tooltip Text');
 */

/**
 * Attaches tooltip behaviour to a target element.
 * @param {HTMLElement} element 
 */
export function attachTooltip(target: HTMLElement, text: string, className = 'attendee-name-tooltip') {
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
 * Helper to initialise tooltips on a list of elements.
 * @param {NodeList|Array} elements 
 */
export function initTooltips(elements: NodeListOf<HTMLElement> | HTMLElement[], dataAttribute = 'name') {
    elements.forEach(el => {
        const text = el.dataset[dataAttribute];
        if (text) {
            attachTooltip(el, text);
        }
    });
}
