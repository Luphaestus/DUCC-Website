import { LoginEvent } from './login.js';
import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { LegalEvent } from './legal.js';
import { notify } from '/js/components/notification.js';
import { FirstNameChangedEvent } from '/js/components/navbar.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { requireAuth } from '/js/utils/auth.js';
import { BalanceChangedEvent } from '/js/utils/globals.js';
import { switchView } from '/js/utils/view.js';
import { showConfirmModal, showPasswordModal, showChangePasswordModal } from '/js/utils/modal.js';
import { CHECK_SVG, CLOSE_SVG, CHECK_INDETERMINATE_SMALL_SVG, SOCIAL_LEADERBOARD_SVG, ID_CARD_SVG, AR_ON_YOU_SVG, TRIP_SVG, BRIGHTNESS_ALERT_SVG, POOL_SVG } from '../../images/icons/outline/icons.js';

/**
 * Profile view management.
 * @module Profile
 */

addRoute('/profile', 'profile');

// --- Constants ---
const STATUS_SUCCESS = 'status-success';
const STATUS_WARNING = 'status-warning';
const STATUS_ERROR = 'status-error';
const STATUS_INFO = 'status-info';

/**
 * Main profile view template.
 */
const HTML_TEMPLATE = /*html*/`
<div id="profile-view" class="view hidden">
    <div class="small-container">
        <h1>My Profile</h1>
        <div class="form-info" id="profile-info">
            <article class="form-box profile-card">
                <header>
                    ${ID_CARD_SVG}
                    <h3>Club Membership</h3>
                </header>
                <form>
                    <div id="profile-membership" class="sub-container status-container modern-status-grid">
                        <div id="membership-info-status" class="status-card"></div>
                        <div id="legal-form-status" class="status-card"></div>
                        <div id="debt-status" class="status-card"></div>
                    </div>
                    <div id="instructor-status" class="status-card full-width-status"></div>
                </form>
            </article>

            <article class="form-box profile-card">
                <header>
                    ${AR_ON_YOU_SVG}
                    <h3>Your Stats</h3>
                </header>
                <div class="sub-container status-container status-info" id="swim-stats-container">
                    <div id="recognition-stats-info" class="stats-grid"></div>
                    <div class="action-wrapper center-action">
                        <button class="primary" data-nav="/swims">View Detailed Swims</button>
                    </div>
                </div>
                <div id="profile-tags-container" class="tags-container">
                    <p>Loading tags...</p>
                </div>
            </article>

            <article class="form-box profile-card">
                <header>
                    ${TRIP_SVG}
                    <h3>Trip Information</h3>
                </header>
                <p class="form-description">Emergency contact and first aid details for club trips.</p>
                <form class="modern-form">
                    <div class="grid-2-col">
                        <label for="profile-contact-number">Contact Number
                            <input type="tel" id="profile-contact-number" placeholder="e.g., 07700 900333">
                        </label>
                        <label for="profile-first-aid-expires">First Aid Expiry
                            <input type="date" id="profile-first-aid-expires">
                        </label>
                    </div>
                    <div id="profile-aid-buttons" class="form-actions">
                        <button type="submit" id="profile-aid-submit-button">Save Details</button>
                        <button type="button" id="profile-aid-remove-button" class="secondary">Clear Details</button>
                    </div>
                </form>
            </article>

            <article class="form-box profile-card danger-zone">
                <header>
                    ${BRIGHTNESS_ALERT_SVG}
                    <h3>Account Actions</h3>
                </header>
                <div class="danger-zone-actions">
                    <button id="profile-logout-button" class="outline">Logout</button>
                    <button id="profile-change-password-button" class="outline">Change Password</button>
                    <button id="profile-delete-account-button" class="delete outline">Delete Account</button>
                    <button id="admin-panel-button" class="secondary hidden">Admin Dashboard</button>
                </div>
            </article>
        </div>
    </div>
</div>`;

// --- State ---
let notification = null;
let validationMessages = {};

// --- Helper Functions ---

/**
 * Get current academic year (e.g. 2025/2026).
 * @returns {string}
 */
function getAcademicYear() {
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const startYear = month < 9 ? year - 1 : year;
    return `${startYear}/${startYear + 1}`;
}

/**
 * Show persistent notification.
 */
