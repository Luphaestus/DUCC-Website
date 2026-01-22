/**
 * common.js
 * 
 * Shared UI components and utilities for the Admin Dashboard.
 * Includes pagination logic, admin navigation rendering, and
 * the sliding background logic for toggle groups.
 */

import { ajaxGet } from '/js/utils/ajax.js';

/** @type {string} ID of the primary container for admin sub-content */
export const adminContentID = 'admin-content';

/**
 * Renders standardized pagination controls (Prev/Next buttons + Page Info).
 * 
 * @param {HTMLElement} container - The element to inject pagination into.
 * @param {number} currentPage - The currently active page index.
 * @param {number} totalPages - Total number of available pages.
 * @param {Function} onPageChange - Callback function receiving the new page index.
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
 * Dynamically renders the administrative navigation bar based on the current user's permissions.
 * Includes animated sliding background for active tab indication.
 * 
 * @param {string} activeSection - Key of the section to highlight (e.g. 'users', 'events').
 * @returns {Promise<string>} - HTML string for the navigation bar.
 */
export async function renderAdminNavBar(activeSection) {
    // Synchronize positions of existing nav to allow for smooth transitions across renders
    const existingNav = document.getElementById('admin-main-nav');
    if (existingNav && existingNav._syncToggleGroup) {
        existingNav._syncToggleGroup();
    }

    // Fetch required permissions and status in parallel
    const [userData, statusData] = await Promise.all([
        ajaxGet('/api/user/elements/permissions', true).catch(() => ({})),
        ajaxGet('/api/globals/status', true).catch(() => null)
    ]);

    const perms = userData.permissions || [];
    const isPresident = !!statusData;

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

    // Re-initialize the sliding background after DOM injection
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
 * Initializes the sliding background logic for a .toggle-group element.
 * Attaches a resize listener and a state-sync function to the element.
 * 
 * @param {HTMLElement} element - The container element with .toggle-group class.
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

    /**
     * Updates the position and size of the sliding background to match the active tab.
     * @param {boolean} [silent=false] - If true, disables transition during move.
     */
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
            
            // Persist position globally to allow smooth rendering across SPA view switches
            if (element.id) {
                window.__lastTogglePositions = window.__lastTogglePositions || {};
                window.__lastTogglePositions[element.id] = pos;
            }

            if (silent) {
                bg.offsetHeight; // Force reflow
                bg.style.transition = '';
            }
        }
    };

    element._syncToggleGroup = sync;
    element.dataset.initialized = 'true';

    // Restore previous position if available to prevent jumpy initial loads
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