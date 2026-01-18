import { ajaxGet } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderAdminNavBar } from '../common.js';

/**
 * Admin role management list.
 * @module AdminRoleManage
 */

/**
 * Render role management interface.
 */
export async function renderManageRoles() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = /*html*/`
        <div class="form-info">
            <article class="form-box">
                <div class="admin-nav-row">
                    ${await renderAdminNavBar('roles')}
                </div>
                <div class="admin-tools-row">
                    <div class="admin-actions">
                        <button data-nav="/admin/role/new" class="primary">Create New Role</button>
                    </div>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Permissions Count</th>
                        </tr>
                    </thead>
                    <tbody id="roles-table-body">
                        <tr><td colspan="3">Loading...</td></tr>
                    </tbody>
                </table>
            </article>
        </div>
    `;

    await fetchAndRenderRoles();
}

/**
 * Fetch and render roles list.
 */
async function fetchAndRenderRoles() {
    try {
        const roles = await ajaxGet('/api/admin/roles');
        const tbody = document.getElementById('roles-table-body');

        if (!roles || roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No roles found.</td></tr>';
        } else {
            tbody.innerHTML = roles.map(role => `
                <tr class="role-row" data-id="${role.id}">
                    <td data-label="Name">${role.name}</td>
                    <td data-label="Description">${role.description || '-'}</td>
                    <td data-label="Permissions">${(role.permissions || []).length}</td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.role-row').forEach(row => {
                row.onclick = () => switchView(`/admin/role/${row.dataset.id}`);
            });
        }
    } catch (e) {
        const tbody = document.getElementById('roles-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="3">Error loading roles.</td></tr>';
    }
}
