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
import { ViewChangedEvent, addRoute, switchView } from '/js/utils/view.js';
import { requireAuth } from '/js/utils/auth.js';
import { getOrdinal, setupNumberInput } from '/js/utils/utils.js';
import { BalanceChangedEvent, MembershipChangedEvent } from '/js/utils/events/events.js';
import { showConfirmModal, showPasswordModal, showChangePasswordModal } from '/js/utils/modal.js';
import { Modal } from '/js/widgets/Modal.js';
import { Sidebar, initSidebar } from '../widgets/sidebar.js';
import { Panel } from '../widgets/panel.js';
import { StatusIndicator } from '../widgets/status.js';
import { AccentPanel } from '../widgets/accent_panel.js';
import { ValueHeader, updateValueDisplay } from '../widgets/value_header.js';
import { ItemList, StandardListItem } from '../widgets/item_list.js';
import { Tag } from '../widgets/Tag.js';
import { UploadWidget } from '../widgets/upload/UploadWidget.js';
import { renderAvatar } from '/js/utils/avatar.js';
import {
    SETTINGS_SVG, CLOSE_SVG, SOCIAL_LEADERBOARD_SVG, ID_CARD_SVG, BRIGHTNESS_ALERT_SVG, POOL_SVG, DASHBOARD_SVG, WALLET_SVG,
    LOGOUT_SVG, EDIT_SVG, GROUP_SVG, CONTRACT_SVG, MEDICAL_INFORMATION_SVG, SAVE_SVG, BOLT_SVG, ADD_SVG, REMOVE_SVG, KEY_SVG,
    CONTENT_COPY_SVG, UPLOAD_SVG
} from '/images/icons/outline/icons.js';

// Register routes
addRoute('/profile', 'profile');
addRoute('/transactions', 'profile');

const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: DASHBOARD_SVG, active: true },
    { id: 'cars', label: 'Cars', icon: GROUP_SVG },
    { id: 'balance', label: 'Balance & History', icon: WALLET_SVG },
    { id: 'settings', label: 'Account Settings', icon: SETTINGS_SVG },
    { label: 'Sign Out', icon: LOGOUT_SVG, actionId: 'sidebar-logout-btn', classes: 'logout' }
];

