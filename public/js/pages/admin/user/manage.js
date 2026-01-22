/**
 * manage.js (User)
 * 
 * Logic for the administrative user directory view.
 * Provides a responsive, sortable, and paginated table of all registered users.
 * Supports filtering by debt status, membership, and difficulty level.
 * 
 * Registered Route: /admin/users
 */

import { ajaxGet } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderPaginationControls, renderAdminNavBar } from '../common.js';
import { UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, SEARCH_SVG, FILTER_LIST_SVG } from '../../../../images/icons/outline/icons.js'

/**
 * Main rendering function for the user management dashboard.
 * Parses query parameters to initialize table state.
 */
export async function renderManageUsers() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'last_name';
    const order = urlParams.get('order') || 'asc';
    const page = parseInt(urlParams.get('page')) || 1;
    const inDebt = urlParams.get('inDebt') || '';
    const isMember = urlParams.get('isMember') || '';
    const difficulty = urlParams.get('difficulty') || '';

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <div class="glass-toolbar">
                ${await renderAdminNavBar('users')}
                <div class="toolbar-content">
                    <div class="toolbar-left">
                        <div class="search-bar">
                            <input type="text" id="user-search-input" placeholder="Search by name..." value="${search}">
                            <button id="user-search-btn" class="search-icon-btn" title="Search">${SEARCH_SVG}</button>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <button id="toggle-user-filters-btn" class="small-btn outline secondary">
                            ${FILTER_LIST_SVG} Filters
                        </button>
                        <!-- Filter Dropdown Panel -->
                        <div id="advanced-user-filters-panel" class="glass-filter-panel hidden">
                            <div class="filter-grid">
                                <label>
                                    In Debt
                                    <select id="filter-in-debt">
                                        <option value="">All</option>
                                        <option value="true" ${inDebt === 'true' ? 'selected' : ''}>Yes</option>
                                        <option value="false" ${inDebt === 'false' ? 'selected' : ''}>No</option>
                                    </select>
                                </label>
                                <label>
                                    Membership
                                    <select id="filter-is-member">
                                        <option value="">All</option>
                                        <option value="true" ${isMember === 'true' ? 'selected' : ''}>Members</option>
                                        <option value="false" ${isMember === 'false' ? 'selected' : ''}>Non-Members</option>
                                    </select>
                                </label>
                                <label>
                                    Difficulty
                                    <input type="number" id="filter-difficulty" value="${difficulty}" placeholder="Exact">
                                </label>
                            </div>
                            <div class="filter-actions text-right">
                                <button id="apply-user-filters-btn" class="small-btn primary">Apply Filters</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Data Table -->
            <div id="users-table-container" class="glass-table-container">
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
        </div>
    `;

    // --- UI Interaction Handlers ---
    const searchInput = document.getElementById('user-search-input');
    const searchBtn = document.getElementById('user-search-btn');
    const filterBtn = document.getElementById('toggle-user-filters-btn');
    const filterPanel = document.getElementById('advanced-user-filters-panel');
    const applyBtn = document.getElementById('apply-user-filters-btn');

    const performSearch = () => {
        updateUserParams({ search: searchInput.value, page: 1 });
    };

    searchBtn.onclick = performSearch;
    searchInput.onkeypress = (e) => { if (e.key === 'Enter') performSearch(); };
    
    filterBtn.onclick = () => filterPanel.classList.toggle('hidden');
    
    applyBtn.onclick = () => {
        updateUserParams({
            inDebt: document.getElementById('filter-in-debt').value,
            isMember: document.getElementById('filter-is-member').value,
            difficulty: document.getElementById('filter-difficulty').value,
            page: 1
        });
    };

    await fetchAndRenderUsers({ page, search, sort, order, inDebt, isMember, difficulty });
}

/**
 * Updates browser history and refreshes the user list based on new parameters.
 * 
 * @param {object} updates - Filter or pagination changes.
 */
function updateUserParams(updates) {
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '' || value === false) urlParams.delete(key);
        else urlParams.set(key, value);
    }
    const newSearch = urlParams.toString();
    const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
    window.history.pushState({}, '', newUrl);

    fetchAndRenderUsers({
        page: parseInt(urlParams.get('page')) || 1,
        search: urlParams.get('search') || '',
        sort: urlParams.get('sort') || 'last_name',
        order: urlParams.get('order') || 'asc',
        inDebt: urlParams.get('inDebt') || '',
        isMember: urlParams.get('isMember') || '',
        difficulty: urlParams.get('difficulty') || ''
    });
}

/**
 * Fetches user data from the server and renders the table content.
 * Dynamically determines columns based on provided user data samples.
 * 
 * @param {object} params - Search and sort query state.
 */
async function fetchAndRenderUsers({ page, search, sort, order, inDebt, isMember, difficulty }) {
    const thead = document.getElementById('users-table-head');
    const tbody = document.getElementById('users-table-body');
    const pagination = document.getElementById('users-pagination');

    try {
        const query = new URLSearchParams({ page, limit: 10, search, sort, order, inDebt, isMember, difficulty }).toString();
        const data = await ajaxGet(`/api/admin/users?${query}`);
        const users = data.users || [];

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No users found.</td></tr>';
            pagination.innerHTML = '';
            return;
        }

        // Determine visible columns based on data attributes
        const sample = users[0];
        const columns = [{ key: 'name', label: 'Name', sort: 'last_name' }];
        if (sample.balance !== undefined) columns.push({ key: 'balance', label: 'Balance', sort: 'balance' });
        if (sample.first_aid_expiry !== undefined) columns.push({ key: 'first_aid', label: 'First Aid', sort: 'first_aid_expiry' });
        if (sample.difficulty_level !== undefined) columns.push({ key: 'difficulty', label: 'Difficulty', sort: 'difficulty_level' });
        if (sample.is_member !== undefined) columns.push({ key: 'member', label: 'Status', sort: 'is_member' });

        // Render sortable header
        thead.innerHTML = `<tr>${columns.map(c => `<th class="sortable" data-sort="${c.sort}">${c.label} ${sort === c.sort ? (order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG}</th>`).join('')}</tr>`;

        // Render rows
        tbody.innerHTML = users.map(user => `
            <tr class="user-row clickable-row" data-id="${user.id}">
                ${columns.map(col => {
            if (col.key === 'name') return `<td data-label="Name" class="primary-text">${user.first_name} ${user.last_name}</td>`;
            if (col.key === 'balance') {
                const isNegative = Number(user.balance) < 0;
                return `<td data-label="Balance" class="${isNegative ? 'text-danger' : 'text-success'}">£${Number(user.balance).toFixed(2)}</td>`;
            }
            if (col.key === 'first_aid') {
                const valid = user.first_aid_expiry && new Date(user.first_aid_expiry) > new Date();
                return `<td data-label="First Aid"><span class="badge ${valid ? 'success' : 'neutral'}">${valid ? 'Valid' : 'Expired/None'}</span></td>`;
            }
            if (col.key === 'difficulty') return `<td data-label="Difficulty"><span class="badge difficulty-${user.difficulty_level}">${user.difficulty_level || '-'}</span></td>`;
            if (col.key === 'member') return `<td data-label="Status"><span class="badge ${user.is_member ? 'success' : 'warning'}">${user.is_member ? 'Member' : 'Guest'}</span></td>`;
            return '<td data-label="-">-</td>';
        }).join('')}
            </tr>
        `).join('');

        // Attach sort listeners
        thead.querySelectorAll('th.sortable').forEach(th => {
            th.onclick = () => {
                const currentParams = new URLSearchParams(window.location.search);
                const currentSort = currentParams.get('sort') || 'last_name';
                const currentOrder = currentParams.get('order') || 'asc';
                const field = th.dataset.sort;
                updateUserParams({ sort: field, order: (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc' });
            };
        });

        // Attach row click listeners for navigation
        tbody.querySelectorAll('.user-row').forEach(row => {
            row.onclick = (e) => {
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                switchView(`/admin/user/${row.dataset.id}`);
            };
        });

        renderPaginationControls(pagination, page, data.totalPages || 1, (newPage) => updateUserParams({ page: newPage }));
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" class="error-cell">Error loading users.</td></tr>';
    }
}