/**
 * detail.js (User)
 * 
 * Main logic for the detailed user management view in the Admin Dashboard.
 * Implements a tabbed interface (Profile, Legal, Tags, Transactions) with
 * synchronized URL query parameters for deep linking.
 * 
 * Registered Route: /admin/user/:id
 */

import { ajaxGet } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, initToggleGroup } from '../common.js';
import { ARROW_BACK_IOS_NEW_SVG } from '../../../../images/icons/outline/icons.js';

// Import sub-renderers for specific tabs
import { renderProfileTab } from './tabs/profile.js';
import { renderLegalTab } from './tabs/legal.js';
import { renderTagsTab } from './tabs/tags.js';
import { renderTransactionsTab } from './tabs/transactions.js';

/**
 * Main rendering function for the user management dashboard.
 * 
 * @param {string|number} userId - Database ID of the user to manage.
 */
export async function renderUserDetail(userId) {
    const adminContent = document.getElementById(adminContentID);
    adminContent.innerHTML = '<p aria-busy="true">Loading user details...</p>';

    // Set up toolbar back button
    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) {
        actionsEl.innerHTML = `<button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Users</button>`;
        document.getElementById('admin-back-btn').onclick = () => switchView('/admin/users');
    }

    try {
        // Fetch detailed user record and current admin permissions
        const user = await ajaxGet(`/api/admin/user/${userId}`);
        const userData = await ajaxGet('/api/user/elements/permissions').catch(() => ({}));
        const userPerms = userData.permissions || [];

        // Check granular access levels
        const canManageUsers = userPerms.includes('user.manage');
        const canManageTransactions = userPerms.includes('transaction.manage');
        const isExec = userPerms.length > 0;

        // Build the dynamic tab bar based on permissions
        let tabsHtml = '<div class="toggle-bg"></div><button data-tab="profile" class="tab-btn active">Profile</button>';
        if (canManageUsers) {
            tabsHtml += `
                <button data-tab="legal" class="tab-btn">Legal</button>
                <button data-tab="tags" class="tab-btn">Tags</button>
            `;
        }
        if (canManageTransactions) {
            tabsHtml += `
                <button data-tab="transactions" class="tab-btn">Transactions</button>
            `;
        }

        adminContent.innerHTML = /*html*/`
            <div class="glass-layout">
                <div class="glass-panel mb-1-5">
                    <header class="user-detail-header">
                        <div class="user-identity">
                            <h2 class="user-name-header">${user.first_name} ${user.last_name}</h2>
                            <span class="user-id-badge">ID: ${user.id}</span>
                        </div>
                        <nav class="toggle-group" id="admin-user-tabs">
                            ${tabsHtml}
                        </nav>
                    </header>
                    <div id="admin-tab-content" class="tab-content-area"></div>
                </div>
            </div>
        `;

        const tabsNav = adminContent.querySelector('#admin-user-tabs');
        const tabs = tabsNav.querySelectorAll('button');

        /**
         * Standardized logic for switching the active tab.
         * Updates visual state and history.
         */
        const updateActiveTab = (activeBtn) => {
            tabs.forEach(t => t.classList.remove('active'));
            activeBtn.classList.add('active');
            // Re-sync the sliding background
            initToggleGroup(tabsNav);
        };

        // Determine initial tab from URL or default to 'profile'
        const currentTab = new URLSearchParams(window.location.search).get('tab') || 'profile';
        const initialTabBtn = Array.from(tabs).find(t => t.dataset.tab === currentTab) || tabs[0];

        // Attach listeners to all generated tabs
        tabs.forEach(btn => {
            btn.onclick = () => {
                updateActiveTab(btn);
                // Update URL for deep linking without triggering a full router switch
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('tab', btn.dataset.tab);
                window.history.replaceState({}, '', newUrl);
                
                renderTab(btn.dataset.tab, user, userPerms, canManageUsers, isExec);
            };
        });

        // Bootstrap the initial view
        if (initialTabBtn) {
            updateActiveTab(initialTabBtn);
            renderTab(initialTabBtn.dataset.tab, user, userPerms, canManageUsers, isExec);
            // Delay initial background sync to ensure fonts/layout are stable
            setTimeout(() => initToggleGroup(tabsNav), 50);
        }

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = `
            <div class="form-info">
                <article class="form-box admin-card">
                    <h3 class="error-text">Error</h3>
                    <p>Failed to load user details.</p>
                </article>
            </div>`;
    }
}

/**
 * Delegates content rendering to the appropriate sub-module.
 * 
 * @param {string} tabName - Key of the tab to render.
 * @param {object} user - The user data object.
 * @param {string[]} userPerms - List of current admin permissions.
 * @param {boolean} canManageUsers - Simplified permission flag.
 * @param {boolean} isExec - Simplified permission flag.
 */
async function renderTab(tabName, user, userPerms, canManageUsers, isExec) {
    const container = document.getElementById('admin-tab-content');
    if (!container) return;

    if (tabName === 'profile') {
        renderProfileTab(container, user, userPerms, canManageUsers, isExec);
    } else if (tabName === 'legal') {
        renderLegalTab(container, user);
    } else if (tabName === 'transactions') {
        renderTransactionsTab(container, user.id);
    } else if (tabName === 'tags') {
        renderTagsTab(container, user.id);
    }
}