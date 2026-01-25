/**
 * manage.js (User)
 * 
 * Logic for the administrative users list view.
 */

import { apiRequest } from '/js/utils/api.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderAdminNavBar } from '../admin.js';
import { Panel } from '/js/widgets/panel.js';
import { 
    UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG 
} from '../../../../images/icons/outline/icons.js'
import { Pagination } from '/js/widgets/Pagination.js';

/**
 * Main rendering function for the admin users management dashboard.
 */
export async function renderManageUsers() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'last_name';
    const order = urlParams.get('order') || 'asc';
    const page = parseInt(urlParams.get('page')) || 1;

    adminContent.innerHTML = `
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('users')}
                 <div class="toolbar-content">
                    <div class="search-bar">
                        <input type="text" id="user-search-input" placeholder="Search users..." value="${search}">
                        <button id="user-search-btn" class="search-icon-btn">
                            ${SEARCH_SVG}
                        </button>
                    </div>
                 </div>
            </div>

            ${Panel({
                content: `
                    <div class="glass-table-container">
                        <div class="table-responsive">
                            <table class="glass-table">
                                <thead id="users-table-head"></thead>
                                <tbody id="users-table-body">
                                    <tr><td colspan="5" class="loading-cell">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div id="users-pagination"></div>
                `
            })}
        </div>
    `;

    const searchInput = document.getElementById('user-search-input');
    const searchBtn = document.getElementById('user-search-btn');

    searchBtn.onclick = () => updateUserParams({ search: searchInput.value, page: 1 });
    searchInput.onkeypress = (e) => { if (e.key === 'Enter') searchBtn.click(); };

    await fetchAndRenderUsers({ page, search, sort, order });
}

function updateUserParams(updates) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
    }
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    fetchAndRenderUsers({
        page: parseInt(params.get('page')) || 1,
        search: params.get('search') || '',
        sort: params.get('sort') || 'last_name',
        order: params.get('order') || 'asc'
    });
}

async function fetchAndRenderUsers({ page, search, sort, order }) {
    const thead = document.getElementById('users-table-head');
    const tbody = document.getElementById('users-table-body');

    try {
        const query = new URLSearchParams({ page, limit: 15, search, sort, order }).toString();
        const data = await apiRequest('GET', `/api/admin/users?${query}`);
        const users = data.users || [];
        const totalPages = data.totalPages || 1;

        const columns = [
            { key: 'first_name', label: 'First Name', sort: 'first_name' },
            { key: 'last_name', label: 'Last Name', sort: 'last_name' },
            { key: 'email', label: 'Email', sort: 'email' },
            { key: 'college', label: 'College', sort: 'college_id' },
            { key: 'role', label: 'Role' }
        ];

        thead.innerHTML = `<tr>${columns.map(c => `
            <th class="${c.sort ? 'sortable' : ''}" data-sort="${c.sort || ''}">
                ${c.label} ${c.sort ? (sort === c.sort ? (order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG) : ''}
            </th>
        `).join('')}</tr>`;

        thead.querySelectorAll('th.sortable').forEach(th => {
            th.onclick = () => {
                const currentSort = new URLSearchParams(window.location.search).get('sort') || 'last_name';
                const currentOrder = new URLSearchParams(window.location.search).get('order') || 'asc';
                const field = th.dataset.sort;
                updateUserParams({ sort: field, order: (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc' });
            };
        });

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No users found.</td></tr>';
        } else {
            tbody.innerHTML = users.map(user => `
                <tr class="user-row clickable-row" data-id="${user.id}">
                    <td data-label="First Name">${user.first_name}</td>
                    <td data-label="Last Name">${user.last_name}</td>
                    <td data-label="Email">${user.email}</td>
                    <td data-label="College">${user.college_name || 'N/A'}</td>
                    <td data-label="Role"><span class="badge role-${user.role_name?.toLowerCase()}">${user.role_name}</span></td>
                </tr>
            `).join('');
            
            tbody.querySelectorAll('.user-row').forEach(row => {
                row.onclick = () => switchView(`/admin/user/${row.dataset.id}`);
            });
        }

        new Pagination(document.getElementById('users-pagination'), (newPage) => {
            updateUserParams({ page: newPage });
        }).render(page, totalPages);

    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="error-cell">Error loading users.</td></tr>';
    }
}