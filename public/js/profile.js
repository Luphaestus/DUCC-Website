import { LoginEvent } from './login.js'
import { ajaxGet, ajaxPost } from './misc/ajax.js';
import { LegalEvent } from './legal.js';
import { notify } from './misc/notification.js';
import { FirstNameChangedEvent } from './navbar.js';
import { ViewChangedEvent } from './misc/view.js';
import { requireAuth } from './misc/auth.js';
import { BalanceChangedEvent } from './misc/globals.js';

/**
 * Profile View Module.
 * 
 * Manages the user profile page where members can update their details,
 * check membership/instructor status, view balance, and manage their account.
 * Integrates with multiple sub-systems (Legal, Auth, Transactions).
 */

// --- Constants & Templates ---

const TICK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-.218 0 -.432 .002 -.642 .005l-.616 .017l-.299 .013l-.579 .034l-.553 .046c-4.785 .464 -6.732 2.411 -7.196 7.196l-.046 .553l-.034 .579c-.005 .098 -.01 .198 -.013 .299l-.017 .616l-.004 .318l-.001 .324c0 .218 .002 .432 .005 .642l.017 .616l.013 .299l.034 .579l.046 .553c.464 4.785 2.411 6.732 7.196 7.196l.553 .046l.579 .034c.098 .005 .198 .01 .299 .013l.616 .017l.642 .005l.642 -.005l.616 -.017l.299 -.013l.579 -.034l.553 -.046c4.785 -.464 6.732 -2.411 7.196 -7.196l.046 -.553l.034 -.579c.005 -.098 .01 -.198 .013 -.299l.017 -.616l.005 -.642l-.005 -.642l-.017 -.616l-.013 -.299l-.034 -.579l-.046 -.553c-.464 -4.785 -2.411 -6.732 -7.196 -7.196l-.553 -.046l-.579 -.034a28.058 28.058 0 0 0 -.299 -.013l-.616 -.017l-.318 -.004l-.324 -.001zm2.293 7.293a1 1 0 0 1 1.497 1.32l-.083 .094l-4 4a1 1 0 0 1 -1.32 .083l-.094 -.083l-2 -2a1 1 0 0 1 1.32 -1.497l.094 .083l1.293 1.292l3.293 -3.292z" /></svg>`;

const X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.676 2.001l.324 -.001c7.752 0 10 2.248 10 10l-.005 .642c-.126 7.235 -2.461 9.358 -9.995 9.358l-.642 -.005c-7.13 -.125 -9.295 -2.395 -9.358 -9.67v-.325c0 -7.643 2.185 -9.936 9.676 -9.999m2.771 5.105a1 1 0 0 0 -1.341 .447l-1.106 2.21l-1.106 -2.21a1 1 0 0 0 -1.234 -.494l-.107 .047a1 1 0 0 0 -.447 1.341l1.774 3.553l-1.775 3.553a1 1 0 0 0 .345 1.283l.102 .058a1 1 0 0 0 1.341 -.447l1.107 -2.211l1.106 2.211a1 1 0 0 0 1.234 .494l.107 -.047a1 1 0 0 0 .447 -1.341l-1.776 -3.553l1.776 -3.553a1 1 0 0 0 -.345 -1.283z" /></svg>`;

const MINUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.676 2.001l.324 -.001c7.752 0 10 2.248 10 10l-.005 .642c-.126 7.235 -2.461 9.358 -9.995 9.358l-.642 -.005c-7.13 -.125 -9.295 -2.395 -9.358 -9.67v-.325c0 -7.643 2.185 -9.936 9.676 -9.999m3.324 8.999h-6a1 1 0 0 0 0 2h6a1 1 0 0 0 0 -2z" /></svg>`;

const SUCCESS_GREEN = '#2ecc71';
const WARNING_ORANGE = '#f39c12';
const ERROR_RED = '#e74c3c';

/**
 * Main template for the profile view.
 */
