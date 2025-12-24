import { ViewChangedEvent, switchView } from '../misc/view.js';
import { ajaxGet } from '../misc/ajax.js';
import { adminContentID } from './common.js';
import { renderManageUsers } from './user/manage.js';
import { renderUserDetail } from './user/detail.js';
import { renderManageEvents } from './event/manage.js';
import { renderEventDetail } from './event/detail.js';
import { renderManageTags } from './tag/manage.js';
import { renderTagDetail } from './tag/detail.js';
import { renderManageGlobals } from './globals.js';
import { requireAuth } from '../misc/auth.js';

/**
 * Admin Module.
 * acts as a nested router for all administrative functionalities.
 * It listens for global view changes and, if the path is under /admin/*,
 * it delegates rendering to specialized sub-modules (Users, Events, Tags, Globals).
 */

// --- Constants & Templates ---

/**
 * Main container for the admin area.
 * Includes a header for dynamic titles/actions and a content area for sub-views.
 */
const HTML_TEMPLATE = `
<div id="/admin/*-view" class="view hidden small-container">
    <div class="admin-header">
        <div id="admin-header-actions"></div>
        <h1 id="admin-dashboard-title">Admin Dashboard</h1>
        <div id="admin-header-extra"></div>
    </div>
    <div id="${adminContentID}">
        <p>Select an option to manage.</p>
    </div>
</div>`;

// --- Navigation & Routing ---

/**
 * Nested router for the Admin section.
 * Extends the main SPA router by handling sub-paths like /admin/users, /admin/event/1, etc.
 * 
 * @param {object} eventData - Data from the main ViewChangedEvent.
 * @param {string} eventData.resolvedPath - The wildcard-resolved path (should be "/admin/*").
 * @param {string} eventData.path - The actual browser path.
 */
async function AdminNavigationListener({ resolvedPath, path }) {
    if (resolvedPath !== "/admin/*") return;

    // Ensure session is still active before rendering sensitive info
    if (!await requireAuth()) return;

    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    // Reset header state for the new sub-view
    const titleEl = document.getElementById('admin-dashboard-title');
    const actionsEl = document.getElementById('admin-header-actions');
    if (titleEl) titleEl.textContent = 'Admin Dashboard';
    if (actionsEl) actionsEl.innerHTML = '';

    // Strip query parameters for routing logic
    const cleanPath = path.split('?')[0];

    // --- Sub-route Dispatcher ---

    if (cleanPath === '/admin/users') {
        if (titleEl) titleEl.textContent = 'Admin Dashboard - Users';
        await renderManageUsers();
    } else if (cleanPath === '/admin/events') {
        if (titleEl) titleEl.textContent = 'Admin Dashboard - Events';
        await renderManageEvents();
    } else if (cleanPath === '/admin/tags') {
        if (titleEl) titleEl.textContent = 'Admin Dashboard - Tags';
        await renderManageTags();
    } else if (cleanPath === '/admin/globals') {
        if (titleEl) titleEl.textContent = 'Admin Dashboard - Globals';
        await renderManageGlobals();
    } else if (cleanPath.match(/^\/admin\/event\/(new|\d+)$/)) {
        if (titleEl) titleEl.textContent = 'Admin Dashboard - Event Details';
        const id = cleanPath.split('/').pop();
        await renderEventDetail(id);
    } else if (cleanPath.match(/^\/admin\/tag\/(new|\d+)$/)) {
        if (titleEl) titleEl.textContent = 'Admin Dashboard - Tag Details';
        const id = cleanPath.split('/').pop();
        await renderTagDetail(id);
    } else if (cleanPath.match(/^\/admin\/user\/\d+$/)) {
        if (titleEl) titleEl.textContent = 'Admin Dashboard - User Details';
        const id = cleanPath.split('/').pop();
        await renderUserDetail(id);
    } else {
        // --- Default Admin Home (Menu) ---
        // Shown when the path is just /admin/ or doesn't match any specific sub-route.
        // Dynamically shows buttons based on the user's specific administrative permissions.
        const adminContent = document.getElementById(adminContentID);
        const perms = await ajaxGet('/api/user/elements/can_manage_users,can_manage_events,can_manage_transactions').catch(() => ({}));

        let globalsButton = '';
        try {
            const status = await ajaxGet('/api/globals/status');
            if (status.isPresident) {
                globalsButton = `<button onclick="switchView('/admin/globals')">Manage Globals</button>`;
            }
        } catch (e) {
            console.warn('Failed to check president status', e);
        }

        let usersButton = '';
        if (perms.can_manage_users || perms.can_manage_transactions) {
            usersButton = `<button onclick="switchView('/admin/users')">Manage Users</button>`;
        }

        let eventsButton = '';
        if (perms.can_manage_events) {
            eventsButton = `<button onclick="switchView('/admin/events')">Manage Events</button>`;
        }

        let tagsButton = '';
        if (perms.can_manage_events) {
            tagsButton = `<button onclick="switchView('/admin/tags')">Manage Tags</button>`;
        }


        adminContent.innerHTML = `
            <div class="admin-controls-center">
                ${usersButton}
                ${eventsButton}
                ${globalsButton}
                ${tagsButton}
            </div>
            <p class="text-center margin-top">Select an option to manage.</p>
        `;
    }
}

// --- Initialization ---

// Subscribe to global view changes to handle admin sub-navigation
ViewChangedEvent.subscribe(AdminNavigationListener);

// Inject the main admin view template into the body
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);