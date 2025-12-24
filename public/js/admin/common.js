import { ajaxGet } from '../misc/ajax.js';

/**
 * Admin Common Module.
 * Contains shared UI components and constants used across different admin management views.
 */

// --- Constants ---

/** @type {string} ID of the main content area for administrative views */
export const adminContentID = 'admin-content';

// --- Helper Functions ---

/**
 * Renders standardized pagination controls into a container.
 * These controls consist of "Prev" and "Next" buttons and a page info label.
 * 
 * @param {HTMLElement} container - Target container for the controls.
 * @param {number} currentPage - The current active page index.
 * @param {number} totalPages - The total number of available pages.
 * @param {function} onPageChange - Callback invoked when a button is clicked. Receives the target page number.
 */
export function renderPaginationControls(container, currentPage, totalPages, onPageChange) {
    container.innerHTML = '';

    // Create "Prev" button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage <= 1; // Disable on first page
    prevBtn.classList.add('pagination-btn');
    prevBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    // Create "Next" button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage >= totalPages; // Disable on last page
    nextBtn.classList.add('pagination-btn');
    nextBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    // Page indicator text
    const info = document.createElement('span');
    info.textContent = `Page ${currentPage} of ${totalPages}`;

    container.appendChild(prevBtn);
    container.appendChild(info);
    container.appendChild(nextBtn);
}

/**
 * Renders the top navigation bar for the admin section.
 * Buttons are dynamically shown based on the user's specific administrative permissions.
 * 
 * @param {string} activeSection - The key of the currently active section to disable its button.
 * @returns {Promise<string>} HTML string for the navigation bar.
 */
export async function renderAdminNavBar(activeSection) {
    // Fetch current user permissions and president status
    const perms = await ajaxGet('/api/user/elements/can_manage_users,can_manage_events,can_manage_transactions').catch(() => ({}));
    const isPresident = (await ajaxGet('/api/globals/status')).isPresident;

    // Return HTML with conditional buttons
    return `
        <div class="admin-nav-group">
            ${(perms.can_manage_users || perms.can_manage_transactions) ? `<button onclick="switchView('/admin/users')" ${activeSection === 'users' ? 'disabled' : ''}>Users</button>` : ''}
            ${perms.can_manage_events ? `<button onclick="switchView('/admin/events')" ${activeSection === 'events' ? 'disabled' : ''}>Events</button>` : ''}
            <button onclick="switchView('/admin/tags')" ${activeSection === 'tags' ? 'disabled' : ''}>Tags</button>
            ${isPresident ? `<button onclick="switchView('/admin/globals')" ${activeSection === 'globals' ? 'disabled' : ''}>Globals</button>` : ''}
        </div>
    `;
}