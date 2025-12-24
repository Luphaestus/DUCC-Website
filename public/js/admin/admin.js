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

// --- Constants & Templates ---

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
 * Handles navigation within the admin dashboard based on the current path.
 * Renders the appropriate view (users, events, details) or the default dashboard.
 * @param {object} eventData - Data from the ViewChangedEvent.
 * @param {string} eventData.resolvedPath - The resolved route path (e.g., "/admin/*").
 * @param {string} eventData.path - The full current path (e.g., "/admin/users").
 */
async function AdminNavigationListener({ resolvedPath, path }) {
    if (resolvedPath !== "/admin/*") return;

    if (!await requireAuth()) return;

    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const titleEl = document.getElementById('admin-dashboard-title');
    const actionsEl = document.getElementById('admin-header-actions');
    if (titleEl) titleEl.textContent = 'Admin Dashboard';
    if (actionsEl) actionsEl.innerHTML = '';

    const cleanPath = path.split('?')[0];

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

ViewChangedEvent.subscribe(AdminNavigationListener);

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);