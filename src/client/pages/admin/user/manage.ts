/**
 * manage.js (User)
 * 
 * Logic for the administrative users list view.
 */

import { apiRequest } from '@/utils/api';
import { switchView } from '@/utils/view';
import { adminContentID, renderAdminNavBar } from '../admin.js';
import { Panel } from '@/widgets/panel';
import {
    UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG
} from '@/utils/icons'
import { Pagination } from '@/widgets/Pagination';
import { renderAvatar } from '@/utils/avatar';

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
    const page = parseInt(urlParams.get('page') || '1') || 1;

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
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table users-table">
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

    const searchInput = document.getElementById('user-search-input') as HTMLInputElement | null;
    const searchBtn = document.getElementById('user-search-btn');

    if (searchBtn && searchInput) {
        searchBtn.onclick = () => updateUserParams({ search: searchInput.value, page: 1 });
        searchInput.onkeypress = (e) => { if (e.key === 'Enter') searchBtn.click(); };
    }

    await fetchAndRenderUsers({ page, search, sort, order });
}

function updateUserParams(updates: Record<string, any>): void {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, String(value));
    }
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    fetchAndRenderUsers({
        page: parseInt(params.get('page') || '1') || 1,
        search: params.get('search') || '',
        sort: params.get('sort') || 'last_name',
        order: params.get('order') || 'asc'
    });
}

async function fetchAndRenderUsers({ page, search, sort, order }: any): Promise<void> {
    const thead = document.getElementById('users-table-head');
    const tbody = document.getElementById('users-table-body');
    if (!thead || !tbody) return;

    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('tab') || 'default';

    try {
        const [userData, globalData] = await Promise.all([
            apiRequest('GET', `/api/admin/users?${new URLSearchParams({ page: String(page), limit: '15', search: String(search), sort: String(sort), order: String(order) }).toString()}`),
            apiRequest('GET', '/api/globals/MinMoney').catch(() => ({ res: { MinMoney: { data: -25 } } }))
        ]);

        const users: any[] = userData.users || [];
        const totalPages = userData.totalPages || 1;
        const minMoney = Number(globalData.res?.MinMoney?.data || -25);

        const hasBalance = users.length > 0 && users[0].balance !== undefined;

        interface Column {
            key: string;
            label: string;
            sort?: string;
        }

        let columns: Column[] = [
            { key: 'name', label: 'Name', sort: 'last_name' },
        ];

        if (mode === 'swims') {
            columns.push({ key: 'swims', label: 'Swims', sort: 'swims' });
            columns.push({ key: 'actions', label: 'Quick Add' });
        } else {
            columns.push({ key: 'college', label: 'College', sort: 'college_id' });
            columns.push({ key: 'difficulty', label: 'Difficulty', sort: 'difficulty_level' });
            if (hasBalance) {
                columns.push({ key: 'balance', label: 'Balance', sort: 'balance' });
            }
        }

        thead.innerHTML = `<tr>${columns.map(c => `
            <th class="${c.sort ? 'sortable' : ''}" data-sort="${c.sort || ''}">
                ${c.label} ${c.sort ? (sort === c.sort ? (order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG) : ''}
            </th>
        `).join('')}</tr>`;

        thead.querySelectorAll('th.sortable').forEach(th => {
            (th as HTMLElement).onclick = () => {
                const currentSort = new URLSearchParams(window.location.search).get('sort') || 'last_name';
                const currentOrder = new URLSearchParams(window.location.search).get('order') || 'asc';
                const field = (th as HTMLElement).dataset.sort!;
                updateUserParams({ sort: field, order: (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc' });
            };
        });

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length}" class="empty-cell">No users found.</td></tr>`;
        } else {
            tbody.innerHTML = users.map(user => {
                const bal = Number(user.balance || 0);
                
                let balClass = 'text-success';
                if (bal < minMoney) balClass = 'text-danger';
                else if (bal < 0) balClass = 'text-warning';

                const lastInitial = user.last_name ? user.last_name.charAt(0) + '.' : '';

                if (mode === 'swims') {
                    return `
                        <tr class="user-row clickable-row" data-id="${user.id}">
                            <td data-label="Name" class="primary-text name-column">
                                <div class="user-info-cell">
                                    ${renderAvatar(user, { classes: 'mini' })}
                                    <div class="user-names">
                                        <span class="full-name">${user.first_name} ${user.last_name}</span>
                                        <span class="thin-name">${user.first_name} ${lastInitial}</span>
                                    </div>
                                </div>
                            </td>
                            <td data-label="Swims">${user.swims || 0}</td>
                            <td data-label="Quick Add" class="quick-actions-cell" onclick="event.stopPropagation()">
                                <button class="small-btn primary mini-btn" data-add-swim="${user.id}">+1 Swim</button>
                                <button class="small-btn secondary mini-btn" data-add-bootie="${user.id}">+1 Bootie</button>
                            </td>
                        </tr>
                    `;
                }

                return `
                    <tr class="user-row clickable-row" data-id="${user.id}">
                        <td data-label="Name" class="primary-text name-column">
                            <div class="user-info-cell">
                                ${renderAvatar(user, { classes: 'mini' })}
                                <div class="user-names">
                                    <span class="full-name">${user.first_name} ${user.last_name}</span>
                                    <span class="thin-name">${user.first_name} ${lastInitial}</span>
                                </div>
                            </div>
                        </td>
                        <td data-label="College">${user.college_name || 'N/A'}</td>
                        <td data-label="Difficulty">
                            <span class="badge difficulty-${user.difficulty_level || 1}">${user.difficulty_level || 1}</span>
                        </td>
                        ${hasBalance ? `<td data-label="Balance" class="${balClass}">£${bal.toFixed(2)}</td>` : ''}
                    </tr>
                `;
            }).join('');
            
            tbody.querySelectorAll('.user-row').forEach(row => {
                const element = row as HTMLElement;
                const target = mode === 'swims' ? `/admin/user/${element.dataset.id}?tab=swims` : `/admin/user/${element.dataset.id}`;
                element.onclick = () => switchView(target);
            });

            if (mode === 'swims') {
                const { notify } = await import('/js/components/notification.js');
                tbody.querySelectorAll('[data-add-swim]').forEach(btn => {
                    (btn as HTMLElement).onclick = async () => {
                        const id = (btn as HTMLElement).dataset.addSwim;
                        try {
                            await apiRequest('POST', `/api/user/${id}/swims`, { count: 1 });
                            notify('Success', 'Swim added.', 'success', 1000);
                            fetchAndRenderUsers({ page, search, sort, order });
                        } catch (err: any) {
                            notify('Error', err.message, 'error');
                        }
                    };
                });
                tbody.querySelectorAll('[data-add-bootie]').forEach(btn => {
                    (btn as HTMLElement).onclick = async () => {
                        const id = (btn as HTMLElement).dataset.addBootie;
                        try {
                            await apiRequest('POST', `/api/user/${id}/booties`, { count: 1 });
                            notify('Success', 'Bootie added.', 'success', 1000);
                            fetchAndRenderUsers({ page, search, sort, order });
                        } catch (err: any) {
                            notify('Error', err.message, 'error');
                        }
                    };
                });
            }
        }

        const paginationEl = document.getElementById('users-pagination');
        if (paginationEl) {
            new Pagination(paginationEl, (newPage) => {
                updateUserParams({ page: newPage });
            }).render(page, totalPages);
        }

    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="error-cell">Error loading users.</td></tr>';
    }
}