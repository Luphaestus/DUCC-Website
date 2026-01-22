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
import { renderAdminFiles } from './files.js';
import { requireAuth } from '/js/utils/auth.js';
import { GROUP_SVG, CALENDAR_TODAY_SVG, LOCAL_ACTIVITY_SVG, ID_CARD_SVG, SETTINGS_SVG, FOLDER_SVG } from '../../../images/icons/outline/icons.js';

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
    <div class="admin-header-modern">
        <h1 id="admin-dashboard-title">Admin Dashboard</h1>
        <div id="admin-header-actions" class="header-actions"></div>
    </div>
    <div id="${adminContentID}" class="admin-content-wrapper">
        <p class="loading-text">Loading...</p>
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
        titleEl.innerHTML = `<span class="admin-title-section">${section}</span>`;
    } else {
        titleEl.innerHTML = `<span class="admin-title-section">Dashboard</span>`;
    }
}

/**
 * Router for sub-paths within /admin/*.
 * @param {object} eventData
 */
async function AdminNavigationListener({ viewId, path }) {
    if (viewId !== "admin") return;

    // Save positions of all existing toggle groups before they are replaced
    document.querySelectorAll('.toggle-group[id]').forEach(el => {
        if (el._syncToggleGroup) el._syncToggleGroup();
    });

    // Parallelize authentication and permission checks to reduce latency
    const [authOk, userData, statusData] = await Promise.all([
        requireAuth(),
        ajaxGet('/api/user/elements/permissions', true),
        ajaxGet('/api/globals/status', true).catch(() => ({}))
    ]);

    if (!authOk) return;

    const perms = userData.permissions || [];
    
    if (perms.length === 0) {
        switchView('/unauthorized');
        return;
    }

    const canManageUsers = perms.includes('user.manage');
    const canManageEvents = perms.includes('event.manage.all') || perms.includes('event.manage.scoped');
    const canManageTransactions = perms.includes('transaction.manage');
    const canManageRoles = perms.includes('role.manage');
    const canManageDocs = perms.includes('document.write') || perms.includes('document.edit');
    const isExec = perms.length > 0;
    const isPresident = !!statusData; // statusData exists if request succeeded

    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    updateAdminTitle();
    if (actionsEl) actionsEl.innerHTML = '';

    const cleanPath = path.split('?')[0];

    // Protection logic based on button visibility
    const canAccessUsers = canManageUsers || canManageTransactions || isExec;
    const canAccessEvents = canManageEvents;
    const canAccessTags = canManageEvents; 
    const canAccessRoles = canManageRoles;
    const canAccessGlobals = isPresident;
    const canAccessDocs = canManageDocs;

    if (cleanPath === '/admin/users' || cleanPath.match(/^\/admin\/user\/\d+$/)) {
        if (!canAccessUsers) return switchView('/unauthorized');
        updateAdminTitle(cleanPath.match(/\d+$/) ? 'User Details' : 'Users');
        
        if (cleanPath === '/admin/users') await renderManageUsers();
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

    } else if (cleanPath === '/admin/files') {
        if (!canAccessDocs) return switchView('/unauthorized');
        updateAdminTitle('Files');
        await renderAdminFiles();

    } else if (cleanPath === '/admin/globals') {
        if (!canAccessGlobals) return switchView('/unauthorized');
        updateAdminTitle('Globals');
        await renderManageGlobals();

    } else if (cleanPath === '/admin' || cleanPath === '/admin/') {
        // Main Dashboard Home
        let cardsHtml = '';
        
        if (canAccessUsers) cardsHtml += createDashboardCard('Users', 'Manage members & permissions', GROUP_SVG, '/admin/users');
        if (canAccessEvents) cardsHtml += createDashboardCard('Events', 'Schedule & attendance', CALENDAR_TODAY_SVG, '/admin/events');
        if (canAccessTags) cardsHtml += createDashboardCard('Tags', 'Event categories & styles', LOCAL_ACTIVITY_SVG, '/admin/tags');
        if (canAccessDocs) cardsHtml += createDashboardCard('Files', 'Documents & resources', FOLDER_SVG, '/admin/files');
        if (canAccessRoles) cardsHtml += createDashboardCard('Roles', 'User roles & access', ID_CARD_SVG, '/admin/roles');
        if (canAccessGlobals) cardsHtml += createDashboardCard('Globals', 'System configuration', SETTINGS_SVG, '/admin/globals');

        adminContent.innerHTML = `
            <div class="dashboard-grid">
                ${cardsHtml}
            </div>
        `;
    }
}

function createDashboardCard(title, desc, icon, link) {
    return `
        <button class="dashboard-card" data-nav="${link}">
            <div class="card-icon">${icon}</div>
            <div class="card-content">
                <h3>${title}</h3>
                <p>${desc}</p>
            </div>
        </button>
    `;
}

ViewChangedEvent.subscribe(AdminNavigationListener);
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);