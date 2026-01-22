import { ajaxGet } from '/js/utils/ajax.js';

/**
 * Shared admin UI components and constants.
 * @module AdminCommon
 */

/** @type {string} ID of the admin content container */
export const adminContentID = 'admin-content';

/**
 * Render pagination controls.
 * @param {HTMLElement} container
 * @param {number} currentPage
 * @param {number} totalPages
 * @param {function} onPageChange
 */
export function renderPaginationControls(container, currentPage, totalPages, onPageChange) {
    container.innerHTML = '';
    
    if (totalPages <= 1) return;

    const nav = document.createElement('nav');
    nav.className = 'glass-pagination';

    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&lsaquo; Prev'; 
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next &rsaquo;';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    const info = document.createElement('span');
    info.className = 'pagination-info';
    info.textContent = `Page ${currentPage} of ${totalPages}`;

    nav.appendChild(prevBtn);
    nav.appendChild(info);
    nav.appendChild(nextBtn);
    
    container.appendChild(nav);
}

/**
 * Render admin navigation bar based on permissions.
 * @param {string} activeSection - Key of the section to disable.
 * @returns {Promise<string>} HTML string.
 */
export async function renderAdminNavBar(activeSection) {
    const userData = await ajaxGet('/api/user/elements/permissions').catch(() => ({}));
    const perms = userData.permissions || [];
    const isPresident = await ajaxGet('/api/globals/status').then(_ => true).catch(() => false);

    const canManageUsers = perms.includes('user.manage');
    const canManageEvents = perms.includes('event.manage.all') || perms.includes('event.manage.scoped');
    const canManageTransactions = perms.includes('transaction.manage');
    const canManageRoles = perms.includes('role.manage');
    const canManageFiles = perms.includes('document.write') || perms.includes('document.edit');
    const isExec = perms.length > 0;

    const navItem = (link, label, key) => `
        <button data-nav="${link}" class="tab-btn ${activeSection === key ? 'active' : ''}">
            ${label}
        </button>
    `;

    // Initialize the background sync after a short delay to allow for rendering
    setTimeout(() => initToggleGroup(document.getElementById('admin-main-nav')), 50);

    return /*html*/`
        <nav class="toggle-group admin-nav-group" id="admin-main-nav">
            <div class="toggle-bg"></div>
            ${(canManageUsers || canManageTransactions || isExec) ? navItem('/admin/users', 'Users', 'users') : ''}
            ${canManageEvents ? navItem('/admin/events', 'Events', 'events') : ''}
            ${canManageEvents ? navItem('/admin/tags', 'Tags', 'tags') : ''}
            ${canManageFiles ? navItem('/admin/files', 'Files', 'files') : ''}
            ${canManageRoles ? navItem('/admin/roles', 'Roles', 'roles') : ''}
            ${isPresident ? navItem('/admin/globals', 'Globals', 'globals') : ''}
        </nav>
    `;
}

/**
 * Initialize a toggle group's sliding background.
 * @param {HTMLElement} element - The .toggle-group element.
 */
export function initToggleGroup(element) {
    if (!element || element.dataset.initialized === 'true') {
        if (element.dataset.initialized === 'true') {
            const sync = element._syncToggleGroup;
            if (sync) sync();
        }
        return;
    }

    const bg = element.querySelector('.toggle-bg');
    if (!bg) return;

    const sync = (silent = false) => {
        const active = element.querySelector('.tab-btn.active');
        if (active) {
            if (silent) bg.style.transition = 'none';
            
            bg.style.setProperty('--tab-width', `${active.offsetWidth}px`);
            bg.style.setProperty('--tab-height', `${active.offsetHeight}px`);
            bg.style.setProperty('--tab-left', `${active.offsetLeft}px`);
            bg.style.setProperty('--tab-top', `${active.offsetTop}px`);
            
            if (silent) {
                // Force reflow
                bg.offsetHeight;
                bg.style.transition = '';
            }
        }
    };

    // Store sync function on element for manual calls
    element._syncToggleGroup = sync;
    element.dataset.initialized = 'true';

    // Initial silent sync to prevent "slide from left" on load
    sync(true);

    // Sync on interactions and layout changes
    window.addEventListener('resize', () => sync());
    element.addEventListener('transitionend', (e) => {
        if (e.target === element) sync();
    });
}