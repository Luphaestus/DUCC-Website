import { ajaxGet } from '../../misc/ajax.js';
import { switchView } from '../../misc/view.js';
import { adminContentID, renderPaginationControls, renderAdminNavBar } from '../common.js';

/**
 * Paginated and searchable user management table.
 * @module AdminUserManage
 */

/**
 * Render user management interface.
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
        <div class="form-info">
            <article class="form-box">
                <div class="admin-controls-bar">
                    ${await renderAdminNavBar('users')}
                    <div class="search-input-wrapper">
                        <input type="text" id="user-search-input" placeholder="Search by name..." value="${search}">
                                                                        <button id="user-search-btn" title="Search">
                                                                            <svg
                                                  xmlns="http://www.w3.org/2000/svg"
                                                  width="24"
                                                  height="24"
                                                  viewBox="0 0 24 24"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  stroke-width="2"
                                                  stroke-linecap="round"
                                                  stroke-linejoin="round"
                                                >
                                                  <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                                                  <path d="M21 21l-6 -6" />
                                                </svg>
                                                                        </button>                    </div>
                </div>
                <div id="users-table-container">
                    <table class="admin-table">
                        <thead id="users-table-head"></thead>
                        <tbody id="users-table-body">
                            <tr><td colspan="5">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="users-pagination"></div>
            </article>
        </div>
    `;

    const searchInput = document.getElementById('user-search-input');
    const searchBtn = document.getElementById('user-search-btn');

    const performSearch = () => {
        updateUserParams({ search: searchInput.value, page: 1 });
    };

    searchBtn.onclick = performSearch;
    searchInput.onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };

    await fetchAndRenderUsers({ page, search, sort, order });
}

/**
 * Update URL parameters and refresh user list.
 * @param {object} updates
 */
function updateUserParams(updates) {
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') urlParams.delete(key);
        else urlParams.set(key, value);
    }
    const newSearch = urlParams.toString();
    const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
    window.history.pushState({}, '', newUrl);

    fetchAndRenderUsers({
        page: parseInt(urlParams.get('page')) || 1,
        search: urlParams.get('search') || '',
        sort: urlParams.get('sort') || 'last_name',
        order: urlParams.get('order') || 'asc'
    });
}

/**
 * Fetch and render users list.
 */
async function fetchAndRenderUsers({ page, search, sort, order }) {
    const thead = document.getElementById('users-table-head');
    const tbody = document.getElementById('users-table-body');
    const pagination = document.getElementById('users-pagination');

    try {
        const query = new URLSearchParams({ page, limit: 10, search, sort, order }).toString();
        const data = await ajaxGet(`/api/admin/users?${query}`);
        const users = data.users || [];

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
            pagination.innerHTML = '';
            return;
        }

        const sample = users[0];
        const columns = [{ key: 'name', label: 'Name', sort: 'first_name' }];
        if (sample.balance !== undefined) columns.push({ key: 'balance', label: 'Balance', sort: 'balance' });
        if (sample.first_aid_expiry !== undefined) columns.push({ key: 'first_aid', label: 'First Aid', sort: 'first_aid_expiry' });
        if (sample.difficulty_level !== undefined) columns.push({ key: 'difficulty', label: 'Difficulty', sort: 'difficulty_level' });
        if (sample.is_member !== undefined) columns.push({ key: 'member', label: 'Member', sort: 'is_member' });

        thead.innerHTML = `<tr>${columns.map(c => `<th class="sortable" data-sort="${c.sort}">${c.label} ${sort === c.sort ? (order === 'asc' ? '↑' : '↓') : '↕'}</th>`).join('')}</tr>`;

        tbody.innerHTML = users.map(user => `
            <tr class="user-row" data-id="${user.id}">
                ${columns.map(col => {
                    if (col.key === 'name') return `<td data-label="Name">${user.first_name} ${user.last_name}</td>`;
                    if (col.key === 'balance') return `<td data-label="Balance">£${Number(user.balance).toFixed(2)}</td>`;
                    if (col.key === 'first_aid') return `<td data-label="First Aid">${user.first_aid_expiry ? (new Date(user.first_aid_expiry) > new Date() ? 'Valid' : 'Expired') : 'N/A'}</td>`;
                    if (col.key === 'difficulty') return `<td data-label="Difficulty">${user.difficulty_level || 'N/A'}</td>`;
                    if (col.key === 'member') return `<td data-label="Member">${user.is_member ? 'Member' : 'Non-Member'}</td>`;
                    return '<td data-label="-">-</td>';
                }).join('')}
            </tr>
        `).join('');

        thead.querySelectorAll('th.sortable').forEach(th => {
            th.onclick = () => {
                const currentParams = new URLSearchParams(window.location.search);
                const currentSort = currentParams.get('sort') || 'last_name';
                const currentOrder = currentParams.get('order') || 'asc';
                const field = th.dataset.sort;
                updateUserParams({ sort: field, order: (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc' });
            };
        });

        tbody.querySelectorAll('.user-row').forEach(row => {
            row.onclick = () => switchView(`/admin/user/${row.dataset.id}`);
        });

        renderPaginationControls(pagination, page, data.totalPages || 1, (newPage) => updateUserParams({ page: newPage }));
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5">Error loading users.</td></tr>';
    }
}