/** HTML Template for the dashboard */
const HTML_TEMPLATE = /*html*/`
    <div id="profile-view" class="view hidden">
        <div class="dashboard-container">
            ${Sidebar(sidebarItems)}

            <!-- Main Content Area -->
            <main class="dashboard-content">
        
                <!-- Overview Tab -->
                <section id="tab-overview" class="dashboard-section active">
                    ${Panel({
                        title: 'Profile Picture',
                        icon: ID_CARD_SVG,
                        content: `
                            <div class="profile-avatar-row">
                                <div id="profile-picture-container" class="profile-picture-container" title="Change Profile Picture">
                                    <div class="profile-picture-large" id="profile-img-wrapper">
                                        <img id="profile-img-display" src="/images/misc/ducc.png" alt="Profile Picture">
                                    </div>
                                    <div class="avatar-overlay">${UPLOAD_SVG}</div>
                                </div>
                                <div class="profile-avatar-controls">
                                    <div id="avatar-upload-container"></div>
                                    <div class="avatar-presets no-margin no-padding">
                                        <h4 class="small-title">Color Presets</h4>
                                        <div id="color-presets" class="presets-grid"></div>

                                        <h4 class="small-title mt-4">Initials</h4>
                                        <div id="initials-presets" class="presets-grid"></div>

                                        <h4 class="small-title mt-4">Fonts</h4>
                                        <div id="font-presets" class="presets-grid"></div>
                                    </div>
                                </div>
                            </div>
                        `
                    })}

                    <div id="membership-banner-container"></div>

                    ${Panel({
                        title: 'Swimming Stats',
                        icon: POOL_SVG,
                        action: `<button class="small-btn secondary" data-nav="/swims">${SOCIAL_LEADERBOARD_SVG} View Leaderboard</button>`,
                        content: `<div id="swim-stats-grid" class="stats-grid"><p>Loading stats...</p></div>`
                    })}

                    <!-- Legal & Safety Row -->
                    <div class="dual-grid">
                        ${Panel({
                            title: 'Legal Waiver',
                            icon: CONTRACT_SVG,
                            action: `<button class="small-btn secondary" data-nav="/legal">${EDIT_SVG} Update</button>`,
                            content: `<div id="legal-status-content"><p>Loading...</p></div>`
                        })}

                        ${Panel({
                            title: 'Safety Info',
                            icon: MEDICAL_INFORMATION_SVG,
                            action: `<button id="edit-safety-btn" class="small-btn secondary">${EDIT_SVG} Edit</button>`,
                            content: `
                                <div id="safety-info-display">
                                    <div class="info-rows">
                                        <div class="info-row"><span>First Aid Expiry</span><span id="display-first-aid">Not Set</span></div>
                                        <div class="info-row"><span>Emergency Contact</span><span id="display-emergency">Not Set</span></div>
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
                            `
                        })}
                    </div>

                    ${Panel({
                        id: 'groups-teams-panel',
                        title: 'Groups & Teams',
                        icon: GROUP_SVG,
                        content: `<div id="tags-list-container" class="tags-list"><p>Loading tags...</p></div>`
                    })}

                    ${Panel({
                        content: `
                            <div class="role-toggle">
                                <div class="role-info">
                                    <h4>${BOLT_SVG} Instructor Status</h4>
                                    <p id="instructor-status-text">Not an instructor</p>
                                </div>
                                <button id="toggle-instructor-btn" class="small-btn secondary">Apply</button>
                            </div>
                        `
                    })}
                </section>

                <section id="tab-cars" class="dashboard-section">
                    ${Panel({
                        title: 'My Vehicles',
                        icon: GROUP_SVG,
                        action: `<button id="add-car-btn" class="small-btn primary">${ADD_SVG} Add Car</button>`,
                        content: `<div id="cars-list-container" class="item-list"></div>`
                    })}
                </section>

                <section id="tab-balance" class="dashboard-section">
                    <!-- Balance Overview -->
                    ${ValueHeader({
                        title: 'Current Balance',
                        value: '£0.00',
                        valueId: 'balance-amount',
                        actions: `<button id="top-up-btn" class="small-btn">Top Up</button>`
                    })}

                    ${Panel({
                        title: 'Transaction History',
                        content: `<div id="transactions-list-container"></div>`
                    })}
                </section>

                <section id="tab-settings" class="dashboard-section">
                    <div class="settings-grid">
                        ${Panel({
                            title: 'Password',
                            icon: ID_CARD_SVG,
                            content: `<button id="change-password-btn" class="outline">Change Password</button>`
                        })}

                        ${Panel({
                            title: 'Two-Factor Authentication',
                            icon: KEY_SVG,
                            content: `
                                <div class="two-fa-grid dual-grid">
                                    <div class="glass-panel embedded-panel">
                                        <div class="setting-info">
                                            <strong>Authenticator (TOTP)</strong>
                                            <p id="totp-status" class="status-tag warning no-margin">Disabled</p>
                                        </div>
                                        <button id="manage-totp-btn" class="small-btn secondary">Setup</button>
                                    </div>
                                    <div class="glass-panel embedded-panel">
                                        <div class="setting-info">
                                            <strong>Passkey</strong>
                                            <p id="passkey-count">0 keys registered</p>
                                        </div>
                                        <button id="manage-passkeys-btn" class="small-btn secondary">Manage</button>
                                    </div>
                                </div>
                            `
                        })}

                        ${Panel({
                            title: 'Danger Zone',
                            icon: BRIGHTNESS_ALERT_SVG,
                            classes: 'danger-zone',
                            content: `<button id="delete-account-btn" class="delete outline">Delete Account</button>`
                        })}
                    </div>
                </section>
            </main>
        </div>
    </div>`;

let currentUser = null;
let sidebarController = null;

// --- Helper Functions ---

