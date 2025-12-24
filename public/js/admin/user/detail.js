import { ajaxGet, ajaxPost } from '../../misc/ajax.js';
import { notify } from '../../misc/notification.js';
import { switchView } from '../../misc/view.js';
import { adminContentID } from '../common.js';

// --- Icons ---
const USER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
const EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>`;
const PHONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
const ID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>`;
const MEDICAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m7.5 0a4.5 4.5 0 1 1-4.5 4.5M16.5 12H15m-3 4.5V15"></path></svg>`;
const WALLET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>`;
const DIFFICULTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;
const HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
const INSTRUCTOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800px" height="800px" viewBox="0 0 31.178 31.178" xml:space="preserve"><g><g><circle cx="5.042" cy="5.721" r="3.866"/><path d="M30.779,6.78h-9.346V5.722h-2.479V6.78h-8.877H9.446v1.275h0.631v2.806l-1.452-0.692H6.449l-1.474,1.709l-1.426-1.709    l-3.133,0.582l-0.2,6.949h1.328l0.072,1.443h0.202v0.879v0.649v6.884H1.551L0,27.893v1.43h1.321l1.542-0.251l0.014,0.251h1.708    v-1.593v-0.173v-6.883h0.973v6.883v0.173v1.593h1.708l0.014-0.251l1.542,0.251h1.321v-1.43L8.59,27.557H8.325v-6.883v-0.65v-0.879    H8.57l0.316-6.4l1.191,0.539v7.355h9.136v2.343l-5.042,5.688h1.812l3.404-3.844v3.844h1.041v-3.84l3.399,3.84h1.841l-5.07-5.688    v-2.343h10.182V8.056h0.398V6.78H30.779z M29.887,19.7h-9.291h-1.383H10.97v-6.013l3.717,1.682l-0.014-2.317l-3.703-1.765V8.056    h18.917V19.7z"/></g></g></svg>`
const FREE_SESSIONS_SVG = `<svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800px" height="800px" viewBox="0 0 512 512" xml:space="preserve"><style type="text/css"></style><g><path class="st0" d="M278.202,321.188v30.469h30.344c-8.047,19.406-24.203,28.844-49.188,28.844   c-18.625,0-32.75-5.297-43.172-16.219c-10.484-10.984-15.594-22.922-15.594-36.5c0-15.625,5.234-28.25,15.969-38.625   c10.797-10.422,24-15.5,40.328-15.5c18.859,0,35.047,6.875,49.469,21.016l22.125-22.109   c-11.953-11.484-23.906-19.453-35.516-23.703c-11.5-4.219-24.344-6.359-38.188-6.359c-23.641,0-44.063,8.281-60.703,24.625   c-16.672,16.344-25.109,36.438-25.109,59.719c0,22.125,8.219,42.031,24.453,59.141c16.297,17.203,38.328,25.922,65.469,25.922   c11.797,0,22.156-1.344,30.766-3.969c8.766-2.688,17.078-7.188,24.719-13.391c7.609-6.172,13.781-13.281,18.375-21.125   c4.547-7.766,7.594-15.031,9.078-21.609c1.453-6.516,2.172-14.891,2.172-25.609v-5.016H278.202z"/><path class="st0" d="M476.232,174.734c2.203-8.547-2.953-17.266-11.516-19.484l-57.578-14.781l50.609-27.672   c7.75-4.234,10.594-13.969,6.359-21.719s-13.969-10.594-21.719-6.344l-64.062,35.047l39.219-95.25   c0.469-1.156,0.453-2.469-0.078-3.609c-0.516-1.141-1.5-2.016-2.688-2.422c0,0-31.688-16.438-49.594-16.438   c-37.047,0-73.047,19.422-105.813,19.422c-9.922,0-19.547-1.781-28.797-6.422C208.811,4.188,189.811,0,171.827,0   C144.655,0,96.53,18.766,96.53,18.766c-1.281,0.313-2.359,1.172-2.953,2.359c-0.594,1.172-0.641,2.547-0.141,3.766l43.172,104.859   c-5.313,2.625-9,8.031-9,14.344c0,5.438,2.734,10.234,6.891,13.125c-21.109,25.156-73.156,92.547-92.766,167.031   C13.467,431.703,76.514,512,255.42,512c178.89,0,241.937-80.297,213.671-187.75c-17.297-65.688-59.828-125.875-84.109-156.438   l71.781,18.438C465.311,188.453,474.029,183.297,476.232,174.734z M171.827,40c13.078,0,26.063,3.453,40.859,10.844   c14.109,7.063,29.813,10.641,46.688,10.641c21.266,0,41.078-5.438,60.234-10.688c16.391-4.5,31.859-8.734,45.578-8.734l1.875,0.031   l-35.406,86H179.17l-34.563-83.969C154.108,41.547,163.03,40,171.827,40z M419.811,421.094C394.499,453.922,336.124,472,255.42,472   c-80.719,0-139.094-18.078-164.406-50.906C74.499,399.656,70.92,370.5,80.42,334.438c21.906-83.25,91.844-159.766,92.516-160.5   l12.844-13.844h139.266l12.844,13.844c0.703,0.766,70.469,76.719,92.515,160.5C439.904,370.5,436.326,399.656,419.811,421.094z"/></g></svg>`;
const DIFFICULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" xml:space="preserve"><g><circle cx="127.8" cy="57.3" r="17.9"/><path d="M180.7,15.8c-3.6,0-6.7,2.5-7.6,5.8H82.5c-0.9-3.3-4-5.8-7.6-5.8c-3.6,0-6.7,2.5-7.6,5.8H48.8v5h18.3v32.9 c0,2.2,0.9,4.2,2.4,5.6l33.6,33.6v1.2v60.5v80.7c0,6.2,5,11.2,11.2,11.2c6.2,0,11.2-5,11.2-11.2v-78.5c0-1.2,1-2.2,2.2-2.2 c1.2,0,2.2,1,2.2,2.2v78.5c0,6.2,5,11.2,11.2,11.2c6.2,0,11.2-5,11.2-11.2v-80.7V98.9l33.6-33.6c1.5-1.4,2.4-3.5,2.4-5.6v-33h18.3 v-5h-18.6C187.4,18.3,184.3,15.8,180.7,15.8z M172.9,56.3l-17.5,17.5c-2.6,2.6-6.2,3.9-9.6,3.9h-17.9h-17.9c-3.5,0-7-1.3-9.6-3.9 L82.8,56.3V26.7h90.1V56.3z"/><rect x="36.1" y="1.8" width="11.1" height="44.4"/><rect x="22.5" y="13.3" width="11.1" height="21.4"/><rect x="208.5" y="1.8" width="11.1" height="44.4"/><rect x="222.1" y="13.3" width="11.1" height="21.4"/></g></svg>`;
const FILLED_LEGAL_INFO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>`;
const DATE_OF_BIRTH = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>`;
const EMERGENCY_CONTACT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/><path d="M15 7h6"/><path d="M18 4v6"/></svg>`;
const MEDICAL_CONDITIONS = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 14C2 10.2288 2 8.34315 3.17157 7.17157C4.34315 6 6.22876 6 10 6H14C17.7712 6 19.6569 6 20.8284 7.17157C22 8.34315 22 10.2288 22 14C22 17.7712 22 19.6569 20.8284 20.8284C19.6569 22 17.7712 22 14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14Z" stroke="currentColor" stroke-width="1.5"/><path d="M16 6C16 4.11438 16 3.17157 15.4142 2.58579C14.8284 2 13.8856 2 12 2C10.1144 2 9.17157 2 8.58579 2.58579C8 3.17157 8 4.11438 8 6" stroke="currentColor" stroke-width="1.5"/><path d="M13.5 14H10.5M12 12.5V15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="14" r="4" stroke="currentColor" stroke-width="1.5"/></svg>`
const MEDICATION = `<svg viewBox="20 15 60 65" xmlns="http://www.w3.org/2000/svg"><path d="M64.73,49.35a1.63,1.63,0,0,0,1-1.48V24.73a4.83,4.83,0,0,0-4.83-4.83H29.81A4.82,4.82,0,0,0,25,24.73V65.3a4.82,4.82,0,0,0,4.82,4.83h15.8a1.61,1.61,0,0,0,1.45-.92A10.82,10.82,0,0,1,48.73,67l12-14.25A11.34,11.34,0,0,1,64.73,49.35ZM30.21,33.67a1.52,1.52,0,0,1,1.52-1.52h3.05v-3a1.52,1.52,0,0,1,1.52-1.48h1.52a1.53,1.53,0,0,1,1.52,1.53v2.95h3a1.55,1.55,0,0,1,1.53,1.53v1.52a1.56,1.56,0,0,1-1.53,1.53h-3v3.07a1.52,1.52,0,0,1-1.52,1.52H36.29a1.52,1.52,0,0,1-1.51-1.52v-3H31.73a1.52,1.52,0,0,1-1.52-1.52ZM49.32,58.18a1.61,1.61,0,0,1-1.61,1.61l-15.89,0a1.61,1.61,0,0,1-1.61-1.61V56.41a1.61,1.61,0,0,1,1.61-1.6H47.71a1.61,1.61,0,0,1,1.61,1.6Zm8.1-9.81A1.61,1.61,0,0,1,55.81,50h-24a1.61,1.61,0,0,1-1.61-1.61V46.63A1.61,1.61,0,0,1,31.82,45h24a1.61,1.61,0,0,1,1.61,1.61Z"/><path d="M73.38,53.77a6.72,6.72,0,0,0-9.4.54,2.43,2.43,0,0,0-.2.25l-5,5.88,10,8.51,0,0,0,0,5-5.88A6.59,6.59,0,0,0,73.38,53.77Z"/><path d="M56.66,63.1l0,0-5,5.88a6.62,6.62,0,0,0,9.93,8.76l.21-.25,5-5.88-10-8.51Z"/></svg>`;
const FIRST_AID_EXPIRY = `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><g><path d="M12.144 1.157a8 8 0 10-.709 14.068 1 1 0 00-.858-1.806 6 6 0 112.86-7.955 1 1 0 001.814-.845 8 8 0 00-3.107-3.462z"/><path d="M7 5a1 1 0 112 0v4a1 1 0 01-.553.894l-2 1a1 1 0 11-.894-1.788L7 8.382V5zm9 10a1 1 0 11-2 0 1 1 0 012 0zm-1-7a1 1 0 00-1 1v3a1 1 0 102 0V9a1 1 0 00-1-1z"/></g></svg>`;

