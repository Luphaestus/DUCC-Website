import { ajaxGet, ajaxPost } from '../../misc/ajax.js';
import { notify } from '../../misc/notification.js';
import { switchView } from '../../misc/view.js';
import { adminContentID } from '../common.js';

// --- Icons ---
const USER_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
  <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
</svg>`;
const EMAIL_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" />
  <path d="M3 7l9 6l9 -6" />
</svg>`;
const PHONE_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" />
</svg>`;
const ID_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M3 4m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z" />
  <path d="M9 10m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
  <path d="M15 8l2 0" />
  <path d="M15 12l2 0" />
  <path d="M7 16l10 0" />
</svg>`;
const MEDICAL_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M13 3a1 1 0 0 1 1 1v4.535l3.928 -2.267a1 1 0 0 1 1.366 .366l1 1.732a1 1 0 0 1 -.366 1.366l-3.927 2.268l3.927 2.269a1 1 0 0 1 .366 1.366l-1 1.732a1 1 0 0 1 -1.366 .366l-3.928 -2.269v4.536a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-4.536l-3.928 2.268a1 1 0 0 1 -1.366 -.366l-1 -1.732a1 1 0 0 1 .366 -1.366l3.927 -2.268l-3.927 -2.268a1 1 0 0 1 -.366 -1.366l1 -1.732a1 1 0 0 1 1.366 -.366l3.928 2.267v-4.535a1 1 0 0 1 1 -1h2z" />
</svg>`;
const WALLET_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" />
  <path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" />
</svg>`;
const DIFFICULTY_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
</svg>`;
const HOME_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
  <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
  <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
</svg>`;
const INSTRUCTOR_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M22 9l-10 -4l-10 4l10 4l10 -4v6" />
  <path d="M6 10.6v5.4a6 3 0 0 0 12 0v-5.4" />
</svg>`;
const FREE_SESSIONS_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M15 5l0 2" />
  <path d="M15 11l0 2" />
  <path d="M15 17l0 2" />
  <path d="M5 5h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-3a2 2 0 0 0 0 -4v-3a2 2 0 0 1 2 -2" />
</svg>`;
const DIFFICULT_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
  <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
  <path d="M13.41 10.59l2.59 -2.59" />
  <path d="M7 12a5 5 0 0 1 5 -5" />
</svg>`;
const FILLED_LEGAL_INFO = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
  <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
  <path d="M9 15l2 2l4 -4" />
</svg>`;
const DATE_OF_BIRTH = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M4 5m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
  <path d="M16 3l0 4" />
  <path d="M8 3l0 4" />
  <path d="M4 11l16 0" />
  <path d="M8 15h2v2h-2z" />
</svg>`;
const EMERGENCY_CONTACT = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
  <path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
  <path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5" />
  <path d="M6 10h4m-2 -2v4" />
</svg>`;
const MEDICAL_CONDITIONS = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M3 4m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z" />
  <path d="M7 20h10" />
  <path d="M9 16v4" />
  <path d="M15 16v4" />
  <path d="M7 10h2l2 3l2 -6l1 3h3" />
</svg>`;
const MEDICATION = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M4.5 12.5l8 -8a4.94 4.94 0 0 1 7 7l-8 8a4.94 4.94 0 0 1 -7 -7" />
  <path d="M8.5 8.5l7 7" />
</svg>`;
const FIRST_AID_EXPIRY = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M20.986 12.502a9 9 0 1 0 -5.973 7.98" />
  <path d="M12 7v5l3 3" />
  <path d="M19 16v3" />
  <path d="M19 22v.01" />
</svg>`;
const TROPHY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M480-160q75 0 127.5-52.5T660-340q0-75-52.5-127.5T480-520q-75 0-127.5 52.5T300-340q0 75 52.5 127.5T480-160ZM363-572q20-11 42.5-17.5T451-598L350-800H250l113 228Zm234 0 114-228H610l-85 170 19 38q14 4 27 8.5t26 11.5ZM256-208q-17-29-26.5-62.5T220-340q0-36 9.5-69.5T256-472q-42 14-69 49.5T160-340q0 47 27 82.5t69 49.5Zm448 0q42-14 69-49.5t27-82.5q0-47-27-82.5T704-472q17 29 26.5 62.5T740-340q0 36-9.5 69.5T704-208ZM480-80q-40 0-76.5-11.5T336-123q-9 2-18 2.5t-19 .5q-91 0-155-64T80-339q0-87 58-149t143-69L120-880h280l80 160 80-160h280L680-559q85 8 142.5 70T880-340q0 92-64 156t-156 64q-9 0-18.5-.5T623-123q-31 20-67 31.5T480-80Zm0-260ZM363-572 250-800l113 228Zm234 0 114-228-114 228ZM406-230l28-91-74-53h91l29-96 29 96h91l-74 53 28 91-74-56-74 56Z"/></svg>`;

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

        const perms = await ajaxGet('/api/user/elements/can_manage_users,can_manage_transactions,is_exec').catch(() => ({}));
        const canManageUsers = perms.can_manage_users;
        const canManageTransactions = perms.can_manage_transactions;
        const isExec = perms.is_exec;

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
                renderTab(btn.dataset.tab, user, isPresident, canManageUsers, isExec);
            };
        });

        updateActiveTab(initialTabBtn);
        renderTab(initialTabBtn.dataset.tab, user, isPresident, canManageUsers, isExec);

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
 * @param {boolean} canManageUsers - Whether the user has management permissions.
 * @param {boolean} isExec - Whether the user is an exec.
 */
