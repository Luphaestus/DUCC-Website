import { ajaxGet, ajaxPost } from '../misc/ajax.js';
import { adminContentID } from './common.js';
import { notify } from '../misc/notification.js';

// constants

const ELEMENTS = {
    Unauthorized_max_difficulty: { name: "Unauthorized Max Difficulty", desc: "Maximum event difficulty level a logged-out user can view.", type: "number" },
    MinMoney: { name: "Minimum Money Balance", desc: "Minimum balance a user can have before being restricted from event sign-ups.", type: "number" },
    MembershipCost: { name: "Membership Cost", desc: "Cost for annual membership.", type: "number" },
    President: { name: "President", desc: "You :D", type: "number" },
}


/**
 * Renders the globals management interface.
 */
export async function renderManageGlobals() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const perms = await ajaxGet('/api/user/elements/can_manage_users,can_manage_events,can_manage_transactions').catch(() => ({}));

    adminContent.innerHTML = `
        <div class="form-info">
            <article class="form-box">
                <div class="admin-controls-bar">
                    <div class="admin-nav-group">
                        ${(perms.can_manage_users || perms.can_manage_transactions) ? `<button onclick="switchView('/admin/users')">Users</button>` : ''}
                        ${perms.can_manage_events ? `<button onclick="switchView('/admin/events')">Events</button>` : ''}
                        ${(await ajaxGet('/api/globals/status')).isPresident ? `<button onclick="switchView('/admin/globals')" disabled>Globals</button>` : ''}
                    </div>
                </div>
                <div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Description</th>
                                <th>Value</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="globals-table-body">
                            <tr><td colspan="4">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </article>
        </div>
    `;

    await fetchAndRenderGlobals();
}

/**
 * Fetches global settings and renders them into the table.
 */
async function fetchAndRenderGlobals() {
    const tbody = document.getElementById('globals-table-body');
    if (!tbody) return;

    try {
        const [globalsResponse, usersResponse] = await Promise.all([
            ajaxGet('/api/globals'),
            ajaxGet('/api/globals/users')
        ]);
        const globals = globalsResponse.res;
        const users = usersResponse.users || [];

        if (!globals || Object.keys(globals).length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No global settings found.</td></tr>';
            return;
        }

        tbody.innerHTML = Object.entries(globals).map(([key, value]) => {
            const displayName = ELEMENTS[key] ? ELEMENTS[key].name : key;
            const description = ELEMENTS[key] ? ELEMENTS[key].desc : '';
            const type = ELEMENTS[key] ? ELEMENTS[key].type : "text";

            let inputHtml = '';
            if (key === 'President') {
                inputHtml = `<select class="global-input" data-key="${key}">`;
                users.filter(user => user.id !== globals.President).forEach(user => {
                    inputHtml += `<option value="${user.id}" ${user.id == value ? 'selected' : ''}>${user.first_name} ${user.last_name}</option>`;
                });
                inputHtml += `</select>`;
            } else {
                inputHtml = `<input type="${type}" class="global-input" data-key="${key}" value="${value}">`;
            }

            return `
            <tr class="global-row" data-key="${key}">
                <td>${displayName}</td>
                <td>${description}</td>
                <td>
                    ${inputHtml}
                </td>
                <td>
                    <button class="save-global-btn" data-key="${key}">Save</button>
                </td>
            </tr>`;
        }).join('');

        for (const [key, value] of Object.entries(globals)) {
            const btn = tbody.querySelector(`.save-global-btn[data-key="${key}"]`);
            btn.addEventListener('click', async () => {
                const input = tbody.querySelector(`.global-input[data-key="${key}"]`);
                const newValue = input.value;

                if (key === 'Unauthorized_max_difficulty') {
                    const val = parseInt(newValue);
                    if (isNaN(val) || val < 1 || val > 5) {
                        notify("Input error", "Max Difficulty must be between 1 and 5", 'error');
                        return;
                    }
                }

                let password = null;
                if (key === 'President') {
                    password = await showPrompt("Please confirm your password to change the President:");
                    if (!password) {
                        notify("Action Required", "Password required to change President", 'warning');
                        return;
                    }
                }

                await updateGlobal(key, newValue, password);
            });
        }

    } catch (e) {
        console.error("Error fetching globals", e);
        tbody.innerHTML = '<tr><td colspan="3">Error loading globals.</td></tr>';
    }
}

/**
 * Updates a single global setting.
 * @param {string} key - The key to update.
 * @param {string} value - The new value.
 * @param {string|null} password - Optional password for sensitive updates.
 */
async function updateGlobal(key, value, password = null) {
    let parsedValue = value;
    if (!isNaN(value) && value.trim() !== '') {
        parsedValue = parseFloat(value);
    }

    const payload = { value: parsedValue };
    if (password) {
        payload.password = password;
    }

    try {
        await ajaxPost(`/api/globals/${key}`, payload);
        notify("Updated", `Updated ${key} successfully`, 'success');
    } catch (e) {
        console.error(`Error updating ${key}`, e);
        const msg = e.message || e;
        notify("Error", `Failed to update ${key}: ${msg}`, 'error');
    }
}

/**
 * Shows a custom glassy prompt modal.
 * @param {string} message - The message to display.
 * @returns {Promise<string|null>} Resolves with the input string or null if cancelled.
 */
function showPrompt(message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = `s
            <div class="custom-modal-content">
                <h3>Confirm Action</h3>
                <p>${message}</p>
                <input type="password" id="prompt-input" placeholder="Enter password" autocomplete="off">
                <div class="modal-actions">
                    <button class="btn-cancel" id="prompt-cancel">Cancel</button>
                    <button class="btn-confirm" id="prompt-confirm">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        requestAnimationFrame(() => {
            modalOverlay.classList.add('visible');
        });

        const input = modalOverlay.querySelector('#prompt-input');
        const confirmBtn = modalOverlay.querySelector('#prompt-confirm');
        const cancelBtn = modalOverlay.querySelector('#prompt-cancel');

        input.focus();

        const cleanup = () => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => {
                if (document.body.contains(modalOverlay)) {
                    document.body.removeChild(modalOverlay);
                }
            }, 300);
        };

        const handleConfirm = () => {
            const value = input.value;
            cleanup();
            resolve(value);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') handleCancel();
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) handleCancel();
        });
    });
}
