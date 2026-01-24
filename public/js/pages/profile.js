/**
 * profile.js
 * 
 * Logic for the consolidated User Dashboard.
 * 
 * Registered Routes: /profile, /transactions
 */

import { LoginEvent } from './login.js';
import { apiRequest, clearApiCache } from '/js/utils/api.js';
import { LegalEvent } from './legal.js';
import { notify } from '/js/components/notification.js';
import { FirstNameChangedEvent } from '/js/components/navbar.js';
import { ViewChangedEvent, addRoute, switchView } from '/js/utils/view.js';
import { requireAuth } from '/js/utils/auth.js';
import { BalanceChangedEvent } from '/js/utils/events/events.js';
import { showConfirmModal, showPasswordModal, showChangePasswordModal } from '/js/utils/modal.js';
import {
    CHECK_SVG, CLOSE_SVG, SOCIAL_LEADERBOARD_SVG, ID_CARD_SVG, BRIGHTNESS_ALERT_SVG, POOL_SVG, DASHBOARD_SVG, WALLET_SVG,
    SETTINGS_SVG, LOGOUT_SVG, EDIT_SVG, SAVE_SVG, ADD_SVG, REMOVE_SVG,
    CONTRACT_SVG, MEDICAL_INFORMATION_SVG, GROUP_SVG, BOLT_SVG
} from '../../images/icons/outline/icons.js';

// Register routes
addRoute('/profile', 'profile');
addRoute('/transactions', 'profile');