function showStatus(title, message, type) {
    notify(title, message, type, 3000, 'profile-status');
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
        container.innerHTML = AccentPanel({
            title: "You aren't a member yet",
            text: `You have <strong>${freeSessions}</strong> free trial event${freeSessions !== 1 ? 's' : ''} remaining before membership is required.`,
            buttonText: "Become a Member",
            buttonId: "join-membership-btn"
        });

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
                    BalanceChangedEvent.notify();
                    MembershipChangedEvent.notify();
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
 * Renders the user's profile picture with initials fallback.
 * 
 * @param {object} profile 
 */
function renderProfilePicture(profile) {
    const wrapper = document.getElementById('profile-img-wrapper');
    if (!wrapper) return;

    wrapper.outerHTML = renderAvatar(profile, { classes: 'large', dataAttributes: 'id="profile-img-wrapper"' });
    renderAvatarControls(profile);
}

/**
 * Renders the inline avatar controls.
 * @param {object} profile 
 */
function renderAvatarControls(profile) {
    const colorGrid = document.getElementById('color-presets');
    const initialsGrid = document.getElementById('initials-presets');
    const fontGrid = document.getElementById('font-presets');
    if (!colorGrid || !initialsGrid || !fontGrid) return;

    const colors = [
        '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', 
        '#e74c3c', '#1abc9c', '#34495e', '#d35400', '#c0392b'
    ];
    
    const firstInitial = profile.first_name ? profile.first_name[0] : '';
    const lastInitial = profile.last_name ? profile.last_name[0] : '';
    const bothInitials = `${firstInitial}${lastInitial}` || '?';
    
    const initialsOptions = [
        { label: 'Both', value: 'both', text: bothInitials },
        { label: 'First', value: 'first', text: firstInitial },
        { label: 'Last', value: 'last', text: lastInitial }
    ];

    const fonts = [
        { label: 'Sans', value: 'sans' },
        { label: 'Display', value: 'outfit' },
        { label: 'Serif', value: 'serif' },
        { label: 'Gothic', value: 'gothic' },
        { label: 'Retro', value: 'accent' },
        { label: 'Mono', value: 'mono' }
    ];

    colorGrid.innerHTML = colors.map(color => `
        <div class="preset-item color-preset ${profile.profile_picture_color === color ? 'active' : ''}" 
             style="background-color: ${color};" data-color="${color}">
            ${bothInitials}
        </div>
    `).join('');

    initialsGrid.innerHTML = initialsOptions.map(opt => `
        <div class="preset-item initials-preset ${profile.profile_picture_initials === opt.value ? 'active' : ''}" 
             style="background-color: var(--pico-primary);" data-initials="${opt.value}">
            ${opt.text}
        </div>
    `).join('');

    fontGrid.innerHTML = fonts.map(f => `
        <div class="preset-item font-preset font-preset-${f.value} ${profile.profile_picture_font === f.value ? 'active' : ''}" 
             style="background-color: var(--pico-primary);" data-font="${f.value}">
            ${bothInitials}
        </div>
    `).join('');

    // Re-bind events for the newly rendered presets
    const updatePreset = async (data) => {
        try {
            await apiRequest('POST', '/api/user/profile-picture', { 
                fileId: null, 
                color: profile.profile_picture_color,
                font: profile.profile_picture_font,
                initials: profile.profile_picture_initials,
                ...data 
            });
            updateDashboard();
        } catch (err) {
            notify('Error', err.message, 'error');
        }
    };

    colorGrid.querySelectorAll('.color-preset').forEach(item => {
        item.onclick = () => updatePreset({ color: item.dataset.color });
    });

    initialsGrid.querySelectorAll('.initials-preset').forEach(item => {
        item.onclick = () => updatePreset({ initials: item.dataset.initials });
    });

    fontGrid.querySelectorAll('.font-preset').forEach(item => {
        item.onclick = () => updatePreset({ font: item.dataset.font });
    });
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

    container.innerHTML = StatusIndicator({
        active: isComplete,
        activeText: 'Active',
        inactiveText: 'Action Required',
        content: `
            <p>${isComplete ? 'Your legal waiver is up to date.' : 'You must complete the legal waiver to participate in events.'}</p>
            ${isComplete && lastFilled ? `<p class="last-filled">Last filled out: ${lastFilled}</p>` : ''}
        `
    });
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
        container.innerHTML = Tag.renderList(tags);
    } else {
        const panel = document.getElementById('groups-teams-panel');
        if (panel) panel.classList.add('hidden');
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
 * @param {number} minMoney
 */
function renderProfileBalance(profile, minMoney) {
    const bal = Number(profile.balance);

    let valueClass = 'balance-warning';
    if (bal < minMoney) valueClass = 'balance-negative';
    else if (bal >= 0) valueClass = 'balance-positive';

    updateValueDisplay('balance-amount', `£${bal.toFixed(2)}`, valueClass);
}

/**
 * Fetches and renders the user's cars.
 */
async function renderCars() {
    const container = document.getElementById('cars-list-container');
    if (!container) return;

    try {
        const res = await apiRequest('GET', '/api/cars');
        const cars = res.data || [];

        container.innerHTML = ItemList(cars, (car) => {
            const isOwner = car.user_id === currentUser?.id;
            const canManageGlobal = currentUser?.permissions?.includes('car.manage_global');
            const canEdit = isOwner || canManageGlobal;

            return StandardListItem({
                icon: GROUP_SVG,
                title: car.name,
                subtitle: `${car.seats} Seats • ${car.boats} Boats${car.is_global ? ' • <span class="badge primary">Global</span>' : ''}`,
                action: `
                    <div class="button-group mini">
                        ${canEdit ? `
                            <button class="small-btn icon-only secondary" data-edit-car="${car.id}" title="Edit Car">
                                ${EDIT_SVG}
                            </button>
                            <button class="small-btn icon-only delete" data-delete-car="${car.id}" title="Remove Car">
                                ${CLOSE_SVG}
                            </button>
                        ` : ''}
                    </div>
                `
            });
        });

        // Bind listeners
        container.querySelectorAll('[data-edit-car]').forEach(btn => {
            btn.onclick = () => {
                const car = cars.find(c => c.id == btn.dataset.editCar);
                if (car) openCarModal(car);
            };
        });

        container.querySelectorAll('[data-delete-car]').forEach(btn => {
            btn.onclick = async () => {
                if (await showConfirmModal('Remove Car?', 'Are you sure you want to remove this vehicle?')) {
                    try {
                        await apiRequest('DELETE', `/api/cars/${btn.dataset.deleteCar}`);
                        notify('Success', 'Car removed.', 'success');
                        renderCars();
                    } catch (err) {
                        notify('Error', err.message, 'error');
                    }
                }
            };
        });

    } catch (e) {
        container.innerHTML = '<p class="error-text">Failed to load cars.</p>';
    }
}

/**
 * Opens a modal to add or edit a car.
 */
function openCarModal(car = null) {
    const isEdit = !!car;
    const canManageGlobal = currentUser?.permissions?.includes('car.manage_global');
    
    const modalContent = /*html*/`
        <form id="car-form" class="modern-form">
            <label>Car Name <input type="text" id="car-name" value="${isEdit ? car.name : ''}" placeholder="e.g. Blue VW Polo" required></label>
            <div class="grid-2-col">
                <label>Seats <input type="number" id="car-seats" min="1" max="9" value="${isEdit ? car.seats : 5}" required></label>
                <label>Boats <input type="number" id="car-boats" min="0" max="9" value="${isEdit ? car.boats : 0}" required></label>
            </div>
            ${canManageGlobal ? `<label class="checkbox-label"><input type="checkbox" id="car-is-global" ${isEdit && car.is_global ? 'checked' : ''}> Global (available for anyone to use)</label>` : ''}
            <div class="form-actions">
                <button type="submit" class="primary full-width">${isEdit ? 'Update Vehicle' : 'Add Vehicle'}</button>
            </div>
        </form>
    `;

    const modal = new Modal({
        id: 'car-modal',
        title: isEdit ? 'Edit Vehicle' : 'Add New Vehicle',
        content: modalContent
    });

    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners();
    modal.show();

    setupNumberInput(document.getElementById('car-seats'));
    setupNumberInput(document.getElementById('car-boats'));

    document.getElementById('car-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('car-name').value,
            seats: document.getElementById('car-seats').value,
            boats: document.getElementById('car-boats').value,
            isGlobal: document.getElementById('car-is-global')?.checked || false
        };

        try {
            if (isEdit) {
                await apiRequest('PUT', `/api/cars/${car.id}`, data);
                notify('Success', 'Vehicle updated.', 'success');
            } else {
                await apiRequest('POST', '/api/cars', data);
                notify('Success', 'Vehicle added.', 'success');
            }
            modal.close();
            renderCars();
        } catch (err) {
            notify('Error', err.message, 'error');
        }
    };
}

/**
 * Fetches and renders the user's transaction history list.
 */
async function renderProfileTransactions() {
    const container = document.getElementById('transactions-list-container');
    try {
        const res = await apiRequest('GET', '/api/user/elements/transactions');
        const txs = res.transactions || [];

        container.innerHTML = ItemList(txs, (tx) => {
            const isNegative = tx.amount < 0;
            return StandardListItem({
                icon: isNegative ? REMOVE_SVG : ADD_SVG,
                iconClass: isNegative ? 'negative' : 'positive',
                title: tx.description,
                subtitle: new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                value: `${isNegative ? '' : '+'}${tx.amount.toFixed(2)}`,
                valueClass: isNegative ? 'negative' : 'positive',
                extra: `£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}`
            });
        });
    } catch (e) {
        container.innerHTML = '<p class="error-text">Failed to load transactions.</p>';
    }
}

// --- 2FA Functions ---

async function update2FADisplay() {
    try {
        const [profile, keys] = await Promise.all([
            apiRequest('GET', '/api/user/elements/totp_enabled'),
            apiRequest('GET', '/api/auth/passkeys')
        ]);

        const totpBtn = document.getElementById('manage-totp-btn');
        const totpStatus = document.getElementById('totp-status');
        if (profile.totp_enabled) {
            totpStatus.textContent = 'Enabled';
            totpStatus.className = 'status-tag success no-margin no-padding';
            totpBtn.textContent = 'Disable';
            totpBtn.className = 'small-btn outline delete';
            totpBtn.onclick = () => disableTOTP();
        } else {
            totpStatus.textContent = 'Disabled';
            totpStatus.className = 'status-tag warning no-margin no-padding';
            totpBtn.textContent = 'Setup';
            totpBtn.className = 'small-btn secondary';
            totpBtn.onclick = () => setupTOTP();
        }

        document.getElementById('passkey-count').textContent = `${keys.length} key${keys.length !== 1 ? 's' : ''} registered`;
    } catch (err) {
        console.error('Failed to update 2FA UI', err);
    }
}

async function setupTOTP() {
    try {
        const { qrCodeData, secret } = await apiRequest('GET', '/api/auth/totp/setup');
        const modalId = 'totp-setup-modal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalContent = /*html*/`
            <div class="totp-setup-flow">
                <p>Scan this QR code with your authenticator app (like Google Authenticator or Authy).</p>
                <div class="qr-container"><img src="${qrCodeData}" alt="TOTP QR Code"></div>
                <div class="manual-secret">
                    <span>Or enter manually:</span>
                    <div class="secret-row">
                        <code id="totp-secret-code">${secret}</code>
                        <button class="copy-btn" id="copy-totp-secret" title="Copy to clipboard">
                            ${CONTENT_COPY_SVG}
                        </button>
                    </div>
                </div>
                <form id="totp-verify-form" class="modern-form">
                    <label>Verification Code <input type="text" id="totp-code" placeholder="123456" required></label>
                    <button type="submit" class="primary full-width">Verify & Enable</button>
                </form>
            </div>
        `;

        const modal = new Modal({ id: modalId, title: 'Setup TOTP', content: modalContent });
        document.body.insertAdjacentHTML('beforeend', modal.getHTML());
        modal.attachListeners();
        modal.show();

        document.getElementById('copy-totp-secret').onclick = async () => {
            try {
                await navigator.clipboard.writeText(secret);
                notify('Copied', 'Secret copied to clipboard!', 'success');
            } catch (err) {
                notify('Error', 'Failed to copy.', 'error');
            }
        };

        document.getElementById('totp-verify-form').onsubmit = async (e) => {
            e.preventDefault();
            const token = document.getElementById('totp-code').value;
            try {
                await apiRequest('POST', '/api/auth/totp/enable', { token });
                notify('Success', 'TOTP enabled!', 'success');
                modal.close();
                update2FADisplay();
            } catch (err) {
                notify('Error', err.message, 'error');
            }
        };
    } catch (err) {
        notify('Error', 'Failed to start setup.', 'error');
    }
}

async function disableTOTP() {
    if (await showConfirmModal('Disable 2FA?', 'Are you sure you want to disable your authenticator app? This will make your account less secure.')) {
        try {
            await apiRequest('POST', '/api/auth/totp/disable');
            notify('Success', 'TOTP disabled.', 'success');
            update2FADisplay();
        } catch (err) {
            notify('Error', err.message, 'error');
        }
    }
}

async function managePasskeys() {
    const modalId = 'passkey-modal';
    
    const renderList = (passkeys) => {
        const listContainer = document.getElementById('passkey-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = passkeys.map(k => StandardListItem({
            icon: KEY_SVG,
            title: `Passkey (Added ${new Date(k.created_at).toLocaleDateString()})`,
            action: `<button class="small-btn icon-only delete" onclick="window.deletePasskey('${k.id}')">${CLOSE_SVG}</button>`
        })).join('');
        
        if (passkeys.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">No passkeys registered.</p>';
        }
    };

    try {
        const keys = await apiRequest('GET', '/api/auth/passkeys');
        
        // Clean up any stale modal elements
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalContent = /*html*/`
            <div class="passkey-management">
                <div id="passkey-list" class="item-list"></div>
                <button id="add-passkey-btn" class="primary full-width">${ADD_SVG} Add Passkey</button>
            </div>
        `;

        const modal = new Modal({ id: modalId, title: 'Manage Passkeys', content: modalContent });
        document.body.insertAdjacentHTML('beforeend', modal.getHTML());
        modal.attachListeners();
        modal.show();

        // Initial render
        renderList(keys);

        window.deletePasskey = async (id) => {
            if (await showConfirmModal('Delete Passkey?', 'Are you sure you want to remove this passkey?')) {
                try {
                    await apiRequest('DELETE', `/api/auth/passkeys/${id}`);
                    const updatedKeys = await apiRequest('GET', '/api/auth/passkeys');
                    renderList(updatedKeys);
                    update2FADisplay();
                } catch (err) {
                    notify('Error', 'Failed to delete passkey.', 'error');
                }
            }
        };

        document.getElementById('add-passkey-btn').onclick = async () => {
            try {
                const options = await apiRequest('GET', '/api/auth/passkey/register-options');
                const attResp = await SimpleWebAuthnBrowser.startRegistration(options);
                await apiRequest('POST', '/api/auth/passkey/register-verify', attResp);
                notify('Success', 'Passkey registered!', 'success');
                
                const updatedKeys = await apiRequest('GET', '/api/auth/passkeys');
                renderList(updatedKeys);
                update2FADisplay();
            } catch (err) {
                notify('Error', err.message, 'error');
            }
        };
    } catch (err) {
        notify('Error', 'Failed to load passkeys.', 'error');
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
        const [profile, globals, tags, minMoneyGlobal] = await Promise.all([
            apiRequest('GET', '/api/user/elements/id,permissions,email,first_name,last_name,is_member,is_instructor,filled_legal_info,legal_filled_at,phone_number,first_aid_expiry,free_sessions,balance,swims,swimmer_rank,profile_picture_path,profile_picture_color,profile_picture_font,profile_picture_initials,totp_enabled'),
            apiRequest('GET', '/api/globals/MembershipCost'),
            apiRequest('GET', '/api/user/tags').catch(() => []),
            apiRequest('GET', '/api/globals/MinMoney').catch(() => ({ res: { MinMoney: { data: -25 } } }))
        ]);

        currentUser = profile;
        const minMoney = Number(minMoneyGlobal.res?.MinMoney?.data || -25);

        if (currentUser) {
            renderProfilePicture(profile);

            renderMembershipBanner(profile, globals.res || {});
            renderSwimStats(profile.swimmer_stats);
            renderLegalStatus(profile);
            renderSafetyInfo(profile);
            renderTags(tags);
            renderInstructor(profile);
            renderCars();
            update2FADisplay();
        }
        renderProfileBalance(profile, minMoney);
        renderProfileTransactions();

    } catch (error) {
        console.error("Dashboard update failed", error);
        showStatus('Error', 'Failed to load profile data.', 'error');
    }
}

// --- Event Listeners ---

let uploadWidget = null;

/**
 * Binds static UI element listeners.
 */
function bindEvents() {
    // Sidebar Navigation Logic
    sidebarController = initSidebar('overview');

    // Profile Picture Logic
    if (document.getElementById('avatar-upload-container') && !uploadWidget) {
        uploadWidget = new UploadWidget('avatar-upload-container', {
            mode: 'inline',
            enableLibrary: false,
            enableUrl: false,
            showActions: false,
            showPreview: false,
            enableCrop: true,
            onImageSelect: async ({ id }) => {
                try {
                    await apiRequest('POST', '/api/user/profile-picture', { fileId: id });
                    notify('Success', 'Profile picture updated.', 'success');
                    updateDashboard();
                } catch (err) {
                    notify('Error', err.message, 'error');
                }
            }
        });

        // Use delegation on main for better reliability
        document.querySelector('main').addEventListener('click', (e) => {
            const container = e.target.closest('#profile-picture-container');
            if (container) {
                if (uploadWidget && uploadWidget.inputEl) {
                    uploadWidget.inputEl.click();
                } else {
                    console.error('UploadWidget input element not found');
                }
            }
        });
    }

    // 2FA Management
    document.getElementById('manage-passkeys-btn').onclick = () => managePasskeys();

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

    // Add Car Modal Logic
    const addCarBtn = document.getElementById('add-car-btn');
    if (addCarBtn) {
        addCarBtn.onclick = () => openCarModal();
    }

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
    const topUpBtn = document.getElementById('top-up-btn');
    if (topUpBtn) {
        topUpBtn.onclick = () => {
            const reference = currentUser.first_name.charAt(0).toUpperCase() + currentUser.last_name.toUpperCase() + "WEBSITE";

            showConfirmModal(
                "Top Up Balance",
                `Please transfer the desired amount to:<br><br>
                <strong>Bank:</strong> Durham University<br>
                <strong>Sort Code:</strong> 20-27-66<br>
                <strong>Account:</strong> 53770109<br>
                <strong>Reference:</strong> ${reference}<br><br>
                <p>Pressing the confirm button will notify the finance team to credit your account once the transfer is verified. Please press cancel if you have not made a transfer.</p>`
            );
        };
    }

    // Account Security Listeners
    document.getElementById('change-password-btn').onclick = async () => {
        const passwords = await showChangePasswordModal();
        if (passwords) {
            try {
                await apiRequest('POST', '/api/auth/change-password', passwords);
                showStatus('Success', 'Password changed.', 'success');
            } catch (err) {
                showStatus('Error', err.message || 'Failed to change password.', 'error');
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

function initProfile() {
    const main = document.querySelector('main');
    if (!main) return;

    // Check if the template is already there
    if (!document.getElementById('profile-view')) {
        main.insertAdjacentHTML('beforeend', HTML_TEMPLATE);
        bindEvents();
    }
}

// Initial load check
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfile);
} else {
    initProfile();
}

// Subscribe to external refresh triggers
LoginEvent.subscribe(() => {
    if (!document.getElementById('profile-view')?.classList.contains('hidden')) {
        updateDashboard();
    }
});
LegalEvent.subscribe(() => {
    if (!document.getElementById('profile-view')?.classList.contains('hidden')) {
        updateDashboard();
    }
});
BalanceChangedEvent.subscribe(() => {
    if (!document.getElementById('profile-view')?.classList.contains('hidden')) {
        updateDashboard();
    }
});

// Router hook
ViewChangedEvent.subscribe(({ resolvedPath }) => {
    if (resolvedPath === '/profile' || resolvedPath === '/transactions') {
        initProfile();
        const params = new URLSearchParams(window.location.search);
        let tab = params.get('tab') || 'overview';
        const validTabs = ['overview', 'cars', 'balance', 'settings'];
        if (!validTabs.includes(tab)) tab = 'overview';

        if (sidebarController) sidebarController.setActive(tab);
        updateDashboard();
    }
});