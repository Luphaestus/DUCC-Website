//todo refine  
/**
 * detail.js (User)
 * 
 * Main logic for the detailed user management view in the Admin Dashboard.
 * 
 * Registered Route: /admin/user/:id
 */

import { apiRequest } from '/js/utils/api.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../admin.js';
import { ARROW_BACK_IOS_NEW_SVG } from '../../../../images/icons/outline/icons.js';
import { TabNav } from '/js/widgets/TabNav.js';
import { Panel } from '/js/widgets/panel.js';

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
        const user = await apiRequest('GET', `/api/admin/user/${userId}`);
        const userData = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({}));
        const userPerms = userData.permissions || [];

        // Check granular access levels
        const canManageUsers = userPerms.includes('user.manage');
        const canManageTransactions = userPerms.includes('transaction.manage');
        const isExec = userPerms.length > 0;

        // Build the dynamic tab list
        const tabs = [{ label: 'Profile', key: 'profile', data: { tab: 'profile' } }];
        if (canManageUsers) {
            tabs.push({ label: 'Legal', key: 'legal', data: { tab: 'legal' } });
            tabs.push({ label: 'Tags', key: 'tags', data: { tab: 'tags' } });
        }
        if (canManageTransactions) {
            tabs.push({ label: 'Transactions', key: 'transactions', data: { tab: 'transactions' } });
        }

        const currentTab = new URLSearchParams(window.location.search).get('tab') || 'profile';

        const tabNav = new TabNav({
            id: 'admin-user-tabs',
            tabs,
            activeKey: currentTab
        });

        adminContent.innerHTML = `
            <div class="glass-layout">
                ${Panel({
            content: `
                        <header class="user-detail-header">
                            <div class="user-identity">
                                <h2 class="user-name-header">${user.first_name} ${user.last_name}</h2>
                                <span class="user-id-badge">ID: ${user.id}</span>
                            </div>
                            ${tabNav.getHTML()}
                        </header>
                        <div id="admin-tab-content" class="tab-content-area"></div>
                    `,
            classes: 'mb-1-5'
        })}
            </div>
        `;

        const tabsNavEl = document.getElementById('admin-user-tabs');
        const tabButtons = tabsNavEl.querySelectorAll('button');

        tabNav.init();

        // Attach listeners to all generated tabs
        tabButtons.forEach(btn => {
            btn.onclick = () => {
                tabButtons.forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                tabNav.init(); 

                const newUrl = new URL(window.location);
                newUrl.searchParams.set('tab', btn.dataset.tab);
                window.history.replaceState({}, '', newUrl);

                renderTab(btn.dataset.tab, user, userPerms, canManageUsers, isExec);
            };
        });

       renderTab(currentTab, user, userPerms, canManageUsers, isExec);

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