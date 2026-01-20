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
        <h1>Profile</h1>
        <div class="form-info" id="profile-info">
            <article class="form-box">
                <header>
                    ${ID_CARD_SVG}
                    <h3>Club Membership</h3>
                </header>
                <form>
                    <div id="profile-membership" class="sub-container status-container">
                        <div id="membership-info-status" class="status-container"></div>
                        <div id="legal-form-status" class="status-container"></div>
                        <div id="debt-status" class="status-container"></div>
                    </div>
                    <div id="instructor-status" class="status-item"></div>
                </form>
            </article>

            <article class="form-box">
                <header>
                    ${AR_ON_YOU_SVG}
                    <h3>Your Info</h3>
                </header>
                <div class="sub-container status-container status-info" id="swim-stats-container">
                    <div id="recognition-stats-info"></div>
                    <div class="action-wrapper">
                        <button class="status-btn" data-nav="/swims">View Swims</button>
                    </div>
                </div>
                <div id="profile-tags-container" class="tags-container">
                    <p>Loading tags...</p>
                </div>
            </article>

            <article class="form-box">
                <header>
                    ${TRIP_SVG}
                    <h3>Trip Form Info</h3>
                </header>
                <p class="form-description">If you are willing to be an emergency contact or first aider for a trip, please enter your details here.</p>
                <form>
                    <div>
                        <div><label for="profile-contact-number">Contact Number:</label><input type="tel" id="profile-contact-number" placeholder="e.g., 07700 900333"></div>
                        <div><label for="profile-first-aid-expires">First Aid Expires:</label><input type="date" id="profile-first-aid-expires"></div>
                    </div>
                    <div id="profile-aid-buttons">
                        <button type="submit" id="profile-aid-submit-button">Submit Aid Details</button>
                        <button type="button" id="profile-aid-remove-button" class="secondary">Remove Aid Details</button>
                    </div>
                </form>
            </article>

            <article class="form-box">
                <header>
                    ${BRIGHTNESS_ALERT_SVG}
                    <h3>Danger Zone</h3>
                </header>
                <div class="danger-zone-actions">
                    <button id="profile-logout-button">Logout</button>
                    <button id="profile-change-password-button" class="secondary">Change Password</button>
                    <button id="profile-delete-account-button" class="secondary">Delete Account</button>
                    <button id="admin-panel-button" class="secondary hidden">Go to Admin Panel</button>
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
function updateStatusUI(elementId, title, content, statusClass, baseClass = 'status-item') {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.className = baseClass;
    console.log(statusClass);
    if (statusClass) el.classList.add(statusClass);

    el.innerHTML = `
        <div class="status-header">
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
    const container = document.getElementById('profile-membership');
    if (!container) return;

    // Remove existing status classes
    container.classList.remove(STATUS_SUCCESS, STATUS_WARNING, STATUS_ERROR, STATUS_INFO);

    // Hierarchy: Error > Warning > Success
    if (statuses.includes(STATUS_ERROR)) {
        container.classList.add(STATUS_ERROR);
    } else if (statuses.includes(STATUS_WARNING)) {
        container.classList.add(STATUS_WARNING);
    } else {
        container.classList.add(STATUS_SUCCESS);
    }
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

        const currentStatuses = [];

        let memberStatusClass = STATUS_SUCCESS;

        if (hasDebt) {
            memberStatusClass = STATUS_ERROR;
        } else if (closeToLimit) {
            memberStatusClass = STATUS_WARNING;
        } else if (!profile.is_member) {
            if (profile.free_sessions > 0) {
                memberStatusClass = STATUS_WARNING;
            } else {
                memberStatusClass = STATUS_ERROR;
            }
        }
        currentStatuses.push(memberStatusClass);

        // Membership Content
        if (profile.is_member) {
            let title = "Membership Active";
            let desc = `Your membership is active for the ${academicYear} academic year.`;

            if (hasDebt) {
                title = "Membership Restricted";
                desc = "Your membership is active, but outstanding debt prevents you from joining events.";
            } else if (closeToLimit) {
                desc += " <br><strong>Warning:</strong> You are close to your debt limit.";
            }

            updateStatusUI(
                "membership-info-status",
                title,
                desc,
                memberStatusClass,
                'status-container'
            );
        } else {
            if (profile.free_sessions > 0) {
                const desc = `You have ${profile.free_sessions} free session${profile.free_sessions > 1 ? 's' : ''} remaining. Become a full member to enjoy unlimited sessions!
                             ${closeToLimit ? '<br><strong>Warning:</strong> You are close to your debt limit.' : ''}
                             <div class="action-wrapper"><button id="become-member-button" class="status-btn">Become a Member</button></div>`;
                updateStatusUI(
                    "membership-info-status",
                    "Membership Inactive",
                    desc,
                    memberStatusClass,
                    'status-container'
                );
            } else {
                const desc = `Your membership is inactive for ${academicYear}. Please become a member to continue attending sessions.
                             ${hasDebt ? '<br><strong>Outstanding debt prevents event signups.</strong>' : ''}
                             <div class="action-wrapper"><button id="become-member-button" class="status-btn">Become a Member</button></div>`;
                updateStatusUI(
                    "membership-info-status",
                    "Membership Inactive",
                    desc,
                    memberStatusClass,
                    'status-container'
                );
            }
        }

        // Legal Status
        const legalStatusClass = isLegalComplete ? STATUS_SUCCESS : STATUS_ERROR;
        currentStatuses.push(legalStatusClass);

        const legalTitle = isLegalComplete ? 'Legal Information' : 'Legal Information Incomplete';
        const legalDesc = isLegalComplete
            ? `Your medical and contact details are up to date. <div class="action-wrapper"><button class="status-btn" data-nav="/legal">Update Info</button></div>`
            : `Ensure your medical and contact details are up to date. <div class="action-wrapper"><button class="status-btn" data-nav="/legal">Complete Form</button></div>`;

        updateStatusUI(
            'legal-form-status',
            legalTitle,
            legalDesc,
            legalStatusClass,
            'status-container'
        );

        // Debt Status
        const debtStatusClass = hasDebt ? STATUS_ERROR : STATUS_SUCCESS;
        currentStatuses.push(debtStatusClass);

        const debtTitle = hasDebt
            ? `Outstanding Debt: £${balance.toFixed(2)}`
            : `Account Balance: £${balance.toFixed(2)}`;

        const debtDesc = hasDebt
            ? `You have outstanding debts. Please clear your balance. <div class="action-wrapper"><button class="status-btn" data-nav="/transactions">Pay Now</button></div>`
            : `You have no significant outstanding debts. <div class="action-wrapper"><button class="status-btn" data-nav="/transactions">Account Statement</button></div>`;

        updateStatusUI(
            'debt-status',
            debtTitle,
            debtDesc,
            debtStatusClass,
            'status-container'
        );

        // Update Parent Container Color
        updateMembershipContainerColor(currentStatuses);

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

    const title = isInstructor ? "Instructor Status" : "Instructor Status";
    const desc = isInstructor
        ? `You are an active instructor. <div class="action-wrapper"><button id="instructor-leave-btn" class="status-btn" type="button">Remove Status</button></div>`
        : `You are not currently an instructor. <div class="action-wrapper"><button id="instructor-signup-btn" class="status-btn" type="button">Become a Coach</button></div>`;

    updateStatusUI(
        'instructor-status',
        title,
        desc,
        isInstructor ? STATUS_SUCCESS : STATUS_ERROR,
        'status-item'
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

    if (contactNumberInput) contactNumberInput.placeholder = profile.phone_number || 'e.g., 07700 900333';
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
        if (aidSubmitButton) aidSubmitButton.disabled = contactNumberInput.value.trim() === '' && firstAidExpiryInput.value.trim() === '';
    }

    [contactNumberInput, firstAidExpiryInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                updateAidSubmitButtonState();
                clearInputError(input);
            });
        }
    });
    if (aidSubmitButton) updateAidSubmitButtonState();

    if (aidSubmitButton) {
        aidSubmitButton.addEventListener('click', async (event) => {
            event.preventDefault();
            if (aidSubmitButton.disabled) return;

            const updateData = {};
            if (contactNumberInput.value.trim() !== '') updateData.phone_number = contactNumberInput.value.trim();
            if (firstAidExpiryInput.value.trim() !== '') updateData.first_aid_expiry = firstAidExpiryInput.value.trim();

            try {
                await ajaxPost('/api/user/elements', updateData);
                displayNotification('Aid details updated.', "Successfully updated.", 'success');
                contactNumberInput.value = ''; firstAidExpiryInput.value = '';
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
            displayNotification('Removed.', "First aid expiry removed.", 'success');
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
            <div id="yearly-swims-status" class="status-item"></div>
            <div id="alltime-swims-status" class="status-item"></div>
        `;

        updateStatusUI(
            'yearly-swims-status',
            `Yearly Swims: ${stats.yearly.swims}`,
            `Rank: ${getOrdinal(stats.yearly.rank)}`,
            STATUS_INFO
        );

        updateStatusUI(
            'alltime-swims-status',
            `All-time Swims: ${stats.allTime.swims}`,
            `Rank: ${getOrdinal(stats.allTime.rank)}`,
            STATUS_INFO
        );
    }

    if (tagsContainer) {
        try {
            const tags = await ajaxGet(`/api/user/tags`);
            if (tags && tags.length > 0) {
                tagsContainer.innerHTML = tags.map(tag =>
                    `<span class="profile-tag" style="background-color: ${tag.color};">${tag.name}</span>`
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