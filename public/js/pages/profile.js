import { LoginEvent } from './login.js';
import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { LegalEvent } from './legal.js';
import { notify } from '/js/components/notification.js';
import { FirstNameChangedEvent } from '/js/components/navbar.js';
import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { requireAuth } from '/js/utils/auth.js';
import { BalanceChangedEvent } from '/js/utils/globals.js';
import { CHECK_SVG, CLOSE_SVG, CHECK_INDETERMINATE_SMALL_SVG, TROPHY_SVG, SOCIAL_LEADERBOARD_SVG, ID_CARD_SVG, AR_ON_YOU_SVG, TRIP_SVG, BRIGHTNESS_ALERT_SVG, POOL_SVG } from '../../images/icons/outline/icons.js';

/**
 * Profile view management.
 * @module Profile
 */

addRoute('/profile', 'profile');

// --- Constants & Templates ---

const SUCCESS_GREEN = '#2ecc71';
const WARNING_ORANGE = '#f39c12';
const ERROR_RED = '#e74c3c';
const INFO_CYAN = '#3498db';

/**
 * Main profile view template.
 */
const HTML_TEMPLATE = `
<div id="profile-view" class="view hidden">
    <div class="small-container">
        <h1>Profile</h1>
        <div class="form-info" id="profile-info">
            <article class="form-box">
                <h3>
                    ${ID_CARD_SVG}
                    Club Membership
                </h3>
                <form>
                    <div id="profile-membership" class="sub-container">
                        <div id="membership-info-status" class="status-item"></div>
                        <div id="legal-form-status" class="status-item"></div>
                        <div id="debt-status" class="status-item"></div>
                        <div id="profile-signup-status" class="status-item highlight-status" style="font-weight: bold; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);"></div>
                    </div>
                    <div id="instructor-status-container" class="sub-container">
                        <div id="instructor-status" class="status-item"></div>
                    </div>
                </form>
            </article>

            <article class="form-box">
                <h2>
                    ${AR_ON_YOU_SVG}
                    Your Info
                </h2>
                <div class="sub-container" id="swim-stats-container" style="margin-bottom: 1rem;">
                    <div id="recognition-stats-info"></div>
                    <p><button class="status-btn" onclick="switchView('/swims')">View Swims</button></p>
                </div>
                <div class="sub-container" id="profile-tags-outer-container">
                    <div id="profile-tags-container" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <p>Loading tags...</p>
                    </div>
                </div>
            </article>

            <article class="form-box">
                <h2>
                    ${TRIP_SVG}
                    Trip Form Info
                </h2>
                <p>If you are willing to be an emergency contact or first aider for a trip, please enter your details here.</p>
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
                <h2>
                    ${BRIGHTNESS_ALERT_SVG}
                    Danger Zone
                </h2>
                <div class="danger-zone-actions">
                    <button id="profile-logout-button">Logout</button>
                    <button id="profile-delete-account-button" class="secondary">Delete Account</button>
                    <button id="admin-panel-button" class="secondary hidden">Go to Admin Panel</button>
                </div>
            </article>
        </div>
    </div>
</div>`;

// --- State ---
let notification = null;

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
 * Show custom confirmation modal.
 * @returns {Promise<boolean>}
 */
function showConfirmModal(title, message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = `
            <div class="custom-modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        requestAnimationFrame(() => modalOverlay.classList.add('visible'));

        const cleanup = (val) => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(modalOverlay)) document.body.removeChild(modalOverlay);
                resolve(val);
            }, 300);
        };

        modalOverlay.querySelector('#confirm-ok').onclick = () => cleanup(true);
        modalOverlay.querySelector('#confirm-cancel').onclick = () => cleanup(false);
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cleanup(false); };
    });
}

/**
 * Show password confirmation modal.
 * @returns {Promise<string|null>} Returns password if confirmed, null otherwise.
 */
function showPasswordModal(title, message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = `
            <div class="custom-modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <input type="password" id="confirm-password" placeholder="Enter your password" style="width: 100%; margin-bottom: 1rem;">
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);
        requestAnimationFrame(() => modalOverlay.classList.add('visible'));

        const input = modalOverlay.querySelector('#confirm-password');
        input.focus();

        const cleanup = (val) => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(modalOverlay)) document.body.removeChild(modalOverlay);
                resolve(val);
            }, 300);
        };

        const confirm = () => {
            const password = input.value;
            if (password) cleanup(password);
        };

        modalOverlay.querySelector('#confirm-ok').onclick = confirm;
        modalOverlay.querySelector('#confirm-cancel').onclick = () => cleanup(null);
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cleanup(null); };
        input.onkeydown = (e) => { if (e.key === 'Enter') confirm(); };
    });
}

