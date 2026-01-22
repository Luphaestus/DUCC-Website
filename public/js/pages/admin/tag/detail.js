import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../common.js';
import { notify, NotificationTypes } from '/js/components/notification.js';
import { ARROW_BACK_IOS_NEW_SVG, CLOSE_SVG, DELETE_SVG, ADD_SVG, PERSON_SVG, LOCAL_ACTIVITY_SVG, SHIELD_SVG, UPLOAD_SVG, IMAGE_SVG } from "../../../../images/icons/outline/icons.js"

/**
 * Admin tag creation and editing form.
 * @module AdminTagDetail
 */

/**
 * Render tag detail/editor form.
 * @param {string} id
 */
export async function renderTagDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = `<button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Tags</button>`;
    document.getElementById('admin-back-btn').onclick = () => switchView('/admin/tags');

    const userData = await ajaxGet('/api/user/elements/permissions').catch(() => ({}));
    const userPerms = (userData.permissions || []).includes('user.manage');
    const isNew = id === 'new';
    let tag = { name: '', color: '#808080', description: '', min_difficulty: '', image_url: '' };
    let whitelist = [];
    let managers = [];

    if (!isNew) {
        try {
            const tags = (await ajaxGet('/api/tags')).data || [];
            tag = tags.find(t => t.id == id);
            if (!tag) throw new Error('Tag not found');
            whitelist = (await ajaxGet(`/api/tags/${id}/whitelist`)).data || [];
            managers = (await ajaxGet(`/api/tags/${id}/managers`)).data || [];
        } catch (e) {
            adminContent.innerHTML = '<p>Error loading tag.</p>';
            return;
        }
    }

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <div class="glass-panel">
                <header class="card-header-flex">
                    <h2>${isNew ? 'Create New Tag' : 'Edit Tag'}</h2>
                    ${!isNew ? `<button type="button" id="delete-tag-btn" class="small-btn delete outline" title="Delete">${DELETE_SVG} Delete</button>` : ''}
                </header>
                
                <form id="tag-form" class="modern-form">
                    <div class="grid-2-col">
                        <label>Name <input type="text" name="name" value="${tag.name}" required placeholder="Tag Name"></label>
                        <label>Color <input type="color" name="color" value="${tag.color}" required class="color-input"></label>
                    </div>
                    
                    <label class="mb-1-5 block">Description <textarea name="description" rows="3">${tag.description || ''}</textarea></label>
                    
                    <div class="tag-content-split mt-1">
                        <div class="tag-details-section">
                             <label>Min Difficulty Requirement <input type="number" name="min_difficulty" value="${tag.min_difficulty ?? ''}" min="1" max="5" placeholder="Optional (1-5)"></label>
                        </div>

                        <div class="tag-image-section">
                            <h3 class="section-header-modern">
                                ${IMAGE_SVG} Tag Image (Fallback for Events)
                            </h3>
                            <div class="image-upload-container glass-panel" id="drop-zone">
                                <div id="image-preview" class="image-preview" style="--event-image-url: url('${tag.image_url || '/images/misc/tag_placeholder.png'}'); height: 120px;"></div>
                                <div id="upload-progress-container" class="hidden">
                                    <progress id="upload-progress" value="0" max="100"></progress>
                                    <span id="progress-text">0%</span>
                                </div>
                                <input type="hidden" name="image_url" id="image_url_input" value="${tag.image_url || ''}">
                                <label class="file-upload-btn small-btn primary">
                                    ${UPLOAD_SVG} <span>Choose or Drop Image</span>
                                    <input type="file" id="tag-image-file" accept="image/*" style="display:none;">
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions-footer mt-2 text-right">
                        <button type="submit" class="primary-btn wide-btn">${isNew ? 'Create' : 'Save Changes'}</button>
                    </div>
                </form>

                ${!isNew && userPerms ? `
                    <div class="divider"></div>
                    
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

    // Image Upload Handling
    const fileInput = document.getElementById('tag-image-file');
    const imagePreview = document.getElementById('image-preview');
    const imageUrlInput = document.getElementById('image_url_input');
    const dropZone = document.getElementById('drop-zone');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');

    const uploadFile = async (file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('files', file);
        formData.append('visibility', 'public');
        formData.append('title', `Tag Image - ${Date.now()}`);

        try {
            progressContainer.classList.remove('hidden');
            progressBar.value = 0;
            progressText.textContent = '0%';

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/files', true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressBar.value = percent;
                    progressText.textContent = `${percent}%`;
                }
            };

            xhr.onload = () => {
                setTimeout(() => progressContainer.classList.add('hidden'), 500);
                if (xhr.status === 201) {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success && result.ids.length > 0) {
                        const fileId = result.ids[0];
                        const newUrl = `/api/files/${fileId}/download?view=true`;
                        imageUrlInput.value = newUrl;
                        imagePreview.style.setProperty('--event-image-url', `url('${newUrl}')`);
                        notify('Success', 'Image uploaded', NotificationTypes.SUCCESS);
                    } else {
                        notify('Error', 'Upload succeeded but no ID returned', NotificationTypes.ERROR);
                    }
                } else {
                    notify('Error', 'Upload failed: ' + xhr.status, NotificationTypes.ERROR);
                }
            };

            xhr.onerror = () => {
                progressContainer.classList.add('hidden');
                notify('Error', 'Network error during upload', NotificationTypes.ERROR);
            };

            xhr.send(formData);
        } catch (err) {
            progressContainer.classList.add('hidden');
            notify('Error', 'Failed to upload image', NotificationTypes.ERROR);
        }
    };

    fileInput.onchange = (e) => uploadFile(e.target.files[0]);

    if (dropZone) {
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
                uploadFile(e.dataTransfer.files[0]);
            }
        };
    }

    document.getElementById('tag-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if (data.min_difficulty === '') delete data.min_difficulty;
        else data.min_difficulty = parseInt(data.min_difficulty);

        try {
            if (isNew) await ajaxPost('/api/tags', data);
            else await ajaxPut(`/api/tags/${id}`, data);
            notify('Success', 'Tag saved', NotificationTypes.SUCCESS);
            switchView(`/admin/tags`);
        } catch (err) {
            console.error(err);
            notify('Error', 'Save failed', NotificationTypes.ERROR);
        }
    };

    if (!isNew) {
        document.getElementById('delete-tag-btn').onclick = async () => {
            if (!confirm('Delete tag?')) return;
            await ajaxDelete(`/api/tags/${id}`);
            notify('Success', 'Tag deleted', NotificationTypes.SUCCESS);
            switchView('/admin/tags');
        };

        if (userPerms) {
            // Load Whitelist Users (All)
            ajaxGet('/api/admin/users?limit=1000').then(usersData => {
                const users = usersData.users || [];
                const datalist = document.getElementById('users-datalist');
                if (datalist) datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            }).catch(() => {});

            // Load Managers (Execs Only)
            ajaxGet('/api/admin/users?limit=1000&permissions=perm:is_exec').then(usersData => {
                const users = usersData.users || [];
                const datalist = document.getElementById('managers-datalist');
                if (datalist) datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            }).catch(() => {});

            // Managers Form
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

            // Whitelist Form
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
        setupActionButtons(id, 'managers-table-body', 'remove-manager-btn', 'managers');
        setupActionButtons(id, 'whitelist-table-body', 'remove-whitelist-btn', 'whitelist');
    }
}

/**
 * Format table rows for users (managers or whitelist).
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
 * Initialize action buttons (remove manager or whitelist).
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
                const list = (await ajaxGet(`/api/tags/${tagId}/${endpoint}`)).data || [];
                tbody.innerHTML = renderUserRows(list, tagId, btnClass);
            } catch (err) {
                notify('Error', 'Removal failed', NotificationTypes.ERROR);
            }
        }
    }
}