// --- Main Render Function ---

/**
 * Fetches and renders detailed information for a specific user.
 * Sets up tab navigation for different sections (profile, legal, transactions).
 * @param {string|number} userId - The ID of the user to view.
 */
export async function renderUserDetail(userId) {
    const adminContent = document.getElementById(adminContentID);
    adminContent.innerHTML = '<p aria-busy="true">Loading user details...</p>';

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) {
        actionsEl.innerHTML = '<button id="admin-back-btn">&larr; Back to Users</button>';
        document.getElementById('admin-back-btn').onclick = () => switchView('/admin/users');
    }

    try {
        const user = await ajaxGet(`/api/admin/user/${userId}`);
        const status = await ajaxGet('/api/globals/status');
        const isPresident = status.isPresident;

        const perms = await ajaxGet('/api/user/elements/can_manage_users,can_manage_transactions').catch(() => ({}));
        const canManageUsers = perms.can_manage_users;
        const canManageTransactions = perms.can_manage_transactions;

        let tabsHtml = '<button class="tab-btn" data-tab="profile">Profile</button>';
        if (canManageUsers) {
            tabsHtml += `
                <button class="tab-btn" data-tab="legal">Legal</button>
                <button class="tab-btn" data-tab="tags">Tags</button>
            `;
        }
        if (canManageTransactions) {
            tabsHtml += `
                <button class="tab-btn" data-tab="transactions">Transactions</button>
            `;
        }

        adminContent.innerHTML = `
            <div class="form-info user-detail-container" id="user-detail-container">
                <article class="form-box">
                    <div class="admin-controls-bar">
                        <div class="admin-nav-group" id="admin-user-tabs">
                            ${tabsHtml}
                        </div>
                        <h2 class="user-name-header">${user.first_name} ${user.last_name}</h2>
                    </div>
                    <div id="admin-tab-content"></div>
                </article>
            </div>
        `;


        const tabs = adminContent.querySelectorAll('.tab-btn');
        const updateActiveTab = (activeBtn) => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.disabled = false;
            });
            activeBtn.classList.add('active');
            activeBtn.disabled = true;
        };

        const currentTab = new URLSearchParams(window.location.search).get('tab') || 'profile';
        const initialTabBtn = Array.from(tabs).find(t => t.dataset.tab === currentTab) || tabs[0];

        tabs.forEach(btn => {
            btn.onclick = () => {
                updateActiveTab(btn);
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('tab', btn.dataset.tab);
                window.history.replaceState({}, '', newUrl);
                renderTab(btn.dataset.tab, user, isPresident);
            };
        });

        updateActiveTab(initialTabBtn);
        renderTab(initialTabBtn.dataset.tab, user, isPresident);

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = `
            <div class="form-info">
                <article class="form-box">
                    <h3 class="error-text">Error</h3>
                    <p>Failed to load user details.</p>
                </article>
            </div>`;
    }
}

