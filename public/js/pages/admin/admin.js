/**
 * admin.js
 * 
 * Central entry point and secondary router for the Admin Dashboard.
 * 
 * Registered Route: /admin/*
 */

import { ViewChangedEvent, switchView, addRoute } from '/js/utils/view.js';
import { apiRequest } from '/js/utils/api.js';
import { TabNav } from '/js/widgets/TabNav.js';
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
import { renderManageSlides } from './slides.js';
import { requireAuth } from '/js/utils/auth.js';
import {
    GROUP_SVG, CALENDAR_TODAY_SVG, LOCAL_ACTIVITY_SVG,
    ID_CARD_SVG, SETTINGS_SVG, FOLDER_SVG, IMAGE_SVG
} from '../../../images/icons/outline/icons.js';

export const adminContentID = 'admin-content';

/**
 * Dynamically renders the administrative navigation bar based on the current user's permissions.
 * 
 * @param {string} activeSection - Key of the section to highlight (e.g. 'users', 'events').
 * @returns {Promise<string>} - HTML string for the navigation bar.
 */
export async function renderAdminNavBar(activeSection) {
    const existingNav = document.getElementById('admin-main-nav');
    if (existingNav && existingNav._syncToggleGroup) {
        existingNav._syncToggleGroup();
    }

    const [userData, statusData] = await Promise.all([
        apiRequest('GET', '/api/user/elements/permissions', true).catch(() => ({})),
        apiRequest('GET', '/api/globals/status', true).catch(() => null)
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

    setTimeout(() => TabNav.initElement(document.getElementById('admin-main-nav')), 50);

    return /*html*/`
        <nav class="toggle-group admin-nav-group" id="admin-main-nav">
            <div class="toggle-bg"></div>
            ${(canManageUsers || canManageTransactions || isExec) ? navItem('/admin/users', 'Users', 'users') : ''}
            ${canManageEvents ? navItem('/admin/events', 'Events', 'events') : ''}
            ${canManageEvents ? navItem('/admin/tags', 'Tags', 'tags') : ''}
            ${canManageFiles ? navItem('/admin/files', 'Files', 'files') : ''}
            ${canManageRoles ? navItem('/admin/roles', 'Roles', 'roles') : ''}
            ${isExec ? navItem('/admin/slides', 'Slides', 'slides') : ''}
            ${isPresident ? navItem('/admin/globals', 'Globals', 'globals') : ''}
        </nav>
    `;
}

addRoute('/admin/*', 'admin');

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
 * Updates the admin dashboard title based on the active section.
 * 
 * @param {string} [section] - Name of the section (e.g. 'Users').
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
 * Primary navigation listener for the admin module.
 * 
 * @param {object} eventData - Router event data.
 */
async function AdminNavigationListener({ viewId, path }) {
    if (viewId !== "admin") return;

    document.querySelectorAll('.toggle-group[id]').forEach(el => {
        if (el._syncToggleGroup) el._syncToggleGroup();
    });

    const [authOk, userData, statusData] = await Promise.all([
        requireAuth(),
        apiRequest('GET', '/api/user/elements/permissions', true),
        apiRequest('GET', '/api/globals/status', true).catch(() => ({}))
    ]);

    if (!authOk) return;

    const perms = userData.permissions || [];

    // Redirect if user has no administrative roles
    if (perms.length === 0) {
        switchView('/unauthorised');
        return;
    }

    // Permission flags
    const canManageUsers = perms.includes('user.manage');
    const canManageEvents = perms.includes('event.manage.all') || perms.includes('event.manage.scoped');
    const canManageTransactions = perms.includes('transaction.manage');
    const canManageRoles = perms.includes('role.manage');
    const canManageDocs = perms.includes('document.write') || perms.includes('document.edit');
    const isExec = perms.length > 0;
    const isPresident = !!statusData;

    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    updateAdminTitle();
    if (actionsEl) actionsEl.innerHTML = '';

    const cleanPath = path.split('?')[0];

    // Determine access eligibility for specific modules
    const canAccessUsers = canManageUsers || canManageTransactions || isExec;
    const canAccessEvents = canManageEvents;
    const canAccessTags = canManageEvents;
    const canAccessRoles = canManageRoles;
    const canAccessGlobals = isPresident;
    const canAccessDocs = canManageDocs;

    // --- Sub-Route Handling ---

    // Users Module
    if (cleanPath === '/admin/users' || cleanPath.match(/^\/admin\/user\/\d+$/)) {
        if (!canAccessUsers) return switchView('/unauthorised');
        updateAdminTitle(cleanPath.match(/\d+$/) ? 'User Details' : 'Users');

        if (cleanPath === '/admin/users') await renderManageUsers();
        else await renderUserDetail(cleanPath.split('/').pop());

        // Events Module
    } else if (cleanPath === '/admin/events' || cleanPath.match(/^\/admin\/event\/(new|\d+)$/)) {
        if (!canAccessEvents) return switchView('/unauthorised');
        updateAdminTitle(cleanPath.match(/(new|\d+)$/) ? 'Event Details' : 'Events');

        if (cleanPath === '/admin/events') await renderManageEvents();
        else await renderEventDetail(cleanPath.split('/').pop());

        // Tags Module
    } else if (cleanPath === '/admin/tags' || cleanPath.match(/^\/admin\/tag\/(new|\d+)$/)) {
        if (!canAccessTags) return switchView('/unauthorised');
        updateAdminTitle(cleanPath.match(/(new|\d+)$/) ? 'Tag Details' : 'Tags');

        if (cleanPath === '/admin/tags') await renderManageTags();
        else await renderTagDetail(cleanPath.split('/').pop());

        // Roles Module
    } else if (cleanPath === '/admin/roles' || cleanPath.match(/^\/admin\/role\/(new|\d+)$/)) {
        if (!canAccessRoles) return switchView('/unauthorised');
        updateAdminTitle(cleanPath.match(/(new|\d+)$/) ? 'Role Details' : 'Roles');

        if (cleanPath === '/admin/roles') await renderManageRoles();
        else await renderRoleDetail(cleanPath.split('/').pop());

        // Files Module
    } else if (cleanPath === '/admin/files') {
        if (!canAccessDocs) return switchView('/unauthorised');
        updateAdminTitle('Files');
        await renderAdminFiles();

        // Global Settings
    } else if (cleanPath === '/admin/globals') {
        if (!canAccessGlobals) return switchView('/unauthorised');
        updateAdminTitle('Globals');
        await renderManageGlobals();

        // Slides Module
    } else if (cleanPath === '/admin/slides') {
        if (!isExec) return switchView('/unauthorised');
        updateAdminTitle('Slides');
        await renderManageSlides();

        // Dashboard Home
    } else if (cleanPath === '/admin' || cleanPath === '/admin/') {
        let cardsHtml = '';

        if (canAccessUsers) cardsHtml += createDashboardCard('Users', 'Manage members & permissions', GROUP_SVG, '/admin/users');
        if (isExec) cardsHtml += createDashboardCard('Slides', 'Homepage slideshow', IMAGE_SVG, '/admin/slides');
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

/**
 * Creates HTML for a dashboard feature card.
 */
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