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
 * Nested router for administrative modules.
 * @module Admin
 */

/**
 * Admin layout template.
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

/**
 * Update the admin dashboard title responsively.
 * @param {string} [section] - The name of the current section.
 */
function updateAdminTitle(section) {
    const titleEl = document.getElementById('admin-dashboard-title');
    if (!titleEl) return;
    if (section) {
        titleEl.innerHTML = `<span class="admin-title-prefix">Admin Dashboard - </span><span class="admin-title-section">${section}</span>`;
    } else {
        titleEl.innerHTML = `<span class="admin-title-section">Admin Dashboard</span>`;
    }
}

/**
 * Router for sub-paths within /admin/*.
 * @param {object} eventData
 */
async function AdminNavigationListener({ resolvedPath, path }) {
    if (resolvedPath !== "/admin/*") return;

    if (!await requireAuth()) return;

    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    updateAdminTitle();
    if (actionsEl) actionsEl.innerHTML = '';

    const cleanPath = path.split('?')[0];

    if (cleanPath === '/admin/users') {
        updateAdminTitle('Users');
        await renderManageUsers();
    } else if (cleanPath === '/admin/events') {
        updateAdminTitle('Events');
        await renderManageEvents();
    } else if (cleanPath === '/admin/tags') {
        updateAdminTitle('Tags');
        await renderManageTags();
    } else if (cleanPath === '/admin/globals') {
        updateAdminTitle('Globals');
        await renderManageGlobals();
    } else if (cleanPath.match(/^\/admin\/event\/(new|\d+)$/)) {
        updateAdminTitle('Event Details');
        await renderEventDetail(cleanPath.split('/').pop());
    } else if (cleanPath.match(/^\/admin\/tag\/(new|\d+)$/)) {
        updateAdminTitle('Tag Details');
        await renderTagDetail(cleanPath.split('/').pop());
    } else if (cleanPath.match(/^\/admin\/user\/\d+$/)) {
        updateAdminTitle('User Details');
        await renderUserDetail(cleanPath.split('/').pop());
    } else {
        const perms = await ajaxGet('/api/user/elements/can_manage_users,can_manage_events,can_manage_transactions,is_exec').catch(() => ({}));

        let globalsButton = '';
        try {
            const status = await ajaxGet('/api/globals/status');
            if (status.isPresident) globalsButton = `<button onclick="switchView('/admin/globals')">Manage Globals</button>`;
        } catch (e) {}

        let usersButton = '';
        if (perms.can_manage_users || perms.can_manage_transactions || perms.is_exec) {
            usersButton = `<button onclick="switchView('/admin/users')">Manage Users</button>`;
        }

        let eventsButton = '';
        if (perms.can_manage_events) eventsButton = `<button onclick="switchView('/admin/events')">Manage Events</button>`;

        let tagsButton = '';
        if (perms.can_manage_events) tagsButton = `<button onclick="switchView('/admin/tags')">Manage Tags</button>`;

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

ViewChangedEvent.subscribe(AdminNavigationListener);
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);