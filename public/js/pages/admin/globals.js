import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { adminContentID, renderAdminNavBar } from './common.js';
import { notify } from '/js/components/notification.js';

/**
 * Admin interface for managing system-wide settings.
 * @module AdminGlobals
 */

/**
 * Metadata for human-readable global settings.
 */
const ELEMENTS = {
    Unauthorized_max_difficulty: { name: "Unauthorized Max Difficulty", desc: "Maximum difficulty level visible to guests.", type: "number" },
    MinMoney: { name: "Minimum Balance", desc: "Debt limit before signup restriction.", type: "number" },
    MembershipCost: { name: "Membership Cost", desc: "Annual membership fee.", type: "number" },
    President: { name: "President", desc: "Current system president.", type: "number" },
}

/**
 * Render globals management table.
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
 * Fetch and render global settings.
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
            tbody.innerHTML = '<tr><td colspan="4">No settings found.</td></tr>';
            return;
        }

        tbody.innerHTML = Object.entries(globals).map(([key, value]) => {
            const displayName = ELEMENTS[key]?.name || key;
            const description = ELEMENTS[key]?.desc || '';
            const type = ELEMENTS[key]?.type || "text";

            let inputHtml = '';
            if (key === 'President') {
                inputHtml = `<select class="global-input" data-key="${key}">`;
                users.forEach(user => {
                    inputHtml += `<option value="${user.id}" ${user.id == value ? 'selected' : ''}>${user.first_name} ${user.last_name}</option>`;
                });
                inputHtml += `</select>`;
            } else {
                inputHtml = `<input type="${type}" class="global-input" data-key="${key}" value="${value}">`;
            }

            return `
            <tr class="global-row" data-key="${key}">
                <td data-label="Key">${displayName}</td>
                <td data-label="Description">${description}</td>
                <td data-label="Value">${inputHtml}</td>
                <td data-label="Actions"><button class="save-global-btn" data-key="${key}">Save</button></td>
            </tr>`;
        }).join('');

        for (const [key] of Object.entries(globals)) {
            const btn = tbody.querySelector(`.save-global-btn[data-key="${key}"]`);
            btn.addEventListener('click', async () => {
                const input = tbody.querySelector(`.global-input[data-key="${key}"]`);
                const newValue = input.value;

                if (key === 'Unauthorized_max_difficulty') {
                    const val = parseInt(newValue);
                    if (isNaN(val) || val < 1 || val > 5) {
                        notify("Error", "Range must be 1-5", 'error');
                        return;
                    }
                }

                let password = null;
                if (key === 'President') {
                    password = await showPrompt("Confirm your password to transfer Presidency:");
                    if (!password) {
                        notify("Warning", "Password required", 'warning');
                        return;
                    }
                }

                await updateGlobal(key, newValue, password);
            });
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="3">Error loading globals.</td></tr>';
    }
}

/**
 * Update a global setting.
 * @param {string} key
 * @param {string} value
 * @param {string|null} password
 */
async function updateGlobal(key, value, password = null) {
    let parsedValue = isNaN(value) || value.trim() === '' ? value : parseFloat(value);
    const payload = { value: parsedValue };
    if (password) payload.password = password;

    try {
        await ajaxPost(`/api/globals/${key}`, payload);
        notify("Success", `Updated ${key}`, 'success');
    } catch (e) {
        notify("Error", `Failed to update ${key}`, 'error');
    }
}

/**
 * Show password confirmation prompt.
 * @param {string} message
 * @returns {Promise<string|null>}
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
        requestAnimationFrame(() => modalOverlay.classList.add('visible'));

        const input = modalOverlay.querySelector('#prompt-input');
        input.focus();

        const cleanup = () => {
            modalOverlay.classList.remove('visible');
            setTimeout(() => { if (document.body.contains(modalOverlay)) document.body.removeChild(modalOverlay); }, 300);
        };

        const handleConfirm = () => { const val = input.value; cleanup(); resolve(val); };
        const handleCancel = () => { cleanup(); resolve(null); };

        modalOverlay.querySelector('#prompt-confirm').onclick = handleConfirm;
        modalOverlay.querySelector('#prompt-cancel').onclick = handleCancel;
        input.onkeydown = (e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleCancel(); };
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) handleCancel(); };
    });
}