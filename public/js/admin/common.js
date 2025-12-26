import { ajaxGet } from '../misc/ajax.js';

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
    const perms = await ajaxGet('/api/user/elements/can_manage_users,can_manage_events,can_manage_transactions,is_exec').catch(() => ({}));
    const isPresident = (await ajaxGet('/api/globals/status')).isPresident;

    return `
        <div class="admin-nav-group">
            ${(perms.can_manage_users || perms.can_manage_transactions || perms.is_exec) ? `<button onclick="switchView('/admin/users')" ${activeSection === 'users' ? 'disabled' : ''}>Users</button>` : ''}
            ${perms.can_manage_events ? `<button onclick="switchView('/admin/events')" ${activeSection === 'events' ? 'disabled' : ''}>Events</button>` : ''}
            <button onclick="switchView('/admin/tags')" ${activeSection === 'tags' ? 'disabled' : ''}>Tags</button>
            ${isPresident ? `<button onclick="switchView('/admin/globals')" ${activeSection === 'globals' ? 'disabled' : ''}>Globals</button>` : ''}
        </div>
    `;
}