const HTML_TEMPLATE = `
<div id="/profile-view" class="view hidden">
    <div class="small-container">
        <h1>Profile</h1>
        <div class="form-info" id="profile-info">
            <article class="form-box">
                <h3>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2c0-.656-.126-1.283-.356-1.857M9 20H7a4 4 0 01-4-4v-2.75a4 4 0 014-4h2.5M9 20v-2.75a4 4 0 00-4-4M9 20h2.5a4 4 0 004-4v-2.75M9 6V5a2 2 0 012-2h2a2 2 0 012 2v1m-3 14H9" />
                    </svg>
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
                        <div id="instructor-status"></div>
                    </div>
                </form>
            </article>

            <article class="form-box">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Swim Stats
                </h2>
                <div class="sub-container">
                    <div id="swim-stats-info"></div>
                    <p><button class="status-btn" onclick="switchView('/leaderboard')">View Swim Leaderboard</button></p>
                </div>
            </article>

            <article class="form-box">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" class="" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5.121 17.804A13.936 13.936 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Your details
                </h2>
                <form>
                    <div class="space-y-4">
                        <div><label for="profile-firstname">First Name:</label><input type="text" id="profile-firstname"></div>
                        <div><label for="profile-surname">Surname:</label><input type="text" id="profile-surname"></div>
                        <div><label for="profile-email">Email Address:</label><input type="email" id="profile-email"></div>
                    </div>
                    <button type="submit" id="profile-submit-button">Update Details</button>
                </form>
            </article>

            <article class="form-box">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Your Tags
                </h2>
                <div id="profile-tags-container" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <p>Loading tags...</p>
                </div>
            </article>
            <article class="form-box">
                <h2>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
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

function getAcademicYear() {
    const date = new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const startYear = month < 9 ? year - 1 : year;
    return `${startYear}/${startYear + 1}`;
}

function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

/**
 * Shows a custom glassy confirmation modal.
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

function renderEventStatus(profile) {
    const profileMembership = document.getElementById('profile-membership');
    const academicYear = getAcademicYear();
    const balance = Number(profile.balance);
    const isLegalComplete = !!profile.filled_legal_info;

    // Fetch dynamic costs and limits
    ajaxGet('/api/globals/public/MembershipCost,MinMoney').then(globals => {
        const membershipCost = globals.res?.MembershipCost || 50;
        const minMoney = globals.res?.MinMoney || -20;
        const hasDebt = balance < minMoney;

        let boxColor = SUCCESS_GREEN;

        // 1. Membership Status
        if (profile.is_member) {
            updateStatusUI("membership-info-status", `Your membership is active for the ${academicYear} academic year.`, TICK_SVG, SUCCESS_GREEN);
        } else {
            if (profile.free_sessions > 0) {
                const msg = `You have ${profile.free_sessions} free session${profile.free_sessions > 1 ? 's' : ''} remaining for the ${academicYear} academic year.
                             <p>Become a full member to enjoy unlimited sessions!
                             <button id="become-member-button" class="status-btn">Become a Member</button></p>`;
                updateStatusUI("membership-info-status", msg, MINUS_SVG, WARNING_ORANGE);
                boxColor = WARNING_ORANGE;
            } else {
                const msg = `Your membership is inactive for the ${academicYear} academic year.
                             <p>Please become a member to continue attending sessions.
                             <button id="become-member-button" class="status-btn">Become a Member</button></p>`;
                updateStatusUI("membership-info-status", msg, X_SVG, WARNING_ORANGE);
                if (boxColor === SUCCESS_GREEN) boxColor = WARNING_ORANGE;
            }
        }

        // 2. Legal Form Status
        const legalText = isLegalComplete ? 'Legal information form completed' : 'Legal information form not completed';
        const legalAction = `<button class="status-btn" onclick="event.preventDefault(); switchView('/legal')">Update Legal Form</button>`;
        updateStatusUI('legal-form-status', legalText + legalAction, isLegalComplete ? TICK_SVG : X_SVG, isLegalComplete ? SUCCESS_GREEN : ERROR_RED);
        if (!isLegalComplete) boxColor = ERROR_RED;

        // 3. Debt Status
        const debtText = hasDebt ? `You have outstanding debts of £${balance.toFixed(2)}` : `You have low/no outstanding debts (£${balance.toFixed(2)})`;
        const debtAction = `<button class="status-btn" onclick="event.preventDefault(); switchView('/transactions')">Account Statement</button>`;
        updateStatusUI('debt-status', debtText + (hasDebt ? debtAction : ''), hasDebt ? X_SVG : TICK_SVG, hasDebt ? ERROR_RED : SUCCESS_GREEN);
        if (hasDebt) boxColor = ERROR_RED;

        // 4. Signup Eligibility Summary
        const signupStatus = document.getElementById('profile-signup-status');
        if (!isLegalComplete) {
            updateStatusUI('profile-signup-status', "Please complete the legal forms to enable sign-ups.", X_SVG, ERROR_RED);
        } else if (hasDebt) {
            updateStatusUI('profile-signup-status', `You must clear your debt (must be above £${minMoney.toFixed(2)}) to enable sign-ups.`, X_SVG, ERROR_RED);
        } else if (balance < -10) {
            updateStatusUI('profile-signup-status', "You are close to your credit limit. Please clear your balance soon to avoid being blocked from sign-ups.", MINUS_SVG, WARNING_ORANGE);
            if (boxColor === SUCCESS_GREEN) boxColor = WARNING_ORANGE;
        } else if (balance < (minMoney + 5)) {
            updateStatusUI('profile-signup-status', "Your balance is high. Please clear it soon.", MINUS_SVG, WARNING_ORANGE);
            if (boxColor === SUCCESS_GREEN) boxColor = WARNING_ORANGE;
        } else {
            updateStatusUI('profile-signup-status', "You are eligible to sign up for events.", TICK_SVG, SUCCESS_GREEN);
        }

        profileMembership.style.setProperty('--colour', boxColor);

        // Bind dynamic button with dynamic cost
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

function renderInstructorStatus(profile) {
    const instructorStatusContainer = document.getElementById('instructor-status-container');
    const instructorColor = profile.is_instructor ? SUCCESS_GREEN : ERROR_RED;
    const instructorIcon = profile.is_instructor ? TICK_SVG : X_SVG;
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

function renderDetails(profile) {
    document.getElementById('profile-firstname').placeholder = profile.first_name;
    document.getElementById('profile-surname').placeholder = profile.last_name;
    document.getElementById('profile-email').placeholder = profile.email;
}

function renderAidDetails(profile) {
    const contactNumberInput = document.getElementById('profile-contact-number');
    const firstAidExpiryInput = document.getElementById('profile-first-aid-expires');
    const removeAidButton = document.getElementById('profile-aid-remove-button');

    contactNumberInput.placeholder = profile.phone_number || 'e.g., 07700 900333';
    firstAidExpiryInput.value = profile.first_aid_expiry || '';

    if (!profile.first_aid_expiry) {
        removeAidButton.classList.add('hidden');
    } else {
        removeAidButton.classList.remove('hidden');
    }
}

async function bindStaticEvents() {
    const firstname = document.getElementById('profile-firstname');
    const lastname = document.getElementById('profile-surname');
    const email = document.getElementById('profile-email');
    const submitButton = document.getElementById('profile-submit-button');

    function updateSubmitButtonState() {
        submitButton.disabled = firstname.value.trim() === '' && lastname.value.trim() === '' && email.value.trim() === '';
    }

    [firstname, lastname, email].forEach(el => el.addEventListener('input', updateSubmitButtonState));
    updateSubmitButtonState();

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

    const contactNumberInput = document.getElementById('profile-contact-number');
    const firstAidExpiryInput = document.getElementById('profile-first-aid-expires');
    const aidSubmitButton = document.getElementById('profile-aid-submit-button');
    const removeAidButton = document.getElementById('profile-aid-remove-button');

    function updateAidSubmitButtonState() {
        aidSubmitButton.disabled = contactNumberInput.value.trim() === '' && firstAidExpiryInput.value.trim() === '';
    }

    [contactNumberInput, firstAidExpiryInput].forEach(el => el.addEventListener('input', updateAidSubmitButtonState));
    updateAidSubmitButtonState();

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

    removeAidButton.addEventListener('click', async (event) => {
        event.preventDefault();
        await ajaxPost('/api/user/elements', { first_aid_expiry: null });
        displayNotification('Removed.', "First aid expiry removed.", 'success');
        updateProfilePage();
    });

    document.getElementById('profile-logout-button').addEventListener('click', async (event) => {
        event.preventDefault();
        await ajaxGet('/api/auth/logout');
        LoginEvent.notify({ authenticated: false });
        switchView('/home');
    });

    document.getElementById('profile-delete-account-button').addEventListener('click', async (event) => {
        event.preventDefault();
        if (!confirm("Delete your account?")) return;
        try {
            await ajaxPost('/api/user/deleteAccount', {});
            LoginEvent.notify({ authenticated: false });
            switchView('/home');
        } catch (error) {
            displayNotification('Failed', "Could not delete account.", 'error');
        }
    });

    const admin = document.getElementById('admin-panel-button');
    const isAdmin = await ajaxGet('/api/user/elements/can_manage_events,can_manage_users,is_exec');
    if (isAdmin.can_manage_users || isAdmin.can_manage_events || isAdmin.is_exec) {
        admin.classList.remove('hidden');
    }
    admin.addEventListener('click', (e) => { e.preventDefault(); switchView('/admin/'); });
}

async function renderTags() {
    const container = document.getElementById('profile-tags-container');
    try {
        const tags = await ajaxGet(`/api/user/tags`);
        if (tags && tags.length > 0) {
            container.innerHTML = tags.map(tag =>
                `<span style="background-color: ${tag.color}; color: white; padding: 4px 8px; border-radius: 4px;">${tag.name}</span>`
            ).join('');
        } else {
            container.innerHTML = '<p>No tags assigned.</p>';
        }
    } catch (e) {
        container.innerHTML = '<p>Failed to load tags.</p>';
    }
}

async function updateProfilePage() {
    if (!await requireAuth()) return;
    try {
        const profile = await ajaxGet('/api/user/elements/email,first_name,last_name,can_manage_users,is_member,is_instructor,filled_legal_info,phone_number,first_aid_expiry,free_sessions,balance,swims,swimmer_rank');
        if (profile) {
            renderEventStatus(profile);
            renderInstructorStatus(profile);
            renderDetails(profile);
            renderAidDetails(profile);
            renderTags();
            renderSwimStats(profile);
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * Renders swim stats and rank.
 */
function renderSwimStats(profile) {
    const info = document.getElementById('swim-stats-info');
    if (!info) return;

    const swims = profile.swims || 0;
    const rank = profile.swimmer_rank || '-';

    function getOrdinal(n) {
        if (isNaN(n)) return n;
        const s = ["th", "st", "nd", "rd"],
              v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    info.innerHTML = `
        <div class="status-item">
            <div class="status-header" style="color: var(--pico-contrast) !important;">
                <span class="status-icon">🏆</span>
                <span class="status-label">Total Swims: ${swims}</span>
            </div>
        </div>
        <div class="status-item">
            <div class="status-header" style="color: var(--pico-contrast) !important;">
                <span class="status-icon">🎖️</span>
                <span class="status-label">Swimmer Rank: ${swims > 0 ? getOrdinal(rank) : 'No rank yet'}</span>
            </div>
        </div>
    `;
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