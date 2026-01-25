//todo refine 

/**
 * detail.js (Role)
 * 
 * Detailed view for managing a single user role.
 * Allows editing role name and assigning granular permissions.
 * 
 * Registered Route: /admin/role/:id
 */

import { apiRequest } from '/js/utils/api.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../admin.js';
import { Panel } from '/js/widgets/panel.js';
import { ARROW_BACK_IOS_NEW_SVG, DELETE_SVG, SAVE_SVG } from '../../../../images/icons/outline/icons.js';
import { notify, NotificationTypes } from '/js/components/notification.js';
import { showConfirmModal } from '/js/utils/modal.js';

/**
 * Main rendering function for role details.
 * 
 * @param {string|number} roleId - Database ID of the role.
 */
export async function renderRoleDetail(roleId) {
    const adminContent = document.getElementById(adminContentID);
    adminContent.innerHTML = '<p class="loading-cell">Loading role details...</p>';

    // Toolbar actions
    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) {
        actionsEl.innerHTML = `
            <button id="admin-delete-role-btn" class="small-btn outline danger icon-text-btn">${DELETE_SVG} Delete</button>
            <button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Roles</button>
        `;
        document.getElementById('admin-back-btn').onclick = () => switchView('/admin/roles');
        document.getElementById('admin-delete-role-btn').onclick = () => handleDeleteRole(roleId);
    }

    try {
        const isNew = roleId === 'new';
        const role = isNew ? { name: '', permissions: [] } : await apiRequest('GET', `/api/admin/roles/${roleId}`);
        const allPermissions = await apiRequest('GET', '/api/admin/roles/permissions');

        adminContent.innerHTML = `
            <div class="glass-layout">
                ${Panel({
            title: isNew ? 'Create New Role' : 'Edit Role',
            content: `
                        <form id="role-form" class="modern-form">
                            <div class="modern-form-group">
                                <label class="form-label-top">Role Name
                                    <input type="text" name="name" value="${role.name}" required class="full-width-input" placeholder="e.g. Moderator">
                                </label>
                            </div>

                            <h3>Permissions</h3>
                        <div class="tag-cloud">
                            ${allPermissions.map(p => `
                                <label class="checkbox-label">
                                    <input type="checkbox" name="permissions" value="${p.id}" ${rolePerms.find(rp => rp.id === p.id) ? 'checked' : ''}> ${p.key}
                                </label>
                            `).join('')}
                        </div>

                            <div class="form-actions-footer mt-2">
                                <button type="submit" class="primary-btn wide-btn">${SAVE_SVG} ${isNew ? 'Create' : 'Save Changes'}</button>
                            </div>
                        </form>
                    `
        })}
            </div>
        `;

        document.getElementById('role-form').onsubmit = (e) => handleSaveRole(e, roleId);

    } catch (e) {
        adminContent.innerHTML = '<p class="error-cell">Failed to load role.</p>';
    }
}

async function handleSaveRole(e, id) {
    e.preventDefault();
    const isNew = id === 'new';
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        permissions: formData.getAll('permissions')
    };

    try {
        if (isNew) {
            await apiRequest('POST', '/api/admin/roles', data);
            notify('Success', 'Role created', NotificationTypes.SUCCESS);
        } else {
            await apiRequest('PUT', `/api/admin/roles/${id}`, data);
            notify('Success', 'Role updated', NotificationTypes.SUCCESS);
        }
        switchView('/admin/roles');
    } catch (err) {
        notify('Error', err.message, NotificationTypes.ERROR);
    }
}

async function handleDeleteRole(id) {
    if (id === 'new') return switchView('/admin/roles');
    if (!await showConfirmModal('Delete Role', 'Are you sure you want to delete this role? This might affect many users.')) return;

    try {
        await apiRequest('DELETE', `/api/admin/roles/${id}`);
        notify('Success', 'Role deleted', NotificationTypes.SUCCESS);
        switchView('/admin/roles');
    } catch (e) {
        notify('Error', e.message, NotificationTypes.ERROR);
    }
}