function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

/**
 * Update status UI with icon and color class.
 * Splits content into Title (main text) and Description/Action.
 */
function updateStatusUI(elementId, title, content, statusClass, baseClass = 'status-card') {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.className = baseClass;
    if (statusClass) el.classList.add(statusClass);

    el.innerHTML = `
        <div class="status-header">
            <span class="status-indicator"></span>
            <span class="status-title">${title}</span>
        </div>
        <div class="status-body">
            <div class="status-description">${content}</div>
        </div>
    `;
}

function displayValidationMessage(inputElement, message) {
    let messageId = `validation-message-${inputElement.id}`;
    let existingMessage = document.getElementById(messageId);
    if (!existingMessage) {
        existingMessage = document.createElement('p');
        existingMessage.id = messageId;
        existingMessage.classList.add('validation-message');
        inputElement.parentNode.insertBefore(existingMessage, inputElement.nextSibling);
    }
    existingMessage.textContent = message;
    existingMessage.classList.add('error-text');
    validationMessages[inputElement.id] = existingMessage;
    inputElement.ariaInvalid = 'true';
}

function clearInputError(inputElement) {
    if (validationMessages[inputElement.id]) {
        validationMessages[inputElement.id].remove();
        delete validationMessages[inputElement.id];
    }
    inputElement.removeAttribute('aria-invalid');
}

// --- Render Functions ---

/**
 * Determine parent container color based on children status.
 */
function updateMembershipContainerColor(statuses) {
    // Only used for visual hints if needed, logic moved to individual cards
}

/**
 * Render membership, legal, and balance status.
 */
function renderEventStatus(profile) {
    const academicYear = getAcademicYear();
    const balance = Number(profile.balance);
    const isLegalComplete = !!profile.filled_legal_info;

    ajaxGet('/api/globals/MembershipCost,MinMoney').then(globals => {
        const membershipCost = globals.res?.MembershipCost || 50;
        const minMoney = globals.res?.MinMoney || -20;
        const hasDebt = balance < minMoney;
        const closeToLimit = !hasDebt && balance < (minMoney + 5);

        // Membership Content
        if (profile.is_member) {
            let title = "Membership Active";
            let statusClass = STATUS_SUCCESS;
            let desc = `Valid for ${academicYear}.`;

            if (hasDebt) {
                title = "Membership Restricted";
                statusClass = STATUS_ERROR;
                desc = "Debt prevents event signups.";
            } else if (closeToLimit) {
                statusClass = STATUS_WARNING;
                desc += " <br><strong>Warning:</strong> Near debt limit.";
            }

            updateStatusUI(
                "membership-info-status",
                title,
                desc,
                statusClass
            );
        } else {
            let statusClass = STATUS_ERROR;
            if (profile.free_sessions > 0) {
                const desc = `${profile.free_sessions} free session${profile.free_sessions > 1 ? 's' : ''} left.
                             <div class="action-wrapper"><button id="become-member-button" class="small-btn">Join Now</button></div>`;
                updateStatusUI(
                    "membership-info-status",
                    "Trial Active",
                    desc,
                    STATUS_WARNING
                );
            } else {
                const desc = `Membership required.
                             ${hasDebt ? '<br><strong>Outstanding Debt.</strong>' : ''}
                             <div class="action-wrapper"><button id="become-member-button" class="small-btn primary">Join Now</button></div>`;
                updateStatusUI(
                    "membership-info-status",
                    "Inactive",
                    desc,
                    statusClass
                );
            }
        }

        // Legal Status
        const legalStatusClass = isLegalComplete ? STATUS_SUCCESS : STATUS_ERROR;
        const legalTitle = isLegalComplete ? 'Legal Info' : 'Incomplete Legal Info';
        const legalDesc = isLegalComplete
            ? `Up to date. <div class="action-wrapper"><button class="small-btn secondary" data-nav="/legal">Edit</button></div>`
            : `Required for insurance. <div class="action-wrapper"><button class="small-btn primary" data-nav="/legal">Complete</button></div>`;

        updateStatusUI(
            'legal-form-status',
            legalTitle,
            legalDesc,
            legalStatusClass
        );

        // Debt Status
        const debtStatusClass = hasDebt ? STATUS_ERROR : STATUS_SUCCESS;
        const debtTitle = `Balance: £${balance.toFixed(2)}`;

        const debtDesc = hasDebt
            ? `Please clear debt. <div class="action-wrapper"><button class="small-btn delete" data-nav="/transactions">Pay</button></div>`
            : `Account healthy. <div class="action-wrapper"><button class="small-btn secondary" data-nav="/transactions">History</button></div>`;

        updateStatusUI(
            'debt-status',
            debtTitle,
            debtDesc,
            debtStatusClass
        );

        // Bind Membership Button
        document.getElementById('become-member-button')?.addEventListener('click', async (event) => {
            event.preventDefault();
            const confirmed = await showConfirmModal(
                "Confirm Membership",
                `Annual membership costs <strong>£${membershipCost.toFixed(2)}</strong>. This will be added to your account balance. <br><br> <strong>Important:</strong> If this causes your debt to exceed £${Math.abs(minMoney).toFixed(2)}, you will be unable to sign up for new events until the balance is cleared.`
            );

            if (confirmed) {
                await ajaxPost('/api/user/join');
                BalanceChangedEvent.notify();
                updateProfilePage();
            }
        });
    });
}

