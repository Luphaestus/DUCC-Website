//todo refine
/* manage.js (Role)
* 
* Logic for the administrative roles list view.
* 
* Registered Route: /admin/roles
*/

import { apiRequest } from '/js/utils/api.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderAdminNavBar } from '../admin.js';
import { Panel } from '/js/widgets/panel.js';

/**
 * Main rendering function for the role management dashboard.
 */
export async function renderManageRoles() {
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
            
            ${Panel({
        content: `
                    <div class="glass-table-container">
                        <div class="table-responsive">
                            <table class="glass-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Permissions</th>
                                    </tr>
                                </thead>
                                <tbody id="roles-table-body">
                                    <tr><td colspan="2" class="loading-cell">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `
    })}
        </div>
    `;

    await fetchAndRenderRoles();
}

/**
 * Fetches the list of all roles and populates the table.
 */
async function fetchAndRenderRoles() {
    try {
        const roles = await apiRequest('GET', '/api/admin/roles');
        const tbody = document.getElementById('roles-table-body');

        if (roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="empty-cell">No roles found.</td></tr>';
        } else {
            tbody.innerHTML = roles.map(role => `
                <tr class="role-row clickable-row" data-id="${role.id}">
                    <td data-label="Name" class="primary-text">${role.name}</td>
                    <td data-label="Permissions">
                        <div class="permission-tags">
                            ${role.permissions.map(p => `<span class="badge neutral">${p}</span>`).join('')}
                        </div>
                    </td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.role-row').forEach(row => {
                row.onclick = () => switchView(`/admin/role/${row.dataset.id}`);
            });
        }
    } catch (e) {
        const tbody = document.getElementById('roles-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="error-cell">Error loading roles.</td></tr>';
    }
}