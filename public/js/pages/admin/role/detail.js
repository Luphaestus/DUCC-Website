import { ajaxGet, ajaxPost, ajaxPut, ajaxDelete } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../common.js';
import { notify, NotificationTypes } from '/js/components/notification.js';
import { ARROW_BACK_IOS_NEW_SVG, CLOSE_SVG } from "../../../../images/icons/outline/icons.js"

/**
 * Admin role creation and editing form.
 * @module AdminRoleDetail
 */

/**
 * Render role detail/editor form.
 * @param {string} id
 */
export async function renderRoleDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = `<button data-nav="/admin/roles">${ARROW_BACK_IOS_NEW_SVG} Back to Roles</button>`;

    const isNew = id === 'new';
    let role = { name: '', description: '', permissions: [] };
    let allPermissions = [];

    try {
        allPermissions = await ajaxGet('/api/admin/permissions');
        if (!isNew) {
            const roles = await ajaxGet('/api/admin/roles');
            role = roles.find(r => r.id == id);
            if (!role) throw new Error('Role not found');
        }
    } catch (e) {
        return adminContent.innerHTML = '<p>Error loading role data.</p>';
    }

    adminContent.innerHTML = /*html*/`
        <div class="form-info">
            <article class="form-box">
                <h2>${isNew ? 'Create New Role' : 'Edit Role'}</h2>
                <form id="role-form">
                    <label>Name <input type="text" name="name" value="${role.name}" required></label>
                    <label>Description <textarea name="description">${role.description || ''}</textarea></label>
                    
                    <h3>Permissions</h3>
                    <div class="permissions-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.5rem;">
                        ${allPermissions.map(p => `
                            <label>
                                <input type="checkbox" name="permissions" value="${p.slug}" ${role.permissions && role.permissions.includes(p.slug) ? 'checked' : ''}>
                                ${p.slug}
                            </label>
                        `).join('')}
                    </div>

                    <div class="tag-detail-actions" style="margin-top: 1rem;">
                        <button type="submit" class="primary">${isNew ? 'Create' : 'Save'}</button>
                        ${!isNew ? `<button type="button" id="delete-role-btn" class="contrast delete">Delete Role</button>` : ''}
                    </div>
                </form>
            </article>
        </div>`;

    document.getElementById('role-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            permissions: Array.from(document.querySelectorAll('input[name="permissions"]:checked')).map(cb => cb.value)
        };

        try {
            if (isNew) await ajaxPost('/api/admin/role', data);
            else await ajaxPut(`/api/admin/role/${id}`, data);
            notify('Success', 'Role saved', NotificationTypes.SUCCESS);
            switchView(`/admin/roles`);
        } catch (err) {
            notify('Error', 'Save failed', NotificationTypes.ERROR);
        }
    };

    if (!isNew) {
        document.getElementById('delete-role-btn').onclick = async () => {
            if (!confirm('Delete role? This will remove it from all users.')) return;
            await fetch(`/api/admin/role/${id}`, { method: 'DELETE' });
            notify('Success', 'Role deleted', NotificationTypes.SUCCESS);
            switchView('/admin/roles');
        };
    }
}