/** HTML Template for the dashboard */
const HTML_TEMPLATE = /*html*/`
<div id="profile-view" class="view hidden">
    <div class="dashboard-container">
        <!-- Sidebar Navigation -->
        <nav class="dashboard-sidebar glass-panel">
            <button class="nav-item active" data-tab="overview">
                ${DASHBOARD_SVG} Overview
            </button>
            <button class="nav-item" data-tab="balance">
                ${WALLET_SVG} Balance & History
            </button>
            <button class="nav-item" data-tab="settings">
                ${SETTINGS_SVG} Account Settings
            </button>
            <button class="nav-item" id="sidebar-logout-btn">
                ${LOGOUT_SVG} Sign Out
            </button>
        </nav>

        <!-- Main Content Area -->
        <main class="dashboard-content">
            
            <!-- Overview Tab -->
            <section id="tab-overview" class="dashboard-section active">
                <div id="membership-banner-container"></div>

                <div class="glass-panel">
                    <div class="box-header">
                        <h3>${POOL_SVG} Swimming Stats</h3>
                        <button class="small-btn secondary" data-nav="/swims">
                            ${SOCIAL_LEADERBOARD_SVG} View Leaderboard
                        </button>
                    </div>
                    <div id="swim-stats-grid" class="stats-grid">
                        <p>Loading stats...</p>
                    </div>
                </div>

                <!-- Legal & Safety Row -->
                <div class="dual-grid">
                    <div class="glass-panel">
                        <div class="box-header">
                            <h3>${CONTRACT_SVG} Legal Waiver</h3>
                        </div>
                        <div id="legal-status-content">
                            <p>Loading...</p>
                        </div>
                    </div>

                    <!-- Safety/Medical Expiry Info -->
                    <div class="glass-panel">
                        <div class="box-header">
                            <h3>${MEDICAL_INFORMATION_SVG} Safety Info</h3>
                            <button id="edit-safety-btn" class="small-btn secondary">${EDIT_SVG} Edit</button>
                        </div>
                        <div id="safety-info-display">
                            <div class="info-rows">
                                <div class="info-row">
                                    <span>First Aid Expiry</span>
                                    <span id="display-first-aid">Not Set</span>
                                </div>
                                <div class="info-row">
                                    <span>Emergency Contact</span>
                                    <span id="display-emergency">Not Set</span>
                                </div>
                            </div>
                        </div>
                        <form id="safety-info-form" class="hidden modern-form">
                            <div class="grid-2-col">
                                <label>First Aid Expiry <input type="date" id="input-first-aid"></label>
                                <label>Emergency Contact <input type="tel" id="input-emergency" placeholder="07700 900000"></label>
                            </div>
                            <div class="form-actions">
                                <button type="button" id="cancel-safety-btn" class="secondary">${CLOSE_SVG} Cancel</button>
                                <button type="submit">${SAVE_SVG} Save</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Groups & Teams (Tags) -->
                <div id="groups-teams-panel" class="glass-panel">
                    <div class="box-header">
                        <h3>${GROUP_SVG} Groups & Teams</h3>
                    </div>
                    <div id="tags-list-container" class="tags-list">
                        <p>Loading tags...</p>
                    </div>
                </div>

                <!-- Instructor Application -->
                <div class="glass-panel">
                    <div class="role-toggle">
                        <div class="role-info">
                            <h4>${BOLT_SVG} Instructor Status</h4>
                            <p id="instructor-status-text">Not an instructor</p>
                        </div>
                        <button id="toggle-instructor-btn" class="small-btn secondary">Apply</button>
                    </div>
                </div>
            </section>

            <section id="tab-balance" class="dashboard-section">
                <!-- Balance Overview -->
                <div class="balance-header">
                    <div class="balance-info">
                        <span class="label">Current Balance</span>
                        <span class="amount" id="balance-amount">£0.00</span>
                    </div>
                    <div class="balance-actions">
                        <button id="top-up-btn" class="primary">Top Up Balance</button>
                    </div>
                </div>

                <!-- List of recent transactions -->
                <div class="glass-panel">
                    <div class="box-header">
                        <h3>Transaction History</h3>
                    </div>
                    <div id="transactions-list-container" class="transaction-list">
                        <p>Loading history...</p>
                    </div>
                </div>
            </section>

            <section id="tab-settings" class="dashboard-section">
                <div class="settings-grid">
                    <!-- Security Controls -->
                    <div class="glass-panel">
                        <div class="box-header">
                            <h3>${ID_CARD_SVG} Security</h3>
                        </div>
                        <button id="change-password-btn" class="outline">Change Password</button>
                    </div>

                    <!-- Account Deletion -->
                    <div class="glass-panel danger-zone">
                        <div class="box-header">
                            <h3>${BRIGHTNESS_ALERT_SVG} Danger Zone</h3>
                        </div>
                        <button id="delete-account-btn" class="delete outline">Delete Account</button>
                    </div>
                </div>
            </section>

        </main>
    </div>
</div>`;

let currentUser = null;

// --- Helper Functions ---

function showStatus(title, message, type) {
    notify(title, message, type, 3000, 'profile-status');
}

/**
 * Formats a number with its ordinal suffix.
 * 
 * @param {number|string} n 
 * @returns {string}
 */
