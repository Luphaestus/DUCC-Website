/**
 * detail.js (Role)
 * 
 * Detailed view for managing a single user role.
 * 
 * Registered Route: /admin/role/:id
 */

import { apiRequest } from '@/utils/api';
import { switchView } from '@/utils/view';
import { adminContentID } from '../admin.js';
import { Panel } from '@/widgets/panel';
import { ARROW_BACK_IOS_NEW_SVG, DELETE_SVG, SAVE_SVG } from '@/utils/icons';
import { notify, NotificationTypes } from '@/components/notification';
import { showConfirmModal } from '@/utils/modal';
import { debounce } from '@/utils/utils';

/**
 * Main rendering function for role details.
 * 
 * @param {string|number} roleId - Database ID of the role.
 */
export async function renderRoleDetail(roleId: string | number): Promise<void> {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;
    adminContent.innerHTML = '<p class="loading-cell">Loading role details...</p>';

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) {
        actionsEl.innerHTML = `
            <button id="admin-delete-role-btn" class="small-btn outline danger icon-text-btn">${DELETE_SVG} Delete</button>
            <button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Roles</button>
        `;
        const backBtn = document.getElementById('admin-back-btn');
        if (backBtn) backBtn.onclick = () => switchView('/admin/roles');
        const deleteBtn = document.getElementById('admin-delete-role-btn');
        if (deleteBtn) deleteBtn.onclick = () => handleDeleteRole(roleId);
    }

    try {
        const isNew = roleId === 'new';
        const role = isNew ? { name: '', description: '', permissions: [], exec_ranking: 4 } : await apiRequest('GET', `/api/admin/roles/${roleId}`);
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
                                <label class="form-label-top">Exec Ranking
                                    <input type="number" name="execRanking" value="${role.exec_ranking || 4}" class="full-width-input" min="1" max="10">
                                    <small>1 = Top (President), 2 = Important (VP), 4 = Standard</small>
                                </label>
                            </div>

                            <h3>Permissions</h3>
                        <div class="tag-cloud">
                            ${(allPermissions as any[]).map(p => `
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
            const formEl = document.getElementById('role-form') as HTMLFormElement;
            const formData = new FormData(formEl);
            return {
                name: formData.get('name'),
                description: formData.get('description'),
                execRanking: formData.get('execRanking'),
                permissions: formData.getAll('permissions')
            };
        };

        const autoSave = async () => {
            if (isNew) return;
            const data = getFormData();
            try {
                await apiRequest('PUT', `/api/admin/roles/${roleId}`, data);
            } catch (err: any) {
                notify('Auto-save failed', err.message, NotificationTypes.ERROR);
            }
        };

        const debouncedAutoSave = debounce(autoSave, 1000);

        const form = document.getElementById('role-form') as HTMLFormElement | null;
        if (form) {
            form.onsubmit = (e) => handleSaveRole(e, roleId);

            if (!isNew) {
                form.querySelectorAll('input').forEach(input => {
                    const el = input as HTMLInputElement;
                    if (el.type === 'text') {
                        el.addEventListener('input', debouncedAutoSave);
                    } else {
                        el.addEventListener('change', autoSave);
                    }
                });
            }
        }

    } catch (e) {
        console.error(e);
        adminContent.innerHTML = '<p class="error-cell">Failed to load role.</p>';
    }
}

async function handleSaveRole(e: Event, id: string | number): Promise<void> {
    e.preventDefault();
    if (id !== 'new') return;

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        execRanking: formData.get('execRanking'),
        permissions: formData.getAll('permissions')
    };

    try {
        await apiRequest('POST', '/api/admin/roles', data);
        notify('Success', 'Role created', NotificationTypes.SUCCESS);
        switchView('/admin/roles');
    } catch (err: any) {
        notify('Error', err.message, NotificationTypes.ERROR);
    }
}

async function handleDeleteRole(id: string | number): Promise<void> {
    if (id === 'new') {
        switchView('/admin/roles');
        return;
    }
    if (!await showConfirmModal('Delete Role', 'Are you sure you want to delete this role? This might affect many users.')) return;

    try {
        await apiRequest('DELETE', `/api/admin/roles/${id}`);
        notify('Success', 'Role deleted', NotificationTypes.SUCCESS);
        switchView('/admin/roles');
    } catch (e: any) {
        notify('Error', e.message, NotificationTypes.ERROR);
    }
}