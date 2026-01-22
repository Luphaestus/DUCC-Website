/**
 * detail.js (Tag)
 * 
 * Logic for the Tag Creator and Editor form.
 * Beyond basic metadata (name, color), this module handles complex "Designated Manager"
 * and "Whitelist Access" logic, allowing admins to scope event management and visibility
 * to specific subsets of users.
 * 
 * Registered Routes: /admin/tag/new, /admin/tag/:id
 */

import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { uploadFile } from '/js/utils/upload.js';
import { adminContentID } from '../common.js';
import { notify, NotificationTypes } from '/js/components/notification.js';
import { ARROW_BACK_IOS_NEW_SVG, CLOSE_SVG, DELETE_SVG, ADD_SVG, PERSON_SVG, LOCAL_ACTIVITY_SVG, SHIELD_SVG, IMAGE_SVG, UPLOAD_SVG } from "../../../../images/icons/outline/icons.js"

/**
 * Main rendering function for the tag editor.
 * 
 * @param {string} id - Database ID of the tag, or 'new'.
 */
export async function renderTagDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    // Set up toolbar
    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = `<button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Tags</button>`;
    document.getElementById('admin-back-btn').onclick = () => switchView('/admin/tags');

    // Fetch user permissions to determine if management sections should be shown
    const userData = await ajaxGet('/api/user/elements/permissions').catch(() => ({}));
    const userPerms = (userData.permissions || []).includes('user.manage');
    
    const isNew = id === 'new';
    let tag = { name: '', color: '#808080', description: '', min_difficulty: '', priority: 0, join_policy: 'open', view_policy: 'open', image_id: null };
    let whitelist = [];
    let managers = [];

    if (!isNew) {
        try {
            // Batch fetch tag metadata and associated user lists
            const tags = (await ajaxGet('/api/tags')).data || [];
            tag = tags.find(t => t.id == id);
            if (!tag) throw new Error('Tag not found');
            
            const [whitelistRes, managersRes] = await Promise.all([
                ajaxGet(`/api/tags/${id}/whitelist`),
                ajaxGet(`/api/tags/${id}/managers`)
            ]);
            
            whitelist = whitelistRes.data || [];
            managers = managersRes.data || [];
        } catch (e) {
            adminContent.innerHTML = '<p>Error loading tag.</p>';
            return;
        }
    }

    const imageUrl = tag.image_id ? `/api/files/${tag.image_id}/download?view=true` : '/images/misc/ducc.png';

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <div class="glass-panel">
                <header class="card-header-flex">
                    <h2>${isNew ? 'Create New Tag' : 'Edit Tag'}</h2>
                    ${!isNew ? `<button type="button" id="delete-tag-btn" class="small-btn delete outline" title="Delete">${DELETE_SVG} Delete</button>` : ''}
                </header>
                
                <!-- Main Metadata Form -->
                <form id="tag-form" class="modern-form">
                    <div class="event-content-split">
                        <div class="event-details-section">
                            <div class="grid-2-col">
                                <label>Name <input type="text" name="name" value="${tag.name}" required placeholder="Tag Name"></label>
                                <label>Color <input type="color" name="color" value="${tag.color}" required class="color-input"></label>
                            </div>
                            
                            <label class="mb-1-5 block">Description <textarea name="description" rows="3">${tag.description || ''}</textarea></label>
                            
                            <div class="grid-2-col">
                                <label>Min Difficulty Requirement <input type="number" name="min_difficulty" value="${tag.min_difficulty ?? ''}" min="1" max="5" placeholder="Optional (1-5)"></label>
                                <label>Priority <input type="number" name="priority" value="${tag.priority || 0}" placeholder="Default 0"></label>
                            </div>

                            <div class="grid-2-col mt-1">
                                <label>Join Policy
                                    <select name="join_policy" class="modern-select">
                                        <option value="open" ${tag.join_policy === 'open' ? 'selected' : ''}>Open</option>
                                        <option value="whitelist" ${tag.join_policy === 'whitelist' ? 'selected' : ''}>Whitelist Only</option>
                                        <option value="role" ${tag.join_policy === 'role' ? 'selected' : ''}>Role Only</option>
                                    </select>
                                </label>
                                <label>View Policy
                                    <select name="view_policy" class="modern-select">
                                        <option value="open" ${tag.view_policy === 'open' ? 'selected' : ''}>Open</option>
                                        <option value="whitelist" ${tag.view_policy === 'whitelist' ? 'selected' : ''}>Whitelist Only</option>
                                        <option value="role" ${tag.view_policy === 'role' ? 'selected' : ''}>Role Only</option>
                                    </select>
                                </label>
                            </div>
                        </div>

                        <!-- Tag Image Section -->
                        <div class="event-image-section">
                            <h3 class="section-header-modern">
                                ${IMAGE_SVG} Default Event Image
                            </h3>
                            <div class="image-upload-container glass-panel" id="drop-zone">
                                <div id="image-preview" class="image-preview" style="--event-image-url: url('${imageUrl}');"></div>
                                <div id="upload-progress-container" class="hidden">
                                    <progress id="upload-progress" value="0" max="100"></progress>
                                    <span id="progress-text">0%</span>
                                </div>
                                <input type="hidden" name="image_id" id="image_id_input" value="${tag.image_id || ''}">
                                <div class="image-actions-row">
                                    <label class="file-upload-btn small-btn primary flex-grow">
                                        ${UPLOAD_SVG} <span>Choose or Drop Image</span>
                                        <input type="file" id="tag-image-file" accept="image/*" style="display:none;">
                                    </label>
                                    ${!isNew ? `<button type="button" id="remove-tag-image-btn" class="small-btn delete outline" title="Remove Image">${CLOSE_SVG} Remove</button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions-footer mt-2 text-right">
                        <button type="submit" class="primary-btn wide-btn">${isNew ? 'Create' : 'Save Changes'}</button>
                    </div>
                </form>

                ${!isNew && userPerms ? `
                    <div class="divider"></div>
                    
                    <!-- Designated Managers Section -->
                    <div class="permission-section">
                        <div class="section-header">
                            <h3>${SHIELD_SVG} Designated Managers</h3>
                            <p class="helper-text">Users allowed to manage (create/edit/read) events with this tag.</p>
                        </div>
                        
                        <form id="managers-form" class="inline-add-form">
                            <input list="managers-datalist" id="managers-user-input" placeholder="Search by name or email..." autocomplete="off">
                            <datalist id="managers-datalist"></datalist>
                            <button type="submit" class="small-btn primary" title="Add Manager">${ADD_SVG}</button>
                        </form>
                        
                        <div class="glass-table-container">
                            <div class="table-responsive">
                                <table class="glass-table">
                                    <thead><tr><th>Name</th><th>Email</th><th class="action-col">Remove</th></tr></thead>
                                    <tbody id="managers-table-body">${renderUserRows(managers, id, 'remove-manager-btn')}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <!-- Whitelist Access Section -->
                    <div class="permission-section">
                        <div class="section-header">
                            <h3>${LOCAL_ACTIVITY_SVG} Whitelist Access</h3>
                            <p class="helper-text">Restricts event visibility/joining to specific users.</p>
                        </div>
                        
                        <form id="whitelist-form" class="inline-add-form">
                            <input list="users-datalist" id="whitelist-user-input" placeholder="Search by name or email..." autocomplete="off">
                            <datalist id="users-datalist"></datalist>
                            <button type="submit" class="small-btn primary" title="Add User">${ADD_SVG}</button>
                        </form>
                        
                        <div class="glass-table-container">
                            <div class="table-responsive">
                                <table class="glass-table">
                                    <thead><tr><th>Name</th><th>Email</th><th class="action-col">Remove</th></tr></thead>
                                    <tbody id="whitelist-table-body">${renderUserRows(whitelist, id, 'remove-whitelist-btn')}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>`;

    // --- Image Upload Logic ---
    const fileInput = document.getElementById('tag-image-file');
    const imagePreview = document.getElementById('image-preview');
    const imageIdInput = document.getElementById('image_id_input');
    const dropZone = document.getElementById('drop-zone');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');

    const handleUpload = async (file) => {
        if (!file) return;
        try {
            progressContainer.classList.remove('hidden');
            const fileId = await uploadFile(file, {
                visibility: 'events',
                title: `Tag Default Image - ${tag.name || 'New Tag'}`,
                onProgress: (percent) => {
                    progressBar.value = percent;
                    progressText.textContent = `${percent}%`;
                }
            });
            setTimeout(() => progressContainer.classList.add('hidden'), 500);
            
            imageIdInput.value = fileId;
            const newUrl = `/api/files/${fileId}/download?view=true`;
            imagePreview.style.setProperty('--event-image-url', `url('${newUrl}')`);
            notify('Success', 'Image uploaded', 'success');
        } catch (err) {
            progressContainer.classList.add('hidden');
            notify('Error', err.message || 'Upload failed', 'error');
        }
    };

    fileInput.onchange = (e) => handleUpload(e.target.files[0]);

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

    // --- Image Action Handlers ---
    if (!isNew) {
        const removeImgBtn = document.getElementById('remove-tag-image-btn');
        if (removeImgBtn) {
            removeImgBtn.onclick = async () => {
                if (!confirm('Remove tag image?')) return;
                try {
                    const res = await fetch(`/api/tags/${id}/reset-image`, { method: 'POST' });
                    if (!res.ok) throw new Error('Failed to reset image');
                    
                    notify('Success', 'Image removed', 'success');
                    imageIdInput.value = '';
                    imagePreview.style.setProperty('--event-image-url', `url('/images/misc/ducc.png')`);
                } catch (err) {
                    notify('Error', err.message, 'error');
                }
            };
        }
    }

    // --- Core Tag Form Submission ---
    document.getElementById('tag-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.min_difficulty = data.min_difficulty === '' ? null : parseInt(data.min_difficulty);
        data.priority = parseInt(data.priority) || 0;
        data.image_id = data.image_id === '' ? null : parseInt(data.image_id);

        try {
            if (isNew) await ajaxPost('/api/tags', data);
            else await ajaxPut(`/api/tags/${id}`, data);
            notify('Success', 'Tag saved', NotificationTypes.SUCCESS);
            switchView(`/admin/tags`);
        } catch (err) {
            notify('Error', 'Save failed', NotificationTypes.ERROR);
        }
    };

    // --- User List Management Logic ---
    if (!isNew) {
        document.getElementById('delete-tag-btn').onclick = async () => {
            if (!confirm('Delete tag?')) return;
            await ajaxDelete(`/api/tags/${id}`);
            notify('Success', 'Tag deleted', NotificationTypes.SUCCESS);
            switchView('/admin/tags');
        };

        if (userPerms) {
            // Load Whitelist Search Datalist (All users)
            ajaxGet('/api/admin/users?limit=1000').then(usersData => {
                const users = usersData.users || [];
                const datalist = document.getElementById('users-datalist');
                if (datalist) datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            }).catch(() => {});

            // Load Managers Search Datalist (Execs only - identified by is_exec virtual permission)
            ajaxGet('/api/admin/users?limit=1000&permissions=perm:is_exec').then(usersData => {
                const users = usersData.users || [];
                const datalist = document.getElementById('managers-datalist');
                if (datalist) datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            }).catch(() => {});

            // Add Manager Handler
            document.getElementById('managers-form').onsubmit = async (e) => {
                e.preventDefault();
                const userId = parseInt(document.getElementById('managers-user-input').value.split(' - ')[0]);
                if (!userId || isNaN(userId)) return notify('Warning', 'Select a valid user', NotificationTypes.WARNING);

                try {
                    await ajaxPost(`/api/tags/${id}/managers`, { userId });
                    notify('Success', 'Manager added', NotificationTypes.SUCCESS);
                    const list = (await ajaxGet(`/api/tags/${id}/managers`)).data || [];
                    document.getElementById('managers-table-body').innerHTML = renderUserRows(list, id, 'remove-manager-btn');
                    document.getElementById('managers-user-input').value = '';
                } catch (err) {
                    notify('Error', 'Add failed', NotificationTypes.ERROR);
                }
            };

            // Add Whitelist User Handler
            document.getElementById('whitelist-form').onsubmit = async (e) => {
                e.preventDefault();
                const userId = parseInt(document.getElementById('whitelist-user-input').value.split(' - ')[0]);
                if (!userId || isNaN(userId)) return notify('Warning', 'Select a valid user', NotificationTypes.WARNING);

                try {
                    await ajaxPost(`/api/tags/${id}/whitelist`, { userId });
                    notify('Success', 'Added to whitelist', NotificationTypes.SUCCESS);
                    const list = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
                    document.getElementById('whitelist-table-body').innerHTML = renderUserRows(list, id, 'remove-whitelist-btn');
                    document.getElementById('whitelist-user-input').value = '';
                } catch (err) {
                    notify('Error', 'Add failed', NotificationTypes.ERROR);
                }
            };
        }
        
        // Initialize removal button listeners
        setupActionButtons(id, 'managers-table-body', 'remove-manager-btn', 'managers');
        setupActionButtons(id, 'whitelist-table-body', 'remove-whitelist-btn', 'whitelist');
    }
}

/**
 * Formats a list of users into table rows for the manager/whitelist tables.
 * 
 * @param {object[]} users 
 * @param {number|string} tagId 
 * @param {string} btnClass 
 * @returns {string} - HTML rows.
 */
function renderUserRows(users, tagId, btnClass) {
    if (!users || users.length === 0) return '<tr><td colspan="3" class="empty-cell">None.</td></tr>';
    return users.map(user => `
        <tr>
            <td data-label="Name" class="primary-text">${user.first_name} ${user.last_name}</td>
            <td data-label="Email">${user.email}</td>
            <td data-label="Action" class="action-cell"><button class="${btnClass} delete-icon-btn outline" data-user-id="${user.id}">${DELETE_SVG}</button></td>
        </tr>
    `).join('');
}

/**
 * Initializes the deletion logic for user association tables.
 * 
 * @param {string|number} tagId 
 * @param {string} tableId 
 * @param {string} btnClass 
 * @param {string} endpoint - API path segment ('managers' or 'whitelist').
 */
function setupActionButtons(tagId, tableId, btnClass, endpoint) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    tbody.onclick = async (e) => {
        const btn = e.target.closest(`.${btnClass}`);
        if (btn) {
            const userId = btn.dataset.userId;
            try {
                await ajaxDelete(`/api/tags/${tagId}/${endpoint}/${userId}`);
                notify('Success', 'User removed', NotificationTypes.SUCCESS);
                // Refresh only the affected table
                const list = (await ajaxGet(`/api/tags/${tagId}/${endpoint}`)).data || [];
                tbody.innerHTML = renderUserRows(list, tagId, btnClass);
            } catch (err) {
                notify('Error', 'Removal failed', NotificationTypes.ERROR);
            }
        }
    }
}