function getOrdinal(n) {
    if (n === undefined || n === null || n === '-' || n < 1) return '-';
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// --- Render Functions ---

/**
 * Renders the top-level membership banner for non-members.
 * 
 * @param {object} profile - User profile data.
 * @param {object} globals - Global settings (e.g. membership cost).
 */
function renderMembershipBanner(profile, globals) {
    const container = document.getElementById('membership-banner-container');
    if (!container) return;

    const isMember = profile.is_member;
    const freeSessions = profile.free_sessions || 0;
    const cost = Number(globals.MembershipCost) || 50;

    if (!isMember) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="membership-banner">
                <div class="banner-content">
                    <h2>You aren't a member yet</h2>
                    <p>You have <strong>${freeSessions}</strong> free trial event${freeSessions !== 1 ? 's' : ''} remaining before membership is required.</p>
                </div>
                <div class="banner-action">
                    <button id="join-membership-btn">Become a Member</button>
                </div>
            </div>`;

        document.getElementById('join-membership-btn').onclick = async () => {
            const confirmed = await showConfirmModal(
                "Confirm Membership",
                `Becoming a member costs <strong>£${cost.toFixed(2)}</strong>. This will be added to your account balance. Are you sure?`
            );
            if (confirmed) {
                try {
                    await apiRequest('POST', '/api/user/join');
                    showStatus('Welcome!', 'You are now a club member.', 'success');
                    updateDashboard();
                } catch (err) {
                    showStatus('Error', err.message || 'Failed to join.', 'error');
                }
            }
        };
    } else {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
}

/**
 * Renders user's swimming statistics grid.
 * 
 * @param {object} stats 
 */
function renderSwimStats(stats) {
    const grid = document.getElementById('swim-stats-grid');
    const s = stats || { allTime: { swims: 0, rank: '-' }, yearly: { swims: 0, rank: '-' } };

    grid.innerHTML = `
        <div class="stat-item">
            <span class="stat-value">${s.yearly.swims}</span>
            <span class="stat-label">Yearly Swims</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${getOrdinal(s.yearly.rank)}</span>
            <span class="stat-label">Yearly Rank</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${s.allTime.swims}</span>
            <span class="stat-label">Total Swims</span>
        </div>
        <div class="stat-item">
            <span class="stat-value">${getOrdinal(s.allTime.rank)}</span>
            <span class="stat-label">All Time Rank</span>
        </div>
    `;
}

/**
 * Renders the legal waiver status card.
 * 
 * @param {object} profile 
 */
function renderLegalStatus(profile) {
    const container = document.getElementById('legal-status-content');
    const isComplete = !!profile.filled_legal_info;
    const lastFilled = profile.legal_filled_at ? new Date(profile.legal_filled_at).toLocaleDateString('en-GB') : null;

    // Link the "Update" button to the legal form view
    const header = container.parentElement.querySelector('.box-header');
    let updateBtn = header.querySelector('.small-btn');
    if (!updateBtn) {
        updateBtn = document.createElement('button');
        updateBtn.className = 'small-btn secondary';
        updateBtn.setAttribute('data-nav', '/legal');
        header.appendChild(updateBtn);
    }
    updateBtn.innerHTML = `${EDIT_SVG} Update`;

    if (isComplete) {
        container.innerHTML = `
            <div class="status-indicator-box status-green">
                <div class="indicator-header">
                    ${CHECK_SVG} <span>Active</span>
                </div>
                <div class="indicator-body">
                    <p>Your legal waiver is up to date.</p>
                    ${lastFilled ? `<p class="last-filled">Last filled out: ${lastFilled}</p>` : ''}
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="status-indicator-box status-red">
                <div class="indicator-header">
                    ${BRIGHTNESS_ALERT_SVG} <span>Action Required</span>
                </div>
                <div class="indicator-body">
                    <p>You must complete the legal waiver to participate in events.</p>
                </div>
            </div>
        `;
    }
}

/**
 * Syncs profile safety fields with the UI.
 * 
 * @param {object} profile 
 */
function renderSafetyInfo(profile) {
    document.getElementById('display-first-aid').textContent = profile.first_aid_expiry || 'Not Set';
    document.getElementById('display-emergency').textContent = profile.phone_number || 'Not Set';

    document.getElementById('input-first-aid').value = profile.first_aid_expiry || '';
    document.getElementById('input-emergency').value = profile.phone_number || '';
}

/**
 * Renders the list of tags (teams/groups) assigned to the user.
 * 
 * @param {object[]} tags 
 */
function renderTags(tags) {
    const container = document.getElementById('tags-list-container');
    if (tags && tags.length > 0) {
        container.innerHTML = tags.map(tag =>
            `<span class="tag-badge" style="--tag-color: ${tag.color};">${tag.name}</span>`
        ).join('');
    } else {
        const pannel = document.getElementById('groups-teams-panel');
        if (pannel) pannel.classList.add('hidden');
    }
}

/**
 * Renders the instructor status toggle/application button.
 * 
 * @param {object} profile 
 */
function renderInstructor(profile) {
    const isInstructor = profile.is_instructor;
    const text = document.getElementById('instructor-status-text');
    const btn = document.getElementById('toggle-instructor-btn');

    if (isInstructor) {
        text.textContent = 'Active Instructor';
        text.classList.add('instructor-active');
        btn.textContent = 'Resign';
        btn.className = 'small-btn outline delete';
        btn.onclick = async () => {
            if (await showConfirmModal('Resign?', 'Are you sure you want to resign as an instructor?')) {
                await apiRequest('POST', '/api/user/elements', { is_instructor: false });
                updateDashboard();
            }
        };
    } else {
        text.textContent = 'Not an instructor';
        text.classList.remove('instructor-active');
        btn.textContent = 'Apply';
        btn.className = 'small-btn secondary';
        btn.onclick = async () => {
            await apiRequest('POST', '/api/user/elements', { is_instructor: true });
            updateDashboard();
        };
    }
}

/**
 * Updates the user's financial balance display.
 * 
 * @param {object} profile 
 */
function renderBalance(profile) {
    const bal = Number(profile.balance);
    const el = document.getElementById('balance-amount');
    el.textContent = `£${bal.toFixed(2)}`;
    el.classList.toggle('balance-negative', bal < 0);
    el.classList.toggle('balance-positive', bal > 0);
}

/**
 * Fetches and renders the user's transaction history list.
 */
async function renderTransactions() {
    const container = document.getElementById('transactions-list-container');
    try {
        const res = await apiRequest('GET', '/api/user/elements/transactions');
        const txs = res.transactions || [];

        if (txs.length === 0) {
            container.innerHTML = '<p class="empty-text">No transactions found.</p>';
            return;
        }

        container.innerHTML = txs.map(tx => {
            const isNegative = tx.amount < 0;
            const icon = isNegative ? REMOVE_SVG : ADD_SVG;
            const iconClass = isNegative ? 'negative' : 'positive';
            const dateStr = new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            return `
                <div class="transaction-item glass-panel">
                    <div class="tx-icon ${iconClass}">${icon}</div>
                    <div class="tx-details">
                        <span class="tx-title">${tx.description}</span>
                        <span class="tx-date">${dateStr}</span>
                    </div>
                    <div class="tx-amount-group">
                        <span class="tx-amount ${iconClass}">${isNegative ? '' : '+'}${tx.amount.toFixed(2)}</span>
                        <span class="tx-balance-after">£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        container.innerHTML = '<p class="error-text">Failed to load transactions.</p>';
    }
}

