/**
 * detail.js (Role)
 * 
 * Detailed view for managing a single user role.
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
import { debounce } from '/js/utils/utils.js';

/**
 * Main rendering function for role details.
 * 
 * @param {string|number} roleId - Database ID of the role.
 */
export async function renderRoleDetail(roleId) {
    const adminContent = document.getElementById(adminContentID);
    adminContent.innerHTML = '<p class="loading-cell">Loading role details...</p>';

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
                            <div class="grid-2-col">
                                <label class="form-label-top">Role Name
                                    <input type="text" name="name" value="${role.name}" required class="full-width-input" placeholder="e.g. Moderator">
                                </label>
                                <label class="form-label-top">Description
                                    <input type="text" name="description" value="${role.description || ''}" class="full-width-input" placeholder="Role purpose">
                                </label>
                            </div>

                            <h3>Permissions</h3>
                        <div class="tag-cloud">
                            ${allPermissions.map(p => `
                                <label class="checkbox-label">
                                    <input type="checkbox" name="permissions" value="${p.slug}" ${(role.permissions || []).includes(p.slug) ? 'checked' : ''}> ${p.key || p.slug}
                                </label>
                            `).join('')}
                        </div>

                            <div class="form-actions-footer mt-2 ${!isNew ? 'hidden' : ''}">
                                <button type="submit" class="primary-btn wide-btn">${SAVE_SVG} ${isNew ? 'Create' : 'Save Changes'}</button>
                            </div>
                        </form>
                    `
        })}
            </div>
        `;

        const getFormData = () => {
            const formData = new FormData(document.getElementById('role-form'));
            return {
                name: formData.get('name'),
                description: formData.get('description'),
                permissions: formData.getAll('permissions')
            };
        };

        const autoSave = async () => {
            if (isNew) return;
            const data = getFormData();
            try {
                await apiRequest('PUT', `/api/admin/roles/${roleId}`, data);
            } catch (err) {
                notify('Auto-save failed', err.message, NotificationTypes.ERROR);
            }
        };

        const debouncedAutoSave = debounce(autoSave, 1000);

        const form = document.getElementById('role-form');
        form.onsubmit = (e) => handleSaveRole(e, roleId);

        if (!isNew) {
            form.querySelectorAll('input').forEach(input => {
                if (input.type === 'text') {
                    input.addEventListener('input', debouncedAutoSave);
                } else {
                    input.addEventListener('change', autoSave);
                }
            });
        }

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = '<p class="error-cell">Failed to load role.</p>';
    }
}

async function handleSaveRole(e, id) {
    e.preventDefault();
    if (id !== 'new') return;

    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        permissions: formData.getAll('permissions')
    };

    try {
        await apiRequest('POST', '/api/admin/roles', data);
        notify('Success', 'Role created', NotificationTypes.SUCCESS);
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