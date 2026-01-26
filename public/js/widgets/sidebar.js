/**
 * sidebar.js
 * Usage:
 * import { Sidebar, initSidebar } from '/js/widgets/sidebar.js';
 * thing.innerHTML = Sidebar([{ id: 'overview', label: 'Overview', icon: '<svg>...</svg>', active: true }, { id: 'settings', label: 'Settings', icon: '<svg>...</svg>' }]);
 * Reusable Sidebar Component for Dashboards.
 */

/**
 * Renders the Sidebar HTML.
 * @param {Object[]} items - Array of sidebar items { id, label, icon, active, isAction, classes }
 * @returns {string} HTML string
 */
export const Sidebar = (items = []) => `
    <nav class="dashboard-sidebar glass-panel">
        ${items.map(item => `
            <button class="nav-item ${item.active ? 'active' : ''} ${item.classes || ''}" 
                ${item.id ? `data-tab="${item.id}"` : ''} 
                ${item.actionId ? `id="${item.actionId}"` : ''}>
                ${item.icon || ''} ${item.label}
            </button>
        `).join('')}
    </nav>
`;

/**
 * Initialises sidebar navigation logic.
 * 
 * @param {string} initialActiveId - ID of the initially active item.
 */
export function initSidebar(defaultTab = 'overview', onTabChange) {
    const tabs = document.querySelectorAll('.nav-item[data-tab]');
    const sections = document.querySelectorAll('.dashboard-section');

    function setActive(tabName) {
        tabs.forEach(btn => {
            if (btn.dataset.tab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        sections.forEach(sec => sec.classList.remove('active'));
        const activeSection = document.getElementById(`tab-${tabName}`);
        if (activeSection) activeSection.classList.add('active');

        if (onTabChange) onTabChange(tabName);
    }

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            const url = new URL(window.location);
            url.searchParams.set('tab', tabName);
            window.history.pushState({}, '', url);
            
            setActive(tabName);
        });
    });

    const params = new URLSearchParams(window.location.search);
    const initialTab = params.get('tab') || defaultTab;
    setActive(initialTab);

    return { setActive };
}
