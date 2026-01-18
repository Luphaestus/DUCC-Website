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

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.classList.add('pagination-btn');
    prevBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.classList.add('pagination-btn');
    nextBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    const info = document.createElement('span');
    info.textContent = `Page ${currentPage} of ${totalPages}`;

    container.appendChild(prevBtn);
    container.appendChild(info);
    container.appendChild(nextBtn);
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
    const isExec = perms.length > 0;

    return /*html*/`
        <div class="admin-nav-group">
            ${(canManageUsers || canManageTransactions || isExec) ? `<button data-nav="/admin/users" ${activeSection === 'users' ? 'disabled' : ''}>Users</button>` : ''}
            ${canManageEvents ? `<button data-nav="/admin/events" ${activeSection === 'events' ? 'disabled' : ''}>Events</button>` : ''}
            ${canManageEvents ? `<button data-nav="/admin/tags" ${activeSection === 'tags' ? 'disabled' : ''}>Tags</button>` : ''}
            ${canManageRoles ? `<button data-nav="/admin/roles" ${activeSection === 'roles' ? 'disabled' : ''}>Roles</button>` : ''}
            ${isPresident ? `<button data-nav="/admin/globals" ${activeSection === 'globals' ? 'disabled' : ''}>Globals</button>` : ''}
        </div>
    `;
}