/**
 * Render instructor status and controls.
 */
function renderInstructorStatus(profile) {
    const isInstructor = profile.is_instructor;

    const title = "Instructor Status";
    const desc = isInstructor
        ? `Active Instructor. <div class="action-wrapper"><button id="instructor-leave-btn" class="small-btn secondary" type="button">Resign</button></div>`
        : `Not an instructor. <div class="action-wrapper"><button id="instructor-signup-btn" class="small-btn secondary" type="button">Apply</button></div>`;

    updateStatusUI(
        'instructor-status',
        title,
        desc,
        isInstructor ? STATUS_SUCCESS : STATUS_INFO,
        'status-card full-width-status'
    );

    document.getElementById('instructor-signup-btn')?.addEventListener('click', async () => {
        await ajaxPost('/api/user/elements', { is_instructor: true });
        updateProfilePage();
    });

    document.getElementById('instructor-leave-btn')?.addEventListener('click', async () => {
        await ajaxPost('/api/user/elements', { is_instructor: false });
        updateProfilePage();
    });
}

/**
 * Render first aid and contact info.
 */
function renderAidDetails(profile) {
    const contactNumberInput = document.getElementById('profile-contact-number');
    const firstAidExpiryInput = document.getElementById('profile-first-aid-expires');
    const removeAidButton = document.getElementById('profile-aid-remove-button');

    if (contactNumberInput) contactNumberInput.value = profile.phone_number || '';
    if (firstAidExpiryInput) firstAidExpiryInput.value = profile.first_aid_expiry || '';

    if (removeAidButton) {
        if (!profile.first_aid_expiry) {
            removeAidButton.classList.add('hidden');
        } else {
            removeAidButton.classList.remove('hidden');
        }
    }
}

/**
 * Initialize static event listeners.
 */
