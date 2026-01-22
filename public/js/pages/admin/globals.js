/**
 * globals.js
 * 
 * Administrative interface for managing system-wide global variables.
 * Allows "President" level users to modify critical configuration settings
 * such as membership costs, trial session limits, and API keys.
 * 
 * Registered Route: /admin/globals
 */

import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { adminContentID, renderAdminNavBar } from './common.js';
import { notify } from '/js/components/notification.js';
import { SAVE_SVG } from '../../../images/icons/outline/icons.js';

/**
 * Main rendering function for the globals management dashboard.
 * Builds the layout table and triggers the initial data fetch.
 */
export async function renderManageGlobals() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('globals')}
            </div>
            
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table">
                        <thead>
                            <tr>
                                <th>Setting</th>
                                <th>Description</th>
                                <th>Value</th>
                                <th class="action-col">Action</th>
                            </tr>
                        </thead>
                        <tbody id="globals-table-body">
                            <tr><td colspan="4" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    await fetchAndRenderGlobals();
}

/**
 * Fetches the list of all global variables and populates the management table.
 * Dynamically generates input types based on the 'type' field from the database.
 */
async function fetchAndRenderGlobals() {
    const tbody = document.getElementById('globals-table-body');
    if (!tbody) return;

    try {
        const globals = await ajaxGet('/api/globals').then(res => res.res || []).catch(() => []);

        if (Object.keys(globals).length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No settings found.</td></tr>';
            return;
        }

        tbody.innerHTML = Object.entries(globals).map(([key, value]) => {
            const displayName = value?.name || key;
            const description = value?.description || '';
            const type = value?.type || "text";

            let inputHtml = `<input type="${type}" class="global-input modern-input" data-key="${key}" value="${value?.data}">`;

            return `
                    <tr class="global-row" data-key="${key}">
                        <td data-label="Setting" class="primary-text"><strong>${displayName}</strong></td>
                        <td data-label="Description" class="description-cell">${description}</td>
                        <td data-label="Value">${inputHtml}</td>
                        <td data-label="Actions"><button class="save-global-btn icon-btn primary" data-key="${key}" title="Save">${SAVE_SVG}</button></td>
                    </tr>`;
        }).join('');

        // Attach event listeners to all save buttons
        for (const [key] of Object.entries(globals)) {
            const btn = tbody.querySelector(`.save-global-btn[data-key="${key}"]`);
            btn.addEventListener('click', async () => {
                const input = tbody.querySelector(`.global-input[data-key="${key}"]`);
                const newValue = input.value;
                const displayName = globals[key]?.name || key;

                await updateGlobal(key, newValue, displayName);
            });
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" class="error-cell">Error loading globals.</td></tr>';
    }
}

/**
 * Sends a POST request to update a specific global variable.
 * Handles type parsing (converting strings to floats where appropriate).
 * 
 * @param {string} key - The internal slug of the setting.
 * @param {string} value - The new value from the input field.
 * @param {string|null} displayName - Friendly name for notifications.
 */
async function updateGlobal(key, value, displayName) {
    let parsedValue = isNaN(value) || value.trim() === '' ? value : parseFloat(value);
    const payload = { value: parsedValue };
    
    await ajaxPost(`/api/globals/${key}`, payload).then(() => {
        notify("Success", `Updated ${displayName}`, 'success');
    }).catch((e) => {
        notify(`Failed to Update ${displayName}`, e, 'error');
    });
}