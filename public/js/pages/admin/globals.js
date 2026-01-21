import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { adminContentID, renderAdminNavBar } from './common.js';
import { notify } from '/js/components/notification.js';
import { SAVE_SVG } from '../../../images/icons/outline/icons.js';

/**
 * Admin interface for managing system-wide settings.
 * @module AdminGlobals
 */


/**
 * Render globals management tables.
 */
export async function renderManageGlobals() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = /*html*/`
        <div class="form-info">
            <article class="form-box admin-card">
                <div class="admin-controls-container">
                    <div class="admin-nav-row" style="margin-bottom: 1em !important;">
                         ${await renderAdminNavBar('globals')}
                    </div>
                   
                   <div class="table-responsive">
                        <table class="admin-table modern-table">
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
 * Update a global setting.
 * @param {string} key
 * @param {string} value
 * @param {string|null} displayName
 */
async function updateGlobal(key, value, displayName) {
    let parsedValue = isNaN(value) || value.trim() === '' ? value : parseFloat(value);
    const payload = { value: parsedValue };
    let response;
    response = await ajaxPost(`/api/globals/${key}`, payload).then(() => {
        notify("Success", `Updated ${displayName}`, 'success');
    }).catch((e) => {
        notify(`Failed to Update ${displayName}`, e, 'error');
    });
}