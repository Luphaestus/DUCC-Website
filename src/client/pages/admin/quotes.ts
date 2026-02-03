/**
 * quotes.js (Admin)
 * 
 * Logic for the admin quotes moderation page.
 */

import { apiRequest } from '@/utils/api';
import { adminContentID, renderAdminNavBar } from './admin.js';
import { notify } from '../../components/notification.js';
import { Pagination } from '@/widgets/Pagination';
import { 
    SEARCH_SVG, DELETE_SVG, CHECK_SVG, CLOSE_SVG,
    UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG 
} from '@/utils/icons';

/**
 * Renders the quote management view.
 */
export async function renderManageQuotes(): Promise<void> {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'created_at';
    const order = urlParams.get('order') || 'desc';
    const page = parseInt(urlParams.get('page') || '1') || 1;

    adminContent.innerHTML = `
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('quotes')}
                 <div class="toolbar-content">
                    <div class="search-bar">
                        <input type="text" id="quote-search-input" placeholder="Search quotes..." value="${search}">
                        <button id="user-search-btn" class="search-icon-btn">
                            ${SEARCH_SVG}
                        </button>
                    </div>
                 </div>
            </div>
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table quotes-table">
                        <thead id="quotes-table-head"></thead>
                        <tbody id="quotes-table-body">
                            <tr><td colspan="5" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="quotes-pagination"></div>
        </div>
    `;

    const searchInput = document.getElementById('quote-search-input') as HTMLInputElement | null;
    const searchBtn = document.getElementById('user-search-btn');

    if (searchBtn && searchInput) {
        searchBtn.onclick = () => updateQuoteParams({ search: searchInput.value, page: 1 });
        searchInput.onkeypress = (e) => { if (e.key === 'Enter') searchBtn.click(); };
    }

    await fetchAndRenderAdminQuotes({ page, search, sort, order });
}

/**
 * Updates URL parameters and refreshes the data.
 */
function updateQuoteParams(updates: Record<string, any>): void {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, String(value));
    }
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
    fetchAndRenderAdminQuotes({
        page: parseInt(params.get('page') || '1') || 1,
        search: params.get('search') || '',
        sort: params.get('sort') || 'created_at',
        order: params.get('order') || 'desc'
    });
}

/**
 * Fetches and displays quotes for moderation.
 */
async function fetchAndRenderAdminQuotes({ page, search, sort, order }: any): Promise<void> {
    const thead = document.getElementById('quotes-table-head');
    const tbody = document.getElementById('quotes-table-body');
    if (!thead || !tbody) return;

    const columns = [
        { key: 'text', label: 'Quote', sort: 'text' },
        { key: 'quoted_user', label: 'Person', sort: 'quoted_user' },
        { key: 'submitted_by', label: 'Submitter', sort: null },
        { key: 'visibility', label: 'Status', sort: 'visibility' },
    ];

    thead.innerHTML = `<tr>${columns.map(c => `
        <th class="${c.sort ? 'sortable' : ''}" data-sort="${c.sort || ''}">
            ${c.label} ${c.sort ? (sort === c.sort ? (order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG) : ''}
        </th>
    `).join('')}<th class="text-right">Actions</th></tr>`;

    thead.querySelectorAll('th.sortable').forEach(th => {
        (th as HTMLElement).onclick = () => {
            const currentSort = new URLSearchParams(window.location.search).get('sort') || 'created_at';
            const currentOrder = new URLSearchParams(window.location.search).get('order') || 'desc';
            const field = (th as HTMLElement).dataset.sort!;
            updateQuoteParams({ sort: field, order: (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc' });
        };
    });

    try {
        const query = new URLSearchParams({ page: String(page), limit: '15', search: String(search), sort: String(sort), order: String(order) });

        const response = await apiRequest('GET', `/api/admin/quotes?${query.toString()}`);
        const quotes: any[] = response.data.quotes || [];
        const totalPages = response.data.totalPages || 1;

        if (quotes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No quotes found matching criteria.</td></tr>';
        } else {
            tbody.innerHTML = quotes.map(quote => `
                <tr class="quote-row">
                    <td data-label="Quote" class="primary-text quote-text-cell">"${quote.text}"</td>
                    <td data-label="Person">${quote.quoted_user.first_name} ${quote.quoted_user.last_name}</td>
                    <td data-label="Submitter">${quote.submitted_by ? `${quote.submitted_by.first_name} ${quote.submitted_by.last_name}` : 'Unknown'}</td>
                    <td data-label="Status">
                        <span class="status-badge status-${quote.visibility}">${quote.visibility}</span>
                    </td>
                    <td data-label="Actions" class="text-right action-cell">
                        <div class="button-group">
                            ${quote.visibility !== 'public' ? `
                                <button class="button success icon-only mini-btn" data-action="release" data-id="${quote.id}" title="Release">
                                    ${CHECK_SVG}
                                </button>
                            ` : ''}
                            ${quote.visibility !== 'hidden' ? `
                                <button class="button warning icon-only mini-btn" data-action="hide" data-id="${quote.id}" title="Hide">
                                    ${CLOSE_SVG}
                                </button>
                            ` : ''}
                            <button class="button danger icon-only mini-btn" data-action="delete" data-id="${quote.id}" title="Delete">
                                ${DELETE_SVG}
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            // Attach event listeners for actions
            tbody.querySelectorAll('button[data-action]').forEach(btn => {
                (btn as HTMLElement).onclick = async (e: MouseEvent) => {
                    e.stopPropagation();
                    const action = (btn as HTMLElement).dataset.action;
                    const id = (btn as HTMLElement).dataset.id;
                    
                    if (action === 'delete') {
                        if (!confirm('Are you sure you want to delete this quote?')) return;
                        try {
                            await apiRequest('DELETE', `/api/admin/quotes/${id}`);
                            notify('Quote deleted.', 'success');
                            updateQuoteParams({}); // Refresh current view
                        } catch (err: any) {
                            notify(err.message || 'Failed to delete quote.', 'error');
                        }
                    } else {
                        const newVisibility = action === 'release' ? 'public' : 'hidden';
                        try {
                            await apiRequest('POST', `/api/admin/quotes/${id}/visibility`, { visibility: newVisibility });
                            notify(`Quote marked as ${newVisibility}.`, 'success');
                            updateQuoteParams({}); // Refresh current view
                        } catch (err: any) {
                            notify(err.message || 'Failed to update visibility.', 'error');
                        }
                    }
                };
            });
        }

        const paginationEl = document.getElementById('quotes-pagination');
        if (paginationEl) {
            new Pagination(paginationEl, (newPage) => {
                updateQuoteParams({ page: newPage });
            }).render(page, totalPages);
        }

    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="error-cell">Error loading quotes for moderation.</td></tr>';
    }
}