// --- Tab Render Functions ---

/**
 * Renders the content of the selected tab.
 * @param {string} tabName - The name of the tab to render ('profile', 'legal', or 'transactions').
 * @param {object} user - The user object containing all user details.
 * @param {boolean} isPresident - Whether the current user is the president.
 */
function renderTab(tabName, user, isPresident) {
    const container = document.getElementById('admin-tab-content');
    if (tabName === 'profile') {
        let permissionsHtml = '';
        if (isPresident) {
            permissionsHtml = `
                <div class="event-details-section" id="admin-user-permissions-container">
                    <h3>${ID_SVG} Permissions</h3>
                    <p>
                        <label>
                            <input type="checkbox" id="perm-manage-users" ${user.can_manage_users ? 'checked' : ''}>
                            Manage Users
                        </label>
                    </p>
                    <p>
                        <label>
                            <input type="checkbox" id="perm-manage-events" ${user.can_manage_events ? 'checked' : ''}>
                            Manage Events
                        </label>
                    </p>
                    <p>
                        <label>
                            <input type="checkbox" id="perm-manage-transactions" ${user.can_manage_transactions ? 'checked' : ''}>
                            Manage Transactions
                        </label>
                    </p>
                    <p>
                        <label>
                            <input type="checkbox" id="perm-is-exec" ${user.is_exec ? 'checked' : ''}>
                            Is Exec
                        </label>
                    </p>
                </div>
            `;
        }

        // Check if sensitive data is present (it won't be if the user is only a transaction manager)
        const showSensitiveData = user.email !== undefined;

        let generalInfoHtml;
        if (showSensitiveData) {
            generalInfoHtml = `
                <div class="event-details-section" id="admin-user-general-info-container">
                    <h3>${USER_SVG} General Info</h3>
                    <p>${EMAIL_SVG} <strong>Email:</strong> ${user.email}</p>
                    <p>${PHONE_SVG} <strong>Phone:</strong> ${user.phone_number || 'N/A'}</p>
                    <p>${USER_SVG} <strong>College:</strong> ${user.college_id || 'N/A'}</p>
                    <p>${WALLET_SVG} <strong>Balance:</strong> £${Number(user.balance).toFixed(2)}</p>
                </div>`;
        } else {
            generalInfoHtml = `
                <div class="event-details-section" id="admin-user-general-info-container">
                    <h3>${USER_SVG} General Info</h3>
                    <p><em>Personal contact information is hidden.</em></p>
                    <p>${WALLET_SVG} <strong>Balance:</strong> £${Number(user.balance).toFixed(2)}</p>
                </div>`;
        }

        container.innerHTML = `
            <div class="event-content-split" id="admin-user-profile-container">
                ${generalInfoHtml}
                <div class="event-details-section" id="admin-user-membership-container">
                     <h3>${DIFFICULTY_SVG} Status & Level</h3>
                     <p>${USER_SVG} <strong>Member:</strong> ${user.is_member ? 'Yes' : 'No'}</p>
                     <p>${INSTRUCTOR_SVG} <strong>Instructor:</strong> ${user.is_instructor ? 'Yes' : 'No'}</p>
                     <p>${FREE_SESSIONS_SVG} <strong>Free Sessions:</strong> ${user.free_sessions}</p>
                     <div class="detail-difficulty-control">
                        <strong>${DIFFICULT_SVG} Difficulty Level:</strong>
                        <input type="number" id="admin-user-difficulty" value="${user.difficulty_level || 1}" min="1" max="5">
                     </div>
                </div>
                ${permissionsHtml}
            </div>
        `;

        const difficultyInput = document.getElementById('admin-user-difficulty');
        difficultyInput.onchange = async () => {
            const level = difficultyInput.value;
            try {
                await ajaxPost(`/api/admin/user/${user.id}/elements`, { difficulty_level: level });
                notify('Success', 'Difficulty level updated', 'success');
            } catch (e) {
                console.error(e);
                notify('Error', 'Failed to update difficulty', 'error');
            }
        };

        if (isPresident) {
            const bindPermissionToggle = (id, field) => {
                const el = document.getElementById(id);
                el.addEventListener('change', async () => {
                    try {
                        await ajaxPost(`/api/admin/user/${user.id}/elements`, { [field]: el.checked });
                        notify('Success', 'Permissions updated', 'success');
                        user[field] = el.checked;
                    } catch (e) {
                        console.error(e);
                        notify('Error', 'Failed to update permissions', 'error');
                        el.checked = !el.checked;
                    }
                });
            };

            bindPermissionToggle('perm-manage-users', 'can_manage_users');
            bindPermissionToggle('perm-manage-events', 'can_manage_events');
            bindPermissionToggle('perm-manage-transactions', 'can_manage_transactions');
            bindPermissionToggle('perm-is-exec', 'is_exec');
        }

    } else if (tabName === 'legal') {
        container.innerHTML = `
            <div class="event-details-section" id="admin-user-legal-container">
                <h3>${MEDICAL_SVG} Legal & Medical</h3>
                <p>${FILLED_LEGAL_INFO} <strong>Filled Legal Info:</strong> ${user.filled_legal_info ? 'Yes' : 'No'}</p>
                <p>${DATE_OF_BIRTH} <strong>Date of Birth:</strong> ${user.date_of_birth || 'N/A'}</p>
                <p>${HOME_SVG} <strong>Address:</strong> ${user.home_address || 'N/A'}</p>
                <p>${EMERGENCY_CONTACT} <strong>Emergency Contact:</strong> ${user.emergency_contact_name || 'N/A'} (${user.emergency_contact_phone || 'N/A'})</p>
                <p>${MEDICAL_CONDITIONS} <strong>Medical Conditions:</strong> ${user.has_medical_conditions ? 'Yes' : 'No'}</p>
                ${user.has_medical_conditions ? `<p><strong>Details:</strong> ${user.medical_conditions_details}</p>` : ''}
                <p>${MEDICATION} <strong>Medication:</strong> ${user.takes_medication ? 'Yes' : 'No'}</p>
                ${user.takes_medication ? `<p><strong>Details:</strong> ${user.medication_details}</p>` : ''}
                <p>${FIRST_AID_EXPIRY} <strong>First Aid Expiry:</strong> ${user.first_aid_expiry || 'N/A'}</p>
            </div>
        `;
    } else if (tabName === 'transactions') {
        renderTransactionsTab(container, user.id);
    } else if (tabName === 'tags') {
        renderTagsTab(container, user.id);
    }
}

