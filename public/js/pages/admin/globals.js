//todo refine
/**
 * globals.js
 * 
 * Administrative interface for managing system-wide global variables.
 * Allows "President" level users to modify critical configuration settings
 * such as membership costs, trial session limits, and API keys.
 * 
 * Registered Route: /admin/globals
 */

import { apiRequest } from '/js/utils/api.js';
import { adminContentID, renderAdminNavBar } from './admin.js';
import { notify } from '/js/components/notification.js';
import { UploadWidget } from '/js/widgets/upload/UploadWidget.js';
import { Panel } from '/js/widgets/panel.js';
import { renderLibrary } from '../../widgets/upload/Library.js';
import { SAVE_SVG, IMAGE_SVG, UPLOAD_SVG, CLOSE_SVG } from '../../../images/icons/outline/icons.js';
import { Modal } from '/js/widgets/Modal.js';

let imagePickerModal = null;

/**
 * Main rendering function for the globals management dashboard.
 * Builds the layout table and triggers the initial data fetch.
 */
export async function renderManageGlobals() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    imagePickerModal = new Modal({
        id: 'image-picker-modal',
        title: 'Choose Image',
        content: `
            <div class="image-picker-content">
                <div id="modal-upload-widget" class="mb-2"></div>
                <div id="globals-library-container"></div>
            </div>
        `,
        contentClasses: 'glass-panel'
    });

    adminContent.innerHTML = `
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('globals')}
            </div>
            
            ${Panel({
                content: `
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
                `
            })}
        </div>

        ${imagePickerModal.getHTML()}
    `;

    setupModalListeners();
    await fetchAndRenderGlobals();
}

/**
 * Sets up listeners for the image picker modal.
 */
function setupModalListeners() {
    if (!imagePickerModal) return;

    imagePickerModal.attachListeners();

    // Initialize Upload Widget
    new UploadWidget('modal-upload-widget', {
        mode: 'inline',
        selectMode: 'single',
        autoUpload: true,
        enableLibrary: false,
        onUploadComplete: (fileId) => {
            const url = `/api/files/${fileId}/download?view=true`;
            selectImage(url);
        },
        onUploadError: (err) => {
            notify('Upload failed', err.message, 'error');
        }
    });
}

let activePickerKey = null;

async function selectImage(url) {
    if (!activePickerKey) return;

    const input = document.querySelector(`.global-input[data-key="${activePickerKey}"]`);
    if (input) {
        input.value = url;
        // Update previews
        const previews = document.querySelectorAll(`.image-preview-global[data-key="${activePickerKey}"]`);
        previews.forEach(preview => {
            preview.style.backgroundImage = `url('${url}')`;
            const img = preview.querySelector('img');
            if (img) img.src = url;
        });

        // Auto-save
        const globals = await apiRequest('GET', '/api/globals').then(res => res.res || {});
        const displayName = globals[activePickerKey]?.name || activePickerKey;
        await updateGlobal(activePickerKey, url, displayName);
    }

    if (imagePickerModal) imagePickerModal.close();
}

/**
 * Fetches the list of all global variables and populates the management table.
 * Dynamically generates input types based on the 'type' field from the database.
 */
async function fetchAndRenderGlobals() {
    const tbody = document.getElementById('globals-table-body');
    if (!tbody) return;

    try {
        const globals = await apiRequest('GET', '/api/globals').then(res => res.res || []).catch(() => []);

        if (Object.keys(globals).length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No settings found.</td></tr>';
            return;
        }

        tbody.innerHTML = Object.entries(globals).map(([key, value]) => {
            const displayName = value?.name || key;
            const description = value?.description || '';
            const type = value?.type || "text";

            let valueHtml = '';
            let actionHtml = '';

            if (type === 'image') {
                valueHtml = `
                    <div class="image-global-display">
                        <div class="image-preview-global" data-key="${key}" style="background-image: url('${value?.data || '/images/misc/ducc.png'}')">
                            <img src="${value?.data || '/images/misc/ducc.png'}" class="uncropped-hover-preview">
                        </div>
                        <input type="hidden" class="global-input" data-key="${key}" value="${value?.data}">
                    </div>
                `;
                actionHtml = `<button class="small-btn picker-btn primary" data-key="${key}" title="Change Image">${IMAGE_SVG}</button>`;
            } else {
                valueHtml = `<input type="${type}" class="global-input modern-input" data-key="${key}" value="${value?.data}">`;
                actionHtml = `<button class="save-global-btn icon-btn primary" data-key="${key}" title="Save">${SAVE_SVG}</button>`;
            }

            return `
                    <tr class="global-row" data-key="${key}">
                        <td data-label="Setting" class="primary-text"><strong>${displayName}</strong></td>
                        <td data-label="Description" class="description-cell">${description}</td>
                        <td data-label="Value">${valueHtml}</td>
                        <td data-label="Actions">${actionHtml}</td>
                    </tr>`;
        }).join('');

        // Attach event listeners
        tbody.querySelectorAll('.picker-btn').forEach(btn => {
            btn.onclick = () => {
                activePickerKey = btn.dataset.key;
                if (imagePickerModal) {
                    imagePickerModal.show();
                    const container = document.getElementById('globals-library-container');
                    renderLibrary(container, (url) => selectImage(url));
                }
            };
        });

        // Toggle large preview on click
        tbody.querySelectorAll('.image-preview-global').forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                const wasVisible = el.classList.contains('preview-open');

                // Close all other previews first
                document.querySelectorAll('.image-preview-global.preview-open').forEach(p => p.classList.remove('preview-open'));

                if (!wasVisible) {
                    el.classList.add('preview-open');
                }
            };
        });

        // Global click to close previews
        document.addEventListener('click', () => {
            document.querySelectorAll('.image-preview-global.preview-open').forEach(el => {
                el.classList.remove('preview-open');
            });
        }, { once: false });

        for (const [key] of Object.entries(globals)) {
            const btn = tbody.querySelector(`.save-global-btn[data-key="${key}"]`);
            if (btn) {
                btn.addEventListener('click', async () => {
                    const input = tbody.querySelector(`.global-input[data-key="${key}"]`);
                    const newValue = input.value;
                    const displayName = globals[key]?.name || key;

                    await updateGlobal(key, newValue, displayName);
                });
            }
        }
    } catch (e) {
        console.error(e);
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

    await apiRequest('POST', `/api/globals/${key}`, payload).then(() => {
        notify("Success", `Updated ${displayName}`, 'success');
    }).catch((e) => {
        notify(`Failed to Update ${displayName}`, e, 'error');
    });
}