/**
 * Update status UI with icon and color.
 */
function updateStatusUI(elementId, text, icon, color) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const hasHtml = text.includes('<');
    const mainText = hasHtml ? text.split('<')[0] : text;
    const subContent = hasHtml ? text.substring(text.indexOf('<')) : '';

    el.innerHTML = `
        <div class="status-header" style="color: ${color} !important;">
            <span class="status-icon" style="fill: ${color} !important; color: ${color} !important;">
                ${icon}
            </span>
            <span class="status-label">${mainText}</span>
        </div>
        <div class="status-content">
            ${subContent}
        </div>
    `;

    const svgs = el.querySelectorAll('svg');
    svgs.forEach(svg => {
        svg.style.setProperty('fill', color, 'important');
        svg.style.setProperty('color', color, 'important');
    });
}

// --- Render Functions ---

/**
 * Render membership, legal, and balance status.
 */
function renderEventStatus(profile) {
    const profileMembership = document.getElementById('profile-membership');
    const academicYear = getAcademicYear();
    const balance = Number(profile.balance);
    const isLegalComplete = !!profile.filled_legal_info;

    ajaxGet('/api/globals/public/MembershipCost,MinMoney').then(globals => {
        const membershipCost = globals.res?.MembershipCost || 50;
        const minMoney = globals.res?.MinMoney || -20;
        const hasDebt = balance < minMoney;

        let boxColor = SUCCESS_GREEN;

        if (profile.is_member) {
            updateStatusUI("membership-info-status", `Your membership is active for the ${academicYear} academic year.`, CHECK_SVG, SUCCESS_GREEN);
        } else {
            if (profile.free_sessions > 0) {
                const msg = `You have ${profile.free_sessions} free session${profile.free_sessions > 1 ? 's' : ''} remaining for the ${academicYear} academic year.
                             <p>Become a full member to enjoy unlimited sessions!
                             <button id="become-member-button" class="status-btn">Become a Member</button></p>`;
                updateStatusUI("membership-info-status", msg, CHECK_INDETERMINATE_SMALL_SVG, WARNING_ORANGE);
                boxColor = WARNING_ORANGE;
            } else {
                const msg = `Your membership is inactive for the ${academicYear} academic year.
                             <p>Please become a member to continue attending sessions.
                             <button id="become-member-button" class="status-btn">Become a Member</button></p>`;
                updateStatusUI("membership-info-status", msg, CLOSE_SVG, WARNING_ORANGE);
                if (boxColor === SUCCESS_GREEN) boxColor = WARNING_ORANGE;
            }
        }

        const legalText = isLegalComplete ? 'Legal information form completed' : 'Legal information form not completed';
        const legalAction = `<p>Ensure your medical and contact details are kept up to date.
                             <button class="status-btn" onclick="event.preventDefault(); switchView('/legal')">Update Legal Form</button></p>`;
        updateStatusUI('legal-form-status', legalText + legalAction, isLegalComplete ? CHECK_SVG : CLOSE_SVG, isLegalComplete ? SUCCESS_GREEN : ERROR_RED);
        if (!isLegalComplete) boxColor = ERROR_RED;

        const debtText = hasDebt ? `You have outstanding debts of £${balance.toFixed(2)}` : `You have low/no outstanding debts (£${balance.toFixed(2)})`;
        const debtAction = `<p>Review your transaction history and manage your account balance.
                             <button class="status-btn" onclick="event.preventDefault(); switchView('/transactions')">Account Statement</button></p>`;
        updateStatusUI('debt-status', debtText + debtAction, hasDebt ? CLOSE_SVG : CHECK_SVG, hasDebt ? ERROR_RED : SUCCESS_GREEN);
        if (hasDebt) boxColor = ERROR_RED;

        if (!isLegalComplete) {
            updateStatusUI('profile-signup-status', "Please complete the legal forms to enable sign-ups.", CLOSE_SVG, ERROR_RED);
        } else if (hasDebt) {
            updateStatusUI('profile-signup-status', `You must clear your debt (must be above £${minMoney.toFixed(2)}) to enable sign-ups.`, CLOSE_SVG, ERROR_RED);
        } else if (balance < -10) {
            updateStatusUI('profile-signup-status', "You are close to your credit limit. Please clear your balance soon to avoid being blocked from sign-ups.", CHECK_INDETERMINATE_SMALL_SVG, WARNING_ORANGE);
            if (boxColor !== ERROR_RED) boxColor = WARNING_ORANGE;
        } else if (balance < (minMoney + 5)) {
            updateStatusUI('profile-signup-status', "Your balance is high. Please clear it soon.", CHECK_INDETERMINATE_SMALL_SVG, WARNING_ORANGE);
            if (boxColor !== ERROR_RED) boxColor = WARNING_ORANGE;
        } else {
            updateStatusUI('profile-signup-status', "You are eligible to sign up for events.", CHECK_SVG, SUCCESS_GREEN);
        }

        profileMembership.style.setProperty('--colour', boxColor);

        document.getElementById('become-member-button')?.addEventListener('click', async (event) => {
            event.preventDefault();
            const confirmed = await showConfirmModal(
                "Confirm Membership",
                `Annual membership costs <strong>£${membershipCost.toFixed(2)}</strong>. This will be added to your account balance. <br><br> <strong>Important:</strong> If this causes your debt to exceed £${Math.abs(minMoney).toFixed(2)}, you will be unable to sign up for new events until the balance is cleared, even if you have free sessions remaining.`
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
    const instructorStatusContainer = document.getElementById('instructor-status-container');
    const instructorColor = profile.is_instructor ? SUCCESS_GREEN : ERROR_RED;
    const instructorIcon = profile.is_instructor ? CHECK_SVG : CLOSE_SVG;
    const instructorText = profile.is_instructor ?
        `You are set up as an instructor. <p><button id="instructor-leave-btn" class="status-btn" type="button">Remove Status</button></p>` :
        `You are currently not set up as a coach. <p><button id="instructor-signup-btn" class="status-btn" type="button">Become a Coach</button></p>`;

    updateStatusUI('instructor-status', instructorText, instructorIcon, instructorColor);
    instructorStatusContainer.style.setProperty('--colour', instructorColor);
    instructorStatusContainer.style.color = instructorColor;

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
 * Populate personal details placeholders.
 */
function renderDetails(profile) {
    const fnInput = document.getElementById('profile-firstname');
    const lnInput = document.getElementById('profile-surname');
    const emInput = document.getElementById('profile-email');
    if (fnInput) fnInput.placeholder = profile.first_name;
    if (lnInput) lnInput.placeholder = profile.last_name;
    if (emInput) emInput.placeholder = profile.email;
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
    const firstname = document.getElementById('profile-firstname');
    const lastname = document.getElementById('profile-surname');
    const email = document.getElementById('profile-email');
    const submitButton = document.getElementById('profile-submit-button');

    function updateSubmitButtonState() {
        if (submitButton) submitButton.disabled = firstname.value.trim() === '' && lastname.value.trim() === '' && email.value.trim() === '';
    }

    if (firstname) firstname.addEventListener('input', updateSubmitButtonState);
    if (lastname) lastname.addEventListener('input', updateSubmitButtonState);
    if (email) email.addEventListener('input', updateSubmitButtonState);
    updateSubmitButtonState();

    if (submitButton) {
        submitButton.addEventListener('click', async (event) => {
            event.preventDefault();
            if (submitButton.disabled) return;

            const emailRegex = /^[^@]+\.[^@]+@durham\.ac\.uk$/i;
            if (email.value.trim() !== '' && !emailRegex.test(email.value.trim())) {
                email.setCustomValidity('Email must be a @durham.ac.uk address.');
                email.reportValidity();
                return;
            }

            const updateData = {};
            if (firstname.value.trim() !== '') updateData.first_name = firstname.value.trim();
            if (lastname.value.trim() !== '') updateData.last_name = lastname.value.trim();
            if (email.value.trim() !== '') updateData.email = email.value.trim();

            await ajaxPost('/api/user/elements', updateData);
            displayNotification('Profile updated.', "Successfully updated.", 'success');
            FirstNameChangedEvent.notify();
            firstname.value = ''; lastname.value = ''; email.value = '';
            updateProfilePage();
        });
    }

    const contactNumberInput = document.getElementById('profile-contact-number');
    const firstAidExpiryInput = document.getElementById('profile-first-aid-expires');
    const aidSubmitButton = document.getElementById('profile-aid-submit-button');
    const removeAidButton = document.getElementById('profile-aid-remove-button');

    function updateAidSubmitButtonState() {
        if (aidSubmitButton) aidSubmitButton.disabled = contactNumberInput.value.trim() === '' && firstAidExpiryInput.value.trim() === '';
    }

    if (contactNumberInput) contactNumberInput.addEventListener('input', updateAidSubmitButtonState);
    if (firstAidExpiryInput) firstAidExpiryInput.addEventListener('input', updateAidSubmitButtonState);
    updateAidSubmitButtonState();

    if (aidSubmitButton) {
        aidSubmitButton.addEventListener('click', async (event) => {
            event.preventDefault();
            if (aidSubmitButton.disabled) return;

            const phonePattern = /^\+?[0-9\s\-()]{7,15}$/;
            if (contactNumberInput.value.trim() !== '' && !phonePattern.test(contactNumberInput.value.trim())) {
                contactNumberInput.setCustomValidity('Invalid phone number.');
                contactNumberInput.reportValidity();
                return;
            }

            const updateData = {};
            if (contactNumberInput.value.trim() !== '') updateData.phone_number = contactNumberInput.value.trim();
            if (firstAidExpiryInput.value.trim() !== '') updateData.first_aid_expiry = firstAidExpiryInput.value.trim();

            await ajaxPost('/api/user/elements', updateData);
            displayNotification('Aid details updated.', "Successfully updated.", 'success');
            contactNumberInput.value = ''; firstAidExpiryInput.value = '';
            updateProfilePage();
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
                // error is likely a statusObject or response object, try to extract message
                const msg = error.message || "Could not delete account. Check your password.";
                displayNotification('Failed', msg, 'error');
            }
        });
    }

    const admin = document.getElementById('admin-panel-button');
    if (admin) {
        const isAdmin = await ajaxGet('/api/user/elements/can_manage_events,can_manage_users,is_exec');
        if (isAdmin.can_manage_users || isAdmin.can_manage_events || isAdmin.is_exec) {
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
        const profile = await ajaxGet('/api/user/elements/email,first_name,last_name,can_manage_users,is_member,is_instructor,filled_legal_info,phone_number,first_aid_expiry,free_sessions,balance,swims,swimmer_rank');
        if (profile) {
            renderEventStatus(profile);
            renderInstructorStatus(profile);
            renderDetails(profile);
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
    const swimContainer = document.getElementById('swim-stats-container');
    const tagsOuterContainer = document.getElementById('profile-tags-outer-container');

    if (swimContainer) {
        swimContainer.style.setProperty('--colour', INFO_CYAN);
        swimContainer.style.color = INFO_CYAN;
    }

    if (tagsOuterContainer) {
        tagsOuterContainer.style.setProperty('--colour', INFO_CYAN);
        tagsOuterContainer.style.color = INFO_CYAN;
    }

    if (info) {
        const stats = profile.swimmer_stats || { allTime: { swims: 0, rank: '-' }, yearly: { swims: 0, rank: '-' } };

        function getOrdinal(n) {
            if (n === undefined || n === null || n === '-' || n < 1) return '-';
            const s = ["th", "st", "nd", "rd"],
                v = n % 100;
            return n + (s[(v - 20) % 10] || s[v] || s[0]);
        }

        info.innerHTML = `
            <div class="status-item">
                <div class="status-header" style="color: ${INFO_CYAN} !important;">
                    <span class="status-icon" style="fill: ${INFO_CYAN};">
                        ${POOL_SVG}
                    </span>
                    <span class="status-label">Current Year: ${stats.yearly.swims} swims (${getOrdinal(stats.yearly.rank)})</span>
                </div>
            </div>
            <div class="status-item">
                <div class="status-header" style="color: ${INFO_CYAN} !important;">
                    <span class="status-icon" style="fill: ${INFO_CYAN};">
                        ${SOCIAL_LEADERBOARD_SVG}
                    </span>
                    <span class="status-label">All-time: ${stats.allTime.swims} swims (${getOrdinal(stats.allTime.rank)})</span>
                </div>
            </div>
        `;
    }

    if (tagsContainer) {
        try {
            const tags = await ajaxGet(`/api/user/tags`);
            if (tags && tags.length > 0) {
                tagsContainer.innerHTML = tags.map(tag =>
                    `<span style="background-color: ${tag.color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${tag.name}</span>`
                ).join('');
            } else {
                tagsContainer.innerHTML = '<p>No tags assigned.</p>';
            }
        } catch (e) {
            tagsContainer.innerHTML = '<p>Failed to load tags.</p>';
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