function renderTab(tabName, user, isPresident, canManageUsers, isExec) {
    const container = document.getElementById('admin-tab-content');
    if (tabName === 'profile') {
        const canManageSwims = canManageUsers || isExec;
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

        // Check if sensitive data is present
        const hasGeneralInfo = user.email !== undefined || user.phone_number !== undefined || user.college_id !== undefined || user.balance !== undefined;

        let generalInfoHtml = '';
        if (hasGeneralInfo) {
            generalInfoHtml = `
                <div class="event-details-section" id="admin-user-general-info-container">
                    <h3>${USER_SVG} General Info</h3>
                    ${user.email !== undefined ? `<p>${EMAIL_SVG} <strong>Email:</strong> ${user.email}</p>` : ''}
                    ${user.phone_number !== undefined ? `<p>${PHONE_SVG} <strong>Phone:</strong> ${user.phone_number || 'N/A'}</p>` : ''}
                    ${user.college_id !== undefined ? `<p>${USER_SVG} <strong>College:</strong> ${user.college_id || 'N/A'}</p>` : ''}
                    ${user.balance !== undefined ? `<p>${WALLET_SVG} <strong>Balance:</strong> £${Number(user.balance).toFixed(2)}</p>` : ''}
                </div>`;
        }

        const hasMembershipInfo = user.is_member !== undefined || user.is_instructor !== undefined || user.free_sessions !== undefined || user.difficulty_level !== undefined || user.swims !== undefined;

        let membershipInfoHtml = '';
        if (hasMembershipInfo) {
            membershipInfoHtml = `
                <div class="event-details-section" id="admin-user-membership-container">
                     <h3>${DIFFICULTY_SVG} Status & Level</h3>
                     ${user.is_member !== undefined ? `<p>${USER_SVG} <strong>Member:</strong> ${user.is_member ? 'Yes' : 'No'}</p>` : ''}
                     ${user.is_instructor !== undefined ? `<p>${INSTRUCTOR_SVG} <strong>Instructor:</strong> ${user.is_instructor ? 'Yes' : 'No'}</p>` : ''}
                     ${user.free_sessions !== undefined ? `<p>${FREE_SESSIONS_SVG} <strong>Free Sessions:</strong> ${user.free_sessions}</p>` : ''}
                     ${user.difficulty_level !== undefined ? `
                     <div class="detail-difficulty-control">
                        <strong>${DIFFICULT_SVG} Difficulty Level:</strong>
                        <input type="number" id="admin-user-difficulty" value="${user.difficulty_level || 1}" min="1" max="5">
                     </div>` : ''}
                     ${user.swims !== undefined ? `
                     <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; margin-left: 0; margin-right: 0;">
                        <span style="display: flex; align-items: center; gap: 0.5rem;">
                            ${TROPHY_SVG} <strong>Swims:</strong> 
                        </span>
                        <span id="admin-user-swims-count">${user.swims || 0}</span>
                        ${canManageSwims ? `<button id="admin-add-swim-btn" class="status-btn" style="margin: 0; padding: 0.2rem 0.6rem;">+1</button>` : ''}
                     </div>` : ''}
                </div>`;
        }

        container.innerHTML = `
            <div class="event-content-split" id="admin-user-profile-container">
                ${generalInfoHtml}
                ${membershipInfoHtml}
                ${permissionsHtml}
            </div>
        `;

        if (canManageSwims) {
            const addSwimBtn = document.getElementById('admin-add-swim-btn');
            if (addSwimBtn) {
                addSwimBtn.onclick = async () => {
                    try {
                        await ajaxPost(`/api/user/${user.id}/swims`, { count: 1 });
                        user.swims = (user.swims || 0) + 1;
                        const countEl = document.getElementById('admin-user-swims-count');
                        if (countEl) countEl.textContent = user.swims;
                        notify('Success', 'Swim added', 'success');
                    } catch (e) {
                        notify('Error', 'Failed to add swim', 'error');
                    }
                };
            }
        }

        const difficultyInput = document.getElementById('admin-user-difficulty');
        if (difficultyInput) {
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
        }

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
                            <td data-label="Date">${formatedDate}</td>
                            <td data-label="Description"><input id="new-tx-desc" type="text" placeholder="Description"></td>
                            <td data-label="Amount"><input id="new-tx-amount" type="number" step="0.01" placeholder="Amount"></td>
                            <td data-label="Balance After" id="new-tx-after">N/A</td>
                            <td data-label="Action"><button id="add-tx-btn">Add</button></td>
                        </tr>
        `;

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            html += '<tr><td colspan="5">No transactions found.</td></tr>';
        } else {
            transactions.forEach(tx => {
                html += `
                    <tr>
                        <td data-label="Date">${new Date(tx.created_at).toLocaleDateString('en-GB')}</td>
                        <td data-label="Description">
                            <span class="tx-desc-text">${tx.description}</span>
                            <input class="tx-desc-input hidden" value="${tx.description}">
                        </td>
                        <td data-label="Amount">
                            <span class="tx-amount-text">£${tx.amount.toFixed(2)}</span>
                            <input type="number" step="0.01" class="tx-amount-input hidden" value="${tx.amount}">
                        </td>
                        <td data-label="Balance After">£${tx.after !== undefined ? tx.after.toFixed(2) : 'N/A'}</td>
                        <td data-label="Action">
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