// --- Main Update Logic ---

/**
 * Full dashboard data refresh.
 * Fetches user profile, global settings, and tags in parallel.
 */
async function updateDashboard() {
    if (!await requireAuth()) return;

    try {
        const [profile, globals, tags] = await Promise.all([
            apiRequest('GET', '/api/user/elements/email,first_name,last_name,is_member,is_instructor,filled_legal_info,legal_filled_at,phone_number,first_aid_expiry,free_sessions,balance,swims,swimmer_rank'),
            apiRequest('GET', '/api/globals/MembershipCost'),
            apiRequest('GET', '/api/user/tags').catch(() => [])
        ]);

        currentUser = profile;

        if (currentUser) {
            renderMembershipBanner(profile, globals.res || {});
            renderSwimStats(profile.swimmer_stats);
            renderLegalStatus(profile);
            renderSafetyInfo(profile);
            renderTags(tags);
            renderInstructor(profile);
        }
        renderBalance(profile);
        renderTransactions();

    } catch (error) {
        console.error("Dashboard update failed", error);
        showStatus('Error', 'Failed to load profile data.', 'error');
    }
}

// --- Event Listeners ---

/**
 * Binds static UI element listeners.
 */
function bindEvents() {
    // Sidebar Tab Switching
    document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            const url = new URL(window.location);
            url.searchParams.set('tab', tabName);
            window.history.pushState({}, '', url);
            setActiveTab(tabName);
        });
    });

    // Safety Info Inline Editor Toggle
    const displayDiv = document.getElementById('safety-info-display');
    const formDiv = document.getElementById('safety-info-form');
    const editBtn = document.getElementById('edit-safety-btn');
    const cancelBtn = document.getElementById('cancel-safety-btn');

    editBtn.onclick = () => {
        displayDiv.classList.add('hidden');
        formDiv.classList.remove('hidden');
        editBtn.classList.add('hidden');
    };

    const closeSafetyEdit = () => {
        displayDiv.classList.remove('hidden');
        formDiv.classList.add('hidden');
        editBtn.classList.remove('hidden');
    };

    cancelBtn.onclick = closeSafetyEdit;

    formDiv.onsubmit = async (e) => {
        e.preventDefault();
        const updateData = {
            first_aid_expiry: document.getElementById('input-first-aid').value,
            phone_number: document.getElementById('input-emergency').value
        };
        try {
            await apiRequest('POST', '/api/user/elements', updateData);
            showStatus('Success', 'Safety info updated.', 'success');
            await updateDashboard();
            closeSafetyEdit();
        } catch (err) {
            showStatus('Error', err.message, 'error');
        }
    };

    // Manual Top Up Instruction Modal
    document.getElementById('top-up-btn').onclick = () => {
        const refrense = currentUser.first_name.charAt(0).toUpperCase() + currentUser.last_name.toUpperCase() + "WEBSITE";

        showConfirmModal(
            "Top Up Balance",
            `Please transfer the desired amount to:<br><br>
            <strong>Bank:</strong> Durham University<br>
            <strong>Sort Code:</strong> 20-27-66<br>
            <strong>Account:</strong> 53770109<br>
            <strong>Reference:</strong> ${refrense}<br><br>
            <p>Pressing the confirm button will notify the finance team to credit your account once the transfer is verified. Please press cancel if you have not made a transfer.</p>`
        );
    };

    // Account Security Listeners
    document.getElementById('change-password-btn').onclick = async () => {
        const passwords = await showChangePasswordModal();
        if (passwords) {
            try {
                await apiRequest('POST', '/api/auth/change-password', passwords);
                showStatus('Success', 'Password changed.', 'success');
            } catch (err) {
                showStatus('Error', 'Failed to change password.', 'error');
            }
        }
    };

    document.getElementById('delete-account-btn').onclick = async () => {
        const password = await showPasswordModal("Delete Account", "This cannot be undone. Enter password to confirm.");
        if (password) {
            try {
                await apiRequest('POST', '/api/user/deleteAccount', { password });
                LoginEvent.notify({ authenticated: false });
                switchView('/home');
            } catch (err) {
                showStatus('Error', 'Delete failed. Check password.', 'error');
            }
        }
    };

    document.getElementById('sidebar-logout-btn').onclick = async () => {
        await apiRequest('GET', '/api/auth/logout');
        clearApiCache();
        LoginEvent.notify({ authenticated: false });
        switchView('/home');
    };
}

/**
 * Toggles the active tab section and sidebar highlighting.
 * 
 * @param {string} tabName 
 */
function setActiveTab(tabName) {
    if (!['overview', 'balance', 'settings'].includes(tabName)) tabName = 'overview';

    document.querySelectorAll('.nav-item').forEach(b => {
        if (b.dataset.tab === tabName) b.classList.add('active');
        else b.classList.remove('active');
    });

    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.remove('active'));
    const tabId = `tab-${tabName}`;
    const section = document.getElementById(tabId);
    if (section) section.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    bindEvents();

    // Subscribe to external refresh triggers
    LoginEvent.subscribe(() => updateDashboard());
    LegalEvent.subscribe(() => updateDashboard());
    BalanceChangedEvent.subscribe(() => updateDashboard());

    // Router hook
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/profile') {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab') || 'overview';
            setActiveTab(tab);
            updateDashboard();
        }
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
export { FirstNameChangedEvent };