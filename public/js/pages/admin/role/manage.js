/**
 * manage.js (Role)
 * 
 * Logic for the administrative roles list view.
 * Provides an overview of system roles and their permission counts.
 * 
 * Registered Route: /admin/roles
 */

import { ajaxGet } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderAdminNavBar } from '../common.js';

/**
 * Main rendering function for the roles management dashboard.
 */
export async function renderManageRoles() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <div class="glass-toolbar">
                ${await renderAdminNavBar('roles')}
                <div class="toolbar-content">
                    <div class="toolbar-left hidden"></div>
                    <div class="toolbar-right">
                        <button data-nav="/admin/role/new" class="small-btn primary">Create New Role</button>
                    </div>
                </div>
            </div>

            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Permissions Count</th>
                            </tr>
                        </thead>
                        <tbody id="roles-table-body">
                            <tr><td colspan="3" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    await fetchAndRenderRoles();
}

/**
 * Fetches the list of all roles and populates the table.
 */
async function fetchAndRenderRoles() {
    try {
        const roles = await ajaxGet('/api/admin/roles');
        const tbody = document.getElementById('roles-table-body');

        if (!roles || roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">No roles found.</td></tr>';
        } else {
            tbody.innerHTML = roles.map(role => `
                <tr class="role-row clickable-row" data-id="${role.id}">
                    <td data-label="Name" class="primary-text">${role.name}</td>
                    <td data-label="Description" class="description-cell">${role.description || '-'}</td>
                    <td data-label="Permissions"><span class="badge neutral">${(role.permissions || []).length}</span></td>
                </tr>
            `).join('');

            // Attach row click listeners for detail navigation
            tbody.querySelectorAll('.role-row').forEach(row => {
                row.onclick = () => switchView(`/admin/role/${row.dataset.id}`);
            });
        }
    } catch (e) {
        const tbody = document.getElementById('roles-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="error-cell">Error loading roles.</td></tr>';
    }
}