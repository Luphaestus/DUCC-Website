import { ajaxGet, ajaxPost } from '../misc/ajax.js';
import { adminContentID, renderAdminNavBar } from './common.js';
import { notify } from '../misc/notification.js';

/**
 * Globals Management Module (Admin).
 * Provides a table-based interface for the President to view and modify 
 * system-wide settings like membership costs and minimum balance requirements.
 */

// --- Constants ---

/**
 * Metadata for global configuration keys.
 * Used to provide human-readable names and descriptions in the admin UI.
 */
const ELEMENTS = {
    Unauthorized_max_difficulty: { name: "Unauthorized Max Difficulty", desc: "Maximum event difficulty level a logged-out user can view.", type: "number" },
    MinMoney: { name: "Minimum Money Balance", desc: "Minimum balance a user can have before being restricted from event sign-ups.", type: "number" },
    MembershipCost: { name: "Membership Cost", desc: "Cost for annual membership.", type: "number" },
    President: { name: "President", desc: "You :D", type: "number" },
}


/**
 * Renders the main globals management table.
 * Includes conditional logic for the "President" dropdown.
 */
export async function renderManageGlobals() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = `
        <div class="form-info">
            <article class="form-box">
                <div class="admin-controls-bar">
                    ${await renderAdminNavBar('globals')}
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
 * Fetches current global values and a list of all users from the API.
 * Populates the table rows with appropriate inputs (number fields or user selects).
 */
async function fetchAndRenderGlobals() {
    const tbody = document.getElementById('globals-table-body');
    if (!tbody) return;

    try {
        // Fetch globals and user list in parallel
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

        // Generate table rows
        tbody.innerHTML = Object.entries(globals).map(([key, value]) => {
            const displayName = ELEMENTS[key] ? ELEMENTS[key].name : key;
            const description = ELEMENTS[key] ? ELEMENTS[key].desc : '';
            const type = ELEMENTS[key] ? ELEMENTS[key].type : "text";

            let inputHtml = '';
            // The President setting uses a searchable user dropdown
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

        // Bind event listeners to Save buttons
        for (const [key, value] of Object.entries(globals)) {
            const btn = tbody.querySelector(`.save-global-btn[data-key="${key}"]`);
            btn.addEventListener('click', async () => {
                const input = tbody.querySelector(`.global-input[data-key="${key}"]`);
                const newValue = input.value;

                // Validation for max difficulty range
                if (key === 'Unauthorized_max_difficulty') {
                    const val = parseInt(newValue);
                    if (isNaN(val) || val < 1 || val > 5) {
                        notify("Input error", "Max Difficulty must be between 1 and 5", 'error');
                        return;
                    }
                }

                // Security check for transferring Presidency
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
 * Sends an update request for a single global key.
 * @param {string} key - Configuration key.
 * @param {string} value - New value (parsed to float if numeric).
 * @param {string|null} password - Required only for changing the President.
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
 * Custom Promise-based modal for password confirmation.
 * @param {string} message - Text to display in the modal.
 * @returns {Promise<string|null>} Resolves with the password or null if cancelled.
 */
function showPrompt(message) {
    return new Promise((resolve) => {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'custom-modal-overlay';

        modalOverlay.innerHTML = `
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

        // Simple enter-animation
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

        // Keyboard shortcuts
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') handleCancel();
        });

        // Close on backdrop click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) handleCancel();
        });
    });
}
