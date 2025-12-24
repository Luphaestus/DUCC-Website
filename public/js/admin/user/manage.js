import { ajaxGet } from '../../misc/ajax.js';
import { switchView } from '../../misc/view.js';
import { adminContentID, renderPaginationControls, renderAdminNavBar } from '../common.js';

/**
 * User Management Module (Admin).
 * Provides a paginated and searchable table of all registered users.
 * admins can filter by name/email, sort by various fields (balance, level, etc.),
 * and click rows to access deep-dive user details.
 */

// --- Main Render Function ---

/**
 * Renders the user management shell including search controls and table headers.
 */
export async function renderManageUsers() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    // Load state from URL query parameters
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                        </button>
                    </div>
                    <div class="admin-actions">
                        <!-- Space for future global actions -->
                    </div>
                </div>
                <div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-sort="first_name">Name ↕</th>
                                <th class="sortable" data-sort="balance">Balance ↕</th>
                                <th class="sortable" data-sort="first_aid_expiry">First Aid ↕</th>
                                <th class="sortable" data-sort="difficulty_level">Difficulty ↕</th>
                                <th class="sortable" data-sort="is_member">Member ↕</th>
                            </tr>
                        </thead>
                        <tbody id="users-table-body">
                            <tr><td colspan="5">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="users-pagination"></div>
            </article>
        </div>
    `;

    // --- Search Logic ---
    const searchInput = document.getElementById('user-search-input');
    const searchBtn = document.getElementById('user-search-btn');

    const performSearch = () => {
        const newSearch = searchInput.value;
        updateUserParams({ search: newSearch, page: 1 });
    };

    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // --- Sort Logic ---
    adminContent.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const currentSort = new URLSearchParams(window.location.search).get('sort') || 'last_name';
            const currentOrder = new URLSearchParams(window.location.search).get('order') || 'asc';
            const field = th.dataset.sort;
            let newOrder = 'asc';
            if (currentSort === field) {
                newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
            }
            updateUserParams({ sort: field, order: newOrder });
        });
    });

    // Load and render initial data
    await fetchAndRenderUsers({ page, search, sort, order });
}

// --- Helper Functions ---

/**
 * Syncs search/sort/page state to the URL and triggers a re-fetch.
 * @param {object} updates - Map of parameters to change.
 */
function updateUserParams(updates) {
    const urlParams = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') {
            urlParams.delete(key);
        } else {
            urlParams.set(key, value);
        }
    }
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);

    // Re-render
    const params = {
        page: parseInt(urlParams.get('page')) || 1,
        search: urlParams.get('search') || '',
        sort: urlParams.get('sort') || 'last_name',
        order: urlParams.get('order') || 'asc'
    };
    fetchAndRenderUsers(params);
}

/**
 * Performs the actual data fetch and DOM generation for user rows.
 * @param {object} params - Request parameters.
 */
async function fetchAndRenderUsers({ page, search, sort, order }) {
    const tbody = document.getElementById('users-table-body');
    const pagination = document.getElementById('users-pagination');

    try {
        const limit = 10;
        const query = new URLSearchParams({ page, limit, search, sort, order }).toString();
        const data = await ajaxGet(`/api/admin/users?${query}`);
        const users = data.users || [];
        const totalPages = data.totalPages || 1;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
            pagination.innerHTML = '';
            return;
        }

        // Map user objects to table rows
        tbody.innerHTML = users.map(user => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
            const balance = user.balance !== undefined ? `£${Number(user.balance).toFixed(2)}` : 'N/A';

            // Calculated columns
            let firstAid = 'None';
            if (user.first_aid_expiry) {
                const expiry = new Date(user.first_aid_expiry);
                firstAid = expiry > new Date() ? 'Valid' : 'Expired';
            }

            const difficulty = user.difficulty_level || 1;
            const member = user.is_member ? 'Member' : 'Non-Member';

            return `
                <tr class="user-row" data-name="${fullName}" data-id="${user.id}">
                    <td>${fullName}</td>
                    <td>${balance}</td>
                    <td>${firstAid}</td>
                    <td>${difficulty}</td>
                    <td>${member}</td>
                </tr>
            `;
        }).join('');

        // Row click setup
        tbody.querySelectorAll('.user-row').forEach(row => {
            row.addEventListener('click', () => {
                switchView(`/admin/user/${row.dataset.id}`);
            });
        });

        // Render standard pagination controls
        renderPaginationControls(pagination, page, totalPages, (newPage) => {
            updateUserParams({ page: newPage });
        });

    } catch (e) {
        console.error("Error fetching users", e);
        tbody.innerHTML = '<tr><td colspan="5">Error loading users.</td></tr>';
    }
}