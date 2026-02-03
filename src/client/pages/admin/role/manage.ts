/* manage.js (Role)* 
* Logic for the administrative roles list view.
* 
* Registered Route: /admin/roles
*/

import { apiRequest } from '@/utils/api';
import { switchView } from '@/utils/view';
import { adminContentID, renderAdminNavBar } from '../admin.js';
import { Panel } from '@/widgets/panel';
import { notify } from '@/components/notification';

/**
 * Main rendering function for the role management dashboard.
 */
export async function renderManageRoles(): Promise<void> {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = `
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('roles')}
                 <div class="toolbar-content">
                    <div class="toolbar-left hidden"></div>
                    <div class="toolbar-right">
                        <button data-nav="/admin/role/new" class="small-btn">Create New Role</button>
                    </div>
                </div>
            </div>
            
            <div class="roles-sections">
                ${Panel({
                    title: 'System Roles',
                    content: `
                        <div class="table-responsive">
                            <table class="glass-table">
                                <thead><tr><th>Name</th><th>Permissions</th></tr></thead>
                                <tbody id="roles-table-body">
                                    <tr><td colspan="2" class="loading-cell">Loading roles...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    `
                })}

                ${Panel({
                    title: 'Permission Definitions',
                    classes: 'mt-4',
                    content: `
                        <div class="table-responsive">
                            <table class="glass-table">
                                <thead><tr><th>Slug</th><th>Description</th><th class="text-right">Action</th></tr></thead>
                                <tbody id="permissions-table-body">
                                    <tr><td colspan="3" class="loading-cell">Loading permissions...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    `
                })}
            </div>
        </div>
    `;

    await Promise.all([
        fetchAndRenderRoles(),
        fetchAndRenderPermissions()
    ]);
}

/**
 * Fetches the list of all roles and populates the table.
 */
async function fetchAndRenderRoles(): Promise<void> {
    try {
        const roles: any[] = await apiRequest('GET', '/api/admin/roles');
        const tbody = document.getElementById('roles-table-body');
        if (!tbody) return;

        if (roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="empty-cell">No roles found.</td></tr>';
        } else {
            tbody.innerHTML = roles.map(role => `
                <tr class="role-row clickable-row" data-id="${role.id}">
                    <td data-label="Name" class="primary-text">${role.name}</td>
                    <td data-label="Permissions">
                        <div class="permission-tags">
                            ${(role.permissions as any[]).map(p => `<span class="badge neutral">${p}</span>`).join('')}
                        </div>
                    </td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.role-row').forEach(row => {
                (row as HTMLElement).onclick = () => switchView(`/admin/role/${(row as HTMLElement).dataset.id}`);
            });
        }
    } catch (e) {
        const tbody = document.getElementById('roles-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="error-cell">Error loading roles.</td></tr>';
    }
}

/**
 * Fetches all permissions and populates the definitions table.
 */
async function fetchAndRenderPermissions(): Promise<void> {
    try {
        const perms: any[] = await apiRequest('GET', '/api/admin/roles/permissions');
        const tbody = document.getElementById('permissions-table-body');
        if (!tbody) return;

        tbody.innerHTML = perms.map(p => `
            <tr>
                <td class="primary-text"><code>${p.slug}</code></td>
                <td><input type="text" class="mini-input" id="perm-desc-${p.id}" value="${p.description || ''}" placeholder="No description"></td>
                <td class="text-right">
                    <button class="small-btn primary mini-btn" data-save-perm="${p.id}">Save</button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('[data-save-perm]').forEach(btn => {
            (btn as HTMLElement).onclick = async () => {
                const id = (btn as HTMLElement).dataset.savePerm;
                const description = (document.getElementById(`perm-desc-${id}`) as HTMLInputElement).value;
                try {
                    await apiRequest('PUT', `/api/admin/permissions/${id}`, { description });
                    notify('Success', 'Permission updated.', 'success');
                } catch (e: any) { notify('Error', e.message, 'error'); }
            };
        });
    } catch (e) {
        const tbody = document.getElementById('permissions-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="3">Error loading permissions.</td></tr>';
    }
}