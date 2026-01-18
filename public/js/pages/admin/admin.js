import { ViewChangedEvent, switchView, addRoute } from '/js/utils/view.js';
import { ajaxGet } from '/js/utils/ajax.js';
import { adminContentID } from './common.js';
import { renderManageUsers } from './user/manage.js';
import { renderUserDetail } from './user/detail.js';
import { renderManageEvents } from './event/manage.js';
import { renderEventDetail } from './event/detail.js';
import { renderManageTags } from './tag/manage.js';
import { renderTagDetail } from './tag/detail.js';
import { renderManageRoles } from './role/manage.js';
import { renderRoleDetail } from './role/detail.js';
import { renderManageGlobals } from './globals.js';
import { renderUserAdvanced } from './user/advanced.js';
import { requireAuth } from '/js/utils/auth.js';

/**
 * Nested router for administrative modules.
 * @module Admin
 */

addRoute('/admin/*', 'admin');

/**
 * Admin layout template.
 */
const HTML_TEMPLATE = /*html*/`
<div id="admin-view" class="view hidden small-container">
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
async function AdminNavigationListener({ viewId, path }) {
    if (viewId !== "admin") return;

    if (!await requireAuth()) return;

    const userData = await ajaxGet('/api/user/elements/permissions').catch(() => ({}));
    const perms = userData.permissions || [];
    
    if (perms.length === 0) {
        switchView('/unauthorized');
        return;
    }

    const canManageUsers = perms.includes('user.manage');
    const canManageEvents = perms.includes('event.manage.all') || perms.includes('event.manage.scoped');
    const canManageTransactions = perms.includes('transaction.manage');
    const canManageRoles = perms.includes('role.manage');
    const isExec = perms.length > 0;
    const isPresident = await ajaxGet('/api/globals/status').then(_ => true).catch(() => false);

    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    updateAdminTitle();
    if (actionsEl) actionsEl.innerHTML = '';

    const cleanPath = path.split('?')[0];

    const canAccessUsers = canManageUsers || canManageTransactions || isExec;
    const canAccessEvents = canManageEvents;
    const canAccessTags = canManageEvents; 
    const canAccessRoles = canManageRoles;
    const canAccessGlobals = isPresident;

    if (cleanPath === '/admin/users' || cleanPath.match(/^\/admin\/user\/\d+(\/advanced)?$/)) {
        if (!canAccessUsers) return switchView('/unauthorized');
        updateAdminTitle(cleanPath.includes('advanced') ? 'Advanced User Settings' : (cleanPath.match(/\d+$/) ? 'User Details' : 'Users'));
        
        if (cleanPath === '/admin/users') await renderManageUsers();
        else if (cleanPath.includes('advanced')) await renderUserAdvanced(cleanPath.split('/')[3]);
        else await renderUserDetail(cleanPath.split('/').pop());

    } else if (cleanPath === '/admin/events' || cleanPath.match(/^\/admin\/event\/(new|\d+)$/)) {
        if (!canAccessEvents) return switchView('/unauthorized');
        updateAdminTitle(cleanPath.match(/(new|\d+)$/) ? 'Event Details' : 'Events');
        
        if (cleanPath === '/admin/events') await renderManageEvents();
        else await renderEventDetail(cleanPath.split('/').pop());

    } else if (cleanPath === '/admin/tags' || cleanPath.match(/^\/admin\/tag\/(new|\d+)$/)) {
        if (!canAccessTags) return switchView('/unauthorized');
        updateAdminTitle(cleanPath.match(/(new|\d+)$/) ? 'Tag Details' : 'Tags');
        
        if (cleanPath === '/admin/tags') await renderManageTags();
        else await renderTagDetail(cleanPath.split('/').pop());

    } else if (cleanPath === '/admin/roles' || cleanPath.match(/^\/admin\/role\/(new|\d+)$/)) {
        if (!canAccessRoles) return switchView('/unauthorized');
        updateAdminTitle(cleanPath.match(/(new|\d+)$/) ? 'Role Details' : 'Roles');
        
        if (cleanPath === '/admin/roles') await renderManageRoles();
        else await renderRoleDetail(cleanPath.split('/').pop());

    } else if (cleanPath === '/admin/globals') {
        if (!canAccessGlobals) return switchView('/unauthorized');
        updateAdminTitle('Globals');
        await renderManageGlobals();

    } else if (cleanPath === '/admin' || cleanPath === '/admin/') {
        // Main Dashboard Home
        console.log('Admin Dashboard Permissions:', { canManageUsers, canManageEvents, canManageTransactions, canManageRoles, isExec });

        let usersButton = canAccessUsers ? `<button data-nav="/admin/users">Manage Users</button>` : '';
        let eventsButton = canAccessEvents ? `<button data-nav="/admin/events">Manage Events</button>` : '';
        let tagsButton = canAccessTags ? `<button data-nav="/admin/tags">Manage Tags</button>` : '';
        let rolesButton = canAccessRoles ? `<button data-nav="/admin/roles">Manage Roles</button>` : '';
        let globalsButton = canAccessGlobals ? `<button data-nav="/admin/globals">Manage Globals</button>` : '';

        adminContent.innerHTML = `
            <div class="admin-controls-center">
                ${usersButton}
                ${eventsButton}
                ${tagsButton}
                ${rolesButton}
                ${globalsButton}
            </div>
            <p class="text-center margin-top">Select an option to manage.</p>
        `;
    }
}

ViewChangedEvent.subscribe(AdminNavigationListener);
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);