async function bindStaticEvents() {
    const contactNumberInput = document.getElementById('profile-contact-number');
    const firstAidExpiryInput = document.getElementById('profile-first-aid-expires');
    const aidSubmitButton = document.getElementById('profile-aid-submit-button');
    const removeAidButton = document.getElementById('profile-aid-remove-button');

    function updateAidSubmitButtonState() {
        // Optional: enable/disable logic
    }

    [contactNumberInput, firstAidExpiryInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                updateAidSubmitButtonState();
                clearInputError(input);
            });
        }
    });

    if (aidSubmitButton) {
        aidSubmitButton.addEventListener('click', async (event) => {
            event.preventDefault();
            
            const updateData = {};
            if (contactNumberInput.value.trim() !== '') updateData.phone_number = contactNumberInput.value.trim();
            if (firstAidExpiryInput.value.trim() !== '') updateData.first_aid_expiry = firstAidExpiryInput.value.trim();

            try {
                await ajaxPost('/api/user/elements', updateData);
                displayNotification('Success', "Details updated.", 'success');
                updateProfilePage();
            } catch (error) {
                const msg = error.message || error;
                if (msg.includes('phone')) displayValidationMessage(contactNumberInput, msg);
                else displayNotification('Error', msg, 'error');
            }
        });
    }

    if (removeAidButton) {
        removeAidButton.addEventListener('click', async (event) => {
            event.preventDefault();
            await ajaxPost('/api/user/elements', { first_aid_expiry: null });
            displayNotification('Success', "Details removed.", 'success');
            updateProfilePage();
        });
    }

    const logoutBtn = document.getElementById('profile-logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            await ajaxGet('/api/auth/logout');
            LoginEvent.notify({ authenticated: false });
            switchView('/home');
        });
    }

    const changePassBtn = document.getElementById('profile-change-password-button');
    if (changePassBtn) {
        changePassBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            const passwords = await showChangePasswordModal();
            if (!passwords) return;

            try {
                await ajaxPost('/api/auth/change-password', passwords);
                displayNotification('Success', 'Password changed successfully.', 'success');
            } catch (error) {
                const msg = error.message || "Failed to change password.";
                displayNotification('Failed', msg, 'error');
            }
        });
    }

    const deleteBtn = document.getElementById('profile-delete-account-button');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            const password = await showPasswordModal("Delete Account", "This action cannot be undone. Please enter your password to confirm.");
            if (!password) return;

            try {
                await ajaxPost('/api/user/deleteAccount', { password });
                LoginEvent.notify({ authenticated: false });
                switchView('/home');
            } catch (error) {
                const msg = error.message || "Could not delete account. Check your password.";
                displayNotification('Failed', msg, 'error');
            }
        });
    }

    const admin = document.getElementById('admin-panel-button');
    if (admin) {
        const userData = await ajaxGet('/api/user/elements/permissions').catch(() => null);
        const perms = userData ? userData.permissions || [] : [];
        if (perms.length > 0) {
            admin.classList.remove('hidden');
        }
        admin.addEventListener('click', (e) => { e.preventDefault(); switchView('/admin/'); });
    }
}

/**
 * Refresh profile data and UI.
 */
async function updateProfilePage() {
    if (!await requireAuth()) return;
    try {
        const profile = await ajaxGet('/api/user/elements/email,first_name,last_name,is_member,is_instructor,filled_legal_info,phone_number,first_aid_expiry,free_sessions,balance,swims,swimmer_rank');
        if (profile) {
            renderEventStatus(profile);
            renderInstructorStatus(profile);
            renderAidDetails(profile);
            renderRecognition(profile);
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Render swim stats and tags.
 */
async function renderRecognition(profile) {
    const info = document.getElementById('recognition-stats-info');
    const tagsContainer = document.getElementById('profile-tags-container');

    if (info) {
        const stats = profile.swimmer_stats || { allTime: { swims: 0, rank: '-' }, yearly: { swims: 0, rank: '-' } };

        function getOrdinal(n) {
            if (n === undefined || n === null || n === '-' || n < 1) return '-';
            const s = ["th", "st", "nd", "rd"],
                v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        }

        info.innerHTML = `
            <div class="stat-box">
                <span class="stat-value">${stats.yearly.swims}</span>
                <span class="stat-label">Yearly Swims</span>
                <span class="stat-rank">Rank: ${getOrdinal(stats.yearly.rank)}</span>
            </div>
            <div class="stat-box">
                <span class="stat-value">${stats.allTime.swims}</span>
                <span class="stat-label">All-time Swims</span>
                <span class="stat-rank">Rank: ${getOrdinal(stats.allTime.rank)}</span>
            </div>
        `;
    }

    if (tagsContainer) {
        try {
            const tags = await ajaxGet(`/api/user/tags`);
            if (tags && tags.length > 0) {
                tagsContainer.innerHTML = tags.map(tag =>
                    `<span class="tag-badge" style="background-color: ${tag.color}; box-shadow: 0 2px 5px ${tag.color}40;">${tag.name}</span>`
                ).join('');
            } else {
                tagsContainer.innerHTML = '<p class="no-tags">No tags assigned.</p>';
            }
        } catch (e) {
            tagsContainer.innerHTML = '<p class="error-text">Failed to load tags.</p>';
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    bindStaticEvents();
    LoginEvent.subscribe(() => updateProfilePage());
    LegalEvent.subscribe(() => updateProfilePage());
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/profile') updateProfilePage();
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);
export { FirstNameChangedEvent };