/**
 * Fetches and renders the tags tab for the user.
 * Allows adding and removing tags.
 * @param {HTMLElement} container - The container to render the tags into.
 * @param {string|number} userId - The ID of the user.
 */
async function renderTagsTab(container, userId) {
    container.innerHTML = '<p aria-busy="true">Loading tags...</p>';
    try {
        const [allTagsData, userTags] = await Promise.all([
            ajaxGet('/api/tags'),
            ajaxGet(`/api/user/${userId}/tags`)
        ]);

        const allTags = allTagsData.data || [];
        const availableTags = allTags.filter(tag => !userTags.some(ut => ut.id === tag.id));

        let html = `
            <div class="event-details-section">
                <h3>Tags</h3>
                <div class="tag-controls">
                    <select id="admin-add-tag-select" class="admin-tag-select">
                        <option value="">Select a tag to add...</option>
                        ${availableTags.map(tag => `<option value="${tag.id}">${tag.name}</option>`).join('')}
                    </select>
                    <button id="admin-add-tag-btn" disabled>Add Tag</button>
                </div>
                <div id="admin-user-tags-list" class="user-tags-list">
        `;

        if (userTags.length === 0) {
            html += '<p>No tags assigned.</p>';
        } else {
            userTags.forEach(tag => {
                html += `
                    <div class="user-tag-item" style="background-color: ${tag.color};">
                        <span>${tag.name}</span>
                        <button class="remove-tag-btn" data-tag-id="${tag.id}">&times;</button>
                    </div>
                `;
            });
        }

        html += `</div></div>`;
        container.innerHTML = html;

        // Bind events
        const select = document.getElementById('admin-add-tag-select');
        const addBtn = document.getElementById('admin-add-tag-btn');

        if (select) {
            select.onchange = () => {
                addBtn.disabled = !select.value;
            };

            addBtn.onclick = async () => {
                const tagId = select.value;
                if (!tagId) return;

                try {
                    await ajaxPost(`/api/tags/${tagId}/whitelist`, { userId });
                    notify('Success', 'Tag added', 'success');
                    renderTagsTab(container, userId);
                } catch (e) {
                    console.error(e);
                    notify('Error', 'Failed to add tag', 'error');
                }
            };
        }

        container.querySelectorAll('.remove-tag-btn').forEach(btn => {
            btn.onclick = async () => {
                const tagId = btn.dataset.tagId;
                if (!confirm('Are you sure you want to remove this tag from the user?')) return;

                try {
                    await fetch(`/api/tags/${tagId}/whitelist/${userId}`, { method: 'DELETE' });
                    notify('Success', 'Tag removed', 'success');
                    renderTagsTab(container, userId);
                } catch (e) {
                    console.error(e);
                    notify('Error', 'Failed to remove tag', 'error');
                }
            };
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p class="error-text">Failed to load tags.</p>';
    }
}

/**
 * Fetches and renders the transactions for the user.
 * Allows adding, editing, and deleting transactions.
 * @param {HTMLElement} container - The container to render the transactions table into.
 * @param {string|number} userId - The ID of the user.
 */
async function renderTransactionsTab(container, userId) {
    container.innerHTML = '<p aria-busy="true">Loading transactions...</p>';
    try {
        const transactions = await ajaxGet(`/api/admin/user/${userId}/transactions`);

        const formatedDate = new Date().toLocaleDateString('en-GB');

        let html = `
            <h3>${WALLET_SVG} Transactions</h3>
            <div class="table-responsive">
                <table class="admin-table full-width">
                    <thead><tr><th>Date</th><th>Description</th><th>Amount</th><th>Balance After</th><th>Action</th></tr></thead>
                    <tbody>
                        <tr>
                            <td>${formatedDate}</td>
                            <td><input id="new-tx-desc" type="text" placeholder="Description"></td>
                            <td><input id="new-tx-amount" type="number" step="0.01" placeholder="Amount"></td>
                            <td id="new-tx-after">N/A</td>
                            <td><button id="add-tx-btn">Add</button></td>
                        </tr>
        `;

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            html += '<tr><td colspan="5">No transactions found.</td></tr>';
        } else {
            transactions.forEach(tx => {
                html += `
                    <tr>
                        <td>${new Date(tx.created_at).toLocaleDateString('en-GB')}</td>
                        <td>
                            <span class="tx-desc-text">${tx.description}</span>
                            <input class="tx-desc-input hidden" value="${tx.description}">
                        </td>
                        <td>
                            <span class="tx-amount-text">£${tx.amount.toFixed(2)}</span>
                            <input type="number" step="0.01" class="tx-amount-input hidden" value="${tx.amount}">
                        </td>
                        <td>£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}</td>
                        <td>
                            <div class="tx-actions">
                                <button class="edit-tx-btn" data-id="${tx.id}">Edit</button>
                                <button class="save-tx-btn hidden" data-id="${tx.id}">Save</button>
                                <button class="cancel-tx-btn hidden" data-id="${tx.id}">Cancel</button>
                                <button class="delete-tx-btn delete" data-id="${tx.id}">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;

        document.getElementById('add-tx-btn').onclick = async () => {
            const amount = document.getElementById('new-tx-amount').value;
            const description = document.getElementById('new-tx-desc').value;
            if (!amount || !description) return notify('Error', 'Please fill all fields', 'error');

            await ajaxPost(`/api/admin/user/${userId}/transaction`, { amount, description });
            notify('Success', 'Transaction added', 'success');
            renderTransactionsTab(container, userId);
        };

        container.querySelectorAll('.delete-tx-btn').forEach(btn => {
            btn.onclick = async () => {
                const res = await fetch(`/api/admin/transaction/${btn.dataset.id}`, { method: 'DELETE' });
                if (res.ok) {
                    notify('Success', 'Transaction deleted', 'success');
                    renderTransactionsTab(container, userId);
                } else {
                    notify('Error', 'Failed to delete transaction', 'error');
                }
            };
        });

        document.getElementById('new-tx-amount').oninput = () => {
            const currentBalance = transactions.length > 0 ? transactions[0].after : 0;
            const newAmount = parseFloat(document.getElementById('new-tx-amount').value) || 0;
            const newBalance = currentBalance + newAmount;
            document.getElementById('new-tx-after').textContent = `£${newBalance.toFixed(2)}`;
        };

        setupTransactionEditHandlers(container, userId);

    } catch (e) {
        console.error(e);
        container.innerHTML = '<p>Error loading transactions.</p>';
    }
}

// --- Helper Functions ---

/**
 * Sets up event listeners for editing, saving, and cancelling transaction edits.
 * @param {HTMLElement} container - The container containing the transactions table.
 * @param {string|number} userId - The ID of the user.
 */
function setupTransactionEditHandlers(container, userId) {
    const toggleEdit = (row, edit) => {
        const show = (sel) => row.querySelector(sel)?.classList.remove('hidden');
        const hide = (sel) => row.querySelector(sel)?.classList.add('hidden');

        if (edit) {
            hide('.tx-desc-text'); show('.tx-desc-input');
            hide('.tx-amount-text'); show('.tx-amount-input');
            hide('.edit-tx-btn'); show('.save-tx-btn'); show('.cancel-tx-btn');
            hide('.delete-tx-btn');
        } else {
            show('.tx-desc-text'); hide('.tx-desc-input');
            show('.tx-amount-text'); hide('.tx-amount-input');
            show('.edit-tx-btn'); hide('.save-tx-btn'); hide('.cancel-tx-btn');
            show('.delete-tx-btn');
        }
    };

    container.querySelectorAll('.edit-tx-btn').forEach(btn => {
        btn.onclick = () => toggleEdit(btn.closest('tr'), true);
    });

    container.querySelectorAll('.cancel-tx-btn').forEach(btn => {
        btn.onclick = () => toggleEdit(btn.closest('tr'), false);
    });

    container.querySelectorAll('.save-tx-btn').forEach(btn => {
        btn.onclick = async () => {
            const row = btn.closest('tr');
            const id = btn.dataset.id;
            const amount = row.querySelector('.tx-amount-input').value;
            const description = row.querySelector('.tx-desc-input').value;

            const res = await fetch(`/api/admin/transaction/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, description })
            });

            if (res.ok) {
                notify('Success', 'Transaction updated', 'success');
                renderTransactionsTab(container, userId);
            } else {
                notify('Error', 'Failed to update transaction', 'error');
            }
        };
    });
}
