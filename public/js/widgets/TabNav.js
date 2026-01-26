/**
 * TabNav.js
 * Standardized tab navigation widget with a sliding background.
 * 
 * Usage:
 * import { TabNav } from '/js/widgets/TabNav.js';
 * const nav = new TabNav({
 *     id: 'my-nav',
 *     tabs: [
 *         { label: 'Home', link: '/home', key: 'home', data: { tab: 'home' } },
 *         { label: 'Profile', link: '/profile', key: 'profile', data: { tab: 'profile' } }
 *     ],
 *     activeKey: 'home'
 * });
 * container.innerHTML = nav.getHTML();
 * nav.init();
 */

export class TabNav {
    /**
     * @param {Object} props
     * @param {string} props.id - Unique ID for the nav element.
     * @param {Array} props.tabs - Array of { label, link, key, data } objects.
     * @param {string} props.activeKey - The key of the currently active tab.
     * @param {string} [props.classes=''] - Additional classes for the nav element.
     */
    constructor({ id, tabs, activeKey, classes = '' }) {
        this.id = id;
        this.tabs = tabs;
        this.activeKey = activeKey;
        this.classes = classes;
    }

    /**
     * Generates the HTML string for the navigation bar.
     */
    getHTML() {
        const items = this.tabs.map(tab => {
            const dataAttrs = Object.entries(tab.data || {})
                .map(([k, v]) => `data-${k}="${v}"`)
                .join(' ');
            
            const navAttr = tab.link ? `data-nav="${tab.link}"` : '';

            return `
                <button ${navAttr} ${dataAttrs} class="tab-btn ${this.activeKey === tab.key ? 'active' : ''}" data-key="${tab.key}">
                    ${tab.label}
                </button>
            `;
        }).join('');

        return `
            <nav class="toggle-group ${this.classes}" id="${this.id}">
                <div class="toggle-bg"></div>
                ${items}
            </nav>
        `;
    }

    /**
     * Initialises the sliding background logic.
     */
    init() {
        const element = document.getElementById(this.id);
        if (!element) return;

        if (element.dataset.initialised === 'true') {
            if (element._syncToggleGroup) element._syncToggleGroup();
            return;
        }

        const bg = element.querySelector('.toggle-bg');
        if (!bg) return;

        const sync = (silent = false) => {
            const active = element.querySelector('.tab-btn.active') || element.querySelector('button.active');
            if (active) {
                if (silent) bg.style.transition = 'none';
                
                const pos = {
                    width: `${active.offsetWidth}px`,
                    height: `${active.offsetHeight}px`,
                    left: `${active.offsetLeft}px`,
                    top: `${active.offsetTop}px`
                };

                bg.style.setProperty('--tab-width', pos.width);
                bg.style.setProperty('--tab-height', pos.height);
                bg.style.setProperty('--tab-left', pos.left);
                bg.style.setProperty('--tab-top', pos.top);
                
                if (element.id) {
                    window.__lastTogglePositions = window.__lastTogglePositions || {};
                    window.__lastTogglePositions[element.id] = pos;
                }

                if (silent) {
                    bg.offsetHeight; 
                    bg.style.transition = '';
                }
            }
        };

        element._syncToggleGroup = sync;
        element.dataset.initialised = 'true';

        const savedPos = element.id ? (window.__lastTogglePositions && window.__lastTogglePositions[element.id]) : null;
        
        if (savedPos) {
            bg.style.transition = 'none';
            bg.style.setProperty('--tab-width', savedPos.width);
            bg.style.setProperty('--tab-height', savedPos.height);
            bg.style.setProperty('--tab-left', savedPos.left);
            bg.style.setProperty('--tab-top', savedPos.top);
            bg.offsetHeight; 
            bg.style.transition = '';
            requestAnimationFrame(() => sync(false));
        } else {
            sync(true);
        }

        window.addEventListener('resize', () => sync());
        bg.addEventListener('transitionend', () => sync());
    }

    /**
     * Static helper to initialise any .toggle-group elements already in the DOM.
     * Useful for elements not created via this class.
     */
    static initElement(element) {
        if (!element) return;
        const id = element.id || `nav-${Math.random().toString(36).substr(2, 9)}`;
        if (!element.id) element.id = id;
        
        const nav = new TabNav({ id, tabs: [], activeKey: '' });
        nav.init();
    }
}
