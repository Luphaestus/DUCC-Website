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
        <button data-nav="${link}" class="small-btn ${activeSection === key ? '' : 'outline secondary'}">
            ${label}
        </button>
    `;

    return /*html*/`
        <div class="admin-nav-group">
            ${(canManageUsers || canManageTransactions || isExec) ? navItem('/admin/users', 'Users', 'users') : ''}
            ${canManageEvents ? navItem('/admin/events', 'Events', 'events') : ''}
            ${canManageEvents ? navItem('/admin/tags', 'Tags', 'tags') : ''}
            ${canManageFiles ? navItem('/admin/files', 'Files', 'files') : ''}
            ${canManageRoles ? navItem('/admin/roles', 'Roles', 'roles') : ''}
            ${isPresident ? navItem('/admin/globals', 'Globals', 'globals') : ''}
        </div>
    `;
}