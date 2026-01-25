/**
 * detail.js (Tag)
 * 
 * Logic for the Tag Creator and Editor form.
 * 
 * Registered Routes: /admin/tag/new, /admin/tag/:id
 */

import { apiRequest } from '/js/utils/api.js';
import { switchView } from '/js/utils/view.js';
import { UploadWidget } from '/js/widgets/upload/UploadWidget.js';
import { adminContentID } from '../admin.js';
import { Panel } from '/js/widgets/panel.js';
import { notify, NotificationTypes } from '/js/components/notification.js';
import { ARROW_BACK_IOS_NEW_SVG, CLOSE_SVG, DELETE_SVG, ADD_SVG, PERSON_SVG, LOCAL_ACTIVITY_SVG, SHIELD_SVG, IMAGE_SVG, UPLOAD_SVG } from "../../../../images/icons/outline/icons.js"
import { showConfirmModal } from '/js/utils/modal.js';
import { debounce } from '/js/utils/utils.js';

/**
 * Main rendering function for the tag editor.
 * 
 * @param {string} id - Database ID of the tag, or 'new'.
 */
export async function renderTagDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = `<button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Tags</button>`;
    document.getElementById('admin-back-btn').onclick = () => switchView('/admin/tags');

    const userData = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({}));
    const userPerms = (userData.permissions || []).includes('user.manage');

    const isNew = id === 'new';
    let tag = { name: '', color: '#808080', description: '', min_difficulty: '', priority: 0, join_policy: 'open', view_policy: 'open', image_id: null };
    let whitelist = [];
    let managers = [];

    if (!isNew) {
        try {
            const tags = (await apiRequest('GET', '/api/tags')).data || [];
            tag = tags.find(t => t.id == id);
            if (!tag) throw new Error('Tag not found');

            const [whitelistRes, managersRes] = await Promise.all([
                apiRequest('GET', `/api/tags/${id}/whitelist`),
                apiRequest('GET', `/api/tags/${id}/managers`)
            ]);

            whitelist = whitelistRes.data || [];
            managers = managersRes.data || [];
        } catch (e) {
            adminContent.innerHTML = '<p>Error loading tag.</p>';
            return;
        }
    }

    const globalDefaultRes = await apiRequest('GET', '/api/globals/DefaultEventImage');
    const globalDefaultUrl = globalDefaultRes.res?.DefaultEventImage?.data || '/images/misc/ducc.png';

    const imageUrl = tag.image_id ? `/api/files/${tag.image_id}/download?view=true` : globalDefaultUrl;

    adminContent.innerHTML = `
        <div class="glass-layout">
            ${Panel({
        title: isNew ? 'Create New Tag' : 'Edit Tag',
        action: !isNew ? `<button type="button" id="delete-tag-btn" class="small-btn delete outline" title="Delete">${DELETE_SVG} Delete</button>` : '',
        content: `
                    <!-- Main Metadata Form -->
                    <form id="tag-form" class="modern-form">
                        <div class="event-content-split">
                            <div class="event-details-section">
                                <div class="grid-2-col">
                                    <label>Name <input type="text" name="name" value="${tag.name}" required placeholder="Tag Name"></label>
                                    <label>Color <input type="color" name="color" value="${tag.color}" required class="color-input"></label>
                                </div>
                                
                                <label>Description <textarea name="description" rows="3">${tag.description || ''}</textarea></label>
                                
                                <div class="grid-2-col">
                                    <label>Min Difficulty Requirement <input type="number" name="min_difficulty" value="${tag.min_difficulty ?? ''}" min="1" max="5" placeholder="Optional (1-5)"></label>
                                    <label>Priority <input type="number" name="priority" value="${tag.priority || 0}" placeholder="Default 0"></label>
                                </div>

                                <div class="grid-2-col">
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
                                <div id="upload-widget-container"></div>
                                <input type="hidden" name="image_id" id="image_id_input" value="${tag.image_id || ''}">
                            </div>
                        </div>                    
                        <div class="form-actions-footer ${!isNew ? 'hidden' : ''}">
                            <button type="submit" class="wide-btn">${isNew ? 'Create' : 'Save Changes'}</button>
                        </div>
                    </form>
                `
    })}

            ${!isNew && userPerms ? `
                <div class="divider"></div>
                
                <div class="dual-grid">
                    <!-- Designated Managers Section -->
                    ${Panel({
        title: 'Designated Managers',
        icon: SHIELD_SVG,
        content: `
                                    <div class="permission-section">
                                        <p class="helper-text">Users allowed to manage (create/edit/read) events with this tag.</p>
                                        
                                        <form id="managers-form" class="inline-add-form">
                                            <input list="managers-datalist" id="managers-user-input" placeholder="Search by name or email..." autocomplete="off">
                                            <datalist id="managers-datalist"></datalist>
                                            <button type="submit" class="small-btn" title="Add Manager">${ADD_SVG}</button>
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
                        `
    })}

                    <!-- Whitelist Access Section -->
                    ${Panel({
        title: 'Whitelist Access',
        icon: LOCAL_ACTIVITY_SVG,
        content: `
                                    <div class="permission-section">
                                        <p class="helper-text">Restricts event visibility/joining to specific users.</p>
                                        
                                        <form id="whitelist-form" class="inline-add-form">
                                            <input list="users-datalist" id="whitelist-user-input" placeholder="Search by name or email..." autocomplete="off">
                                            <datalist id="users-datalist"></datalist>
                                            <button type="submit" class="small-btn" title="Add User">${ADD_SVG}</button>
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
                        `
    })}
                </div>
            ` : ''}
        </div>
    `;

    // --- Image Upload Widget ---
    const imageIdInput = document.getElementById('image_id_input');

    const widget = new UploadWidget('upload-widget-container', {
        mode: 'inline',
        selectMode: 'single',
        autoUpload: true,
        defaultPreview: imageUrl,
        onImageSelect: ({ url, id }) => {
            if (!id && !url.includes('/api/files')) {
                notify('Warning', 'Tags currently only support uploaded library files, not slides.', NotificationTypes.WARNING);
                widget.reset();
                return;
            }
            imageIdInput.value = id || '';
            notify('Success', 'Image updated', 'success');
            if (!isNew) autoSave();
        },
        onRemove: async () => {
            if (isNew) {
                imageIdInput.value = '';
                return true;
            }
            if (!await showConfirmModal('Remove Image', 'Remove tag image?')) return false;
            try {
                const res = await apiRequest('POST', `/api/tags/${id}/reset-image`);
                if (!res.ok) throw new Error('Failed to reset image');

                notify('Success', 'Image removed', 'success');
                imageIdInput.value = '';
                widget.setPreview(globalDefaultUrl);
                return false;
            } catch (err) {
                notify('Error', err.message, 'error');
                return false;
            }
        },
        onUploadError: (err) => {
            notify('Error', err.message || 'Upload failed', 'error');
        }
    });

    const getFormData = () => {
        const formData = new FormData(document.getElementById('tag-form'));
        const data = Object.fromEntries(formData.entries());
        data.min_difficulty = data.min_difficulty === '' ? null : parseInt(data.min_difficulty);
        data.priority = parseInt(data.priority) || 0;
        data.image_id = data.image_id === '' ? null : parseInt(data.image_id);
        return data;
    }

    const autoSave = async () => {
        if (isNew) return;
        const data = getFormData();
        try {
            await apiRequest('PUT', `/api/tags/${id}`, data);
        } catch (err) {
            notify('Auto-save failed', err.message, NotificationTypes.ERROR);
        }
    };

    const debouncedAutoSave = debounce(autoSave, 1000);

    if (!isNew) {
        const form = document.getElementById('tag-form');
        form.querySelectorAll('input, textarea, select').forEach(input => {
            if (input.type === 'text' || input.tagName === 'TEXTAREA' || input.type === 'number') {
                input.addEventListener('input', debouncedAutoSave);
            } else {
                input.addEventListener('change', autoSave);
            }
        });
    }

    // --- Core Tag Form Submission ---
    document.getElementById('tag-form').onsubmit = async (e) => {
        e.preventDefault();
        if (!isNew) return;

        const data = getFormData();

        try {
            if (isNew) {
                await apiRequest('POST', '/api/tags', data);
                notify('Success', 'Tag saved', NotificationTypes.SUCCESS);
                switchView(`/admin/tags`);
            }
        } catch (err) {
            notify('Error', 'Save failed', NotificationTypes.ERROR);
        }
    };

    // --- User List Management Logic ---
    if (!isNew) {
        const deleteBtn = document.getElementById('delete-tag-btn');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                if (!await showConfirmModal('Delete Tag', 'Delete tag?')) return;
                await apiRequest('DELETE', `/api/tags/${id}`);
                notify('Success', 'Tag deleted', NotificationTypes.SUCCESS);
                switchView('/admin/tags');
            };
        }

        if (userPerms) {
            apiRequest('GET', '/api/admin/users?limit=1000').then(usersData => {
                const users = usersData.users || [];
                const datalist = document.getElementById('users-datalist');
                if (datalist) datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            }).catch(() => { });

            apiRequest('GET', '/api/admin/users?limit=1000&permissions=perm:is_exec').then(usersData => {
                const users = usersData.users || [];
                const datalist = document.getElementById('managers-datalist');
                if (datalist) datalist.innerHTML = users.map(u => `<option value="${u.id} - ${u.first_name} ${u.last_name} (${u.email})">`).join('');
            }).catch(() => { });

            const managersForm = document.getElementById('managers-form');
            if (managersForm) {
                managersForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const userId = parseInt(document.getElementById('managers-user-input').value.split(' - ')[0]);
                    if (!userId || isNaN(userId)) return notify('Warning', 'Select a valid user', NotificationTypes.WARNING);

                    try {
                        await apiRequest('POST', `/api/tags/${id}/managers`, { userId });
                        notify('Success', 'Manager added', NotificationTypes.SUCCESS);
                        const list = (await apiRequest('GET', `/api/tags/${id}/managers`)).data || [];
                        document.getElementById('managers-table-body').innerHTML = renderUserRows(list, id, 'remove-manager-btn');
                        document.getElementById('managers-user-input').value = '';
                    } catch (err) {
                        notify('Error', 'Add failed', NotificationTypes.ERROR);
                    }
                };
            }

            const whitelistForm = document.getElementById('whitelist-form');
            if (whitelistForm) {
                whitelistForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const userId = parseInt(document.getElementById('whitelist-user-input').value.split(' - ')[0]);
                    if (!userId || isNaN(userId)) return notify('Warning', 'Select a valid user', NotificationTypes.WARNING);

                    try {
                        await apiRequest('POST', `/api/tags/${id}/whitelist`, { userId });
                        notify('Success', 'Added to whitelist', NotificationTypes.SUCCESS);
                        const list = (await apiRequest('GET', `/api/tags/${id}/whitelist`)).data || [];
                        document.getElementById('whitelist-table-body').innerHTML = renderUserRows(list, id, 'remove-whitelist-btn');
                        document.getElementById('whitelist-user-input').value = '';
                    } catch (err) {
                        notify('Error', 'Add failed', NotificationTypes.ERROR);
                    }
                };
            }
        }

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
                await apiRequest('DELETE', `/api/tags/${tagId}/${endpoint}/${userId}`);
                notify('Success', 'User removed', NotificationTypes.SUCCESS);
                // Refresh only the affected table
                const list = (await apiRequest('GET', `/api/tags/${tagId}/${endpoint}`)).data || [];
                tbody.innerHTML = renderUserRows(list, tagId, btnClass);
            } catch (err) {
                notify('Error', 'Removal failed', NotificationTypes.ERROR);
            }
        }
    }
}