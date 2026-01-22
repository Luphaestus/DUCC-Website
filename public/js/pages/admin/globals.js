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
import { uploadFile } from '/js/utils/upload.js';
import { SAVE_SVG, IMAGE_SVG, UPLOAD_SVG, CLOSE_SVG } from '../../../images/icons/outline/icons.js';

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

        <dialog id="image-picker-modal" class="modern-modal">
            <article class="modal-content glass-panel max-w-800">
                <button class="modal-close-btn" id="close-image-modal">${CLOSE_SVG}</button>
                <header>
                    <h3>Choose Image</h3>
                </header>
                
                <div class="image-picker-content">
                        <div class="image-upload-container glass-panel mb-2" id="modal-drop-zone">
                            <div id="modal-upload-progress-container" class="hidden">
                                <progress id="modal-upload-progress" value="0" max="100"></progress>
                                <span id="modal-progress-text">0%</span>
                            </div>
                            <div class="image-actions-row">
                                <label class="file-upload-btn small-btn primary flex-grow">
                                    ${UPLOAD_SVG} <span>Choose or Drop Image</span>
                                    <input type="file" id="modal-image-upload" accept="image/*" style="display:none;">
                                </label>
                            </div>
                        </div>

                        <h3 class="section-header-modern small-header">From Library</h3>
                        <div id="image-library-grid" class="image-grid">
                            <p class="loading-cell">Loading images...</p>
                        </div>
                    </div>
                </article>
        </dialog>
    `;

    setupModalListeners();
    await fetchAndRenderGlobals();
}

/**
 * Sets up listeners for the image picker modal.
 */
function setupModalListeners() {
    const modal = document.getElementById('image-picker-modal');
    const closeBtn = document.getElementById('close-image-modal');

    closeBtn.onclick = (e) => {
        e.preventDefault();
        modal.close();
    };

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.close();
        }
    };

    // Handle upload in modal
    const uploadInput = document.getElementById('modal-image-upload');
    const dropZone = document.getElementById('modal-drop-zone');

    const handleUpload = async (file) => {
        if (!file) return;

        const progressContainer = document.getElementById('modal-upload-progress-container');
        const progressBar = document.getElementById('modal-upload-progress');
        const progressText = document.getElementById('modal-progress-text');

        try {
            progressContainer.classList.remove('hidden');
            const fileId = await uploadFile(file, {
                visibility: 'public',
                title: `Global Asset - ${Date.now()}`,
                onProgress: (p) => {
                    progressBar.value = p;
                    progressText.textContent = `${p}%`;
                }
            });
            const url = `/api/files/${fileId}/download?view=true`;
            selectImage(url);
        } catch (err) {
            notify('Upload failed', err.message, 'error');
        } finally {
            progressContainer.classList.add('hidden');
        }
    };

    uploadInput.onchange = (e) => handleUpload(e.target.files[0]);

    // Drag-and-drop listeners
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    };

    dropZone.ondragleave = () => {
        dropZone.classList.remove('drag-over');
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };
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
        const globals = await ajaxGet('/api/globals').then(res => res.res || {});
        const displayName = globals[activePickerKey]?.name || activePickerKey;
        await updateGlobal(activePickerKey, url, displayName);
    }
    document.getElementById('image-picker-modal').close();
}

async function loadLibraryImages() {
    const grid = document.getElementById('image-library-grid');
    try {
        const [filesRes, slidesRes] = await Promise.all([
            ajaxGet('/api/files?limit=50'),
            ajaxGet('/api/slides/images')
        ]);

        const files = (filesRes.data?.files || []).filter(f => f.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i));
        const slides = slidesRes.images || [];

        let html = '';
        
        // Custom slides
        slides.forEach(url => {
            html += `<div class="image-item" onclick="selectImage('${url}')" style="background-image: url('${url}')" title="${url}"></div>`;
        });

        // Uploaded files
        files.forEach(f => {
            const url = `/api/files/${f.id}/download?view=true`;
            html += `<div class="image-item" onclick="selectImage('${url}')" style="background-image: url('${url}')" title="${f.title}"></div>`;
        });

        grid.innerHTML = html || '<p class="empty-cell">No images found.</p>';
        
        // Expose selectImage to global scope for onclick or re-bind
        window.selectImage = selectImage;

    } catch (e) {
        grid.innerHTML = '<p class="error-cell">Failed to load library.</p>';
    }
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
                const modal = document.getElementById('image-picker-modal');
                modal.showModal();
                loadLibraryImages();
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
    
    await ajaxPost(`/api/globals/${key}`, payload).then(() => {
        notify("Success", `Updated ${displayName}`, 'success');
    }).catch((e) => {
        notify(`Failed to Update ${displayName}`, e, 'error');
    });
}