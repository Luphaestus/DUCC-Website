/**
 * manage.js
 * 
 * Logic for the administrative events list view.
 * Features advanced server-side search, multi-field filtering (cost, difficulty, location),
 * and sortable, paginated data tables.
 * 
 * Registered Route: /admin/events
 */

import { apiRequest } from '@/utils/api';
import { switchView } from '@/utils/view';
import { setupNumberInput } from '@/utils/utils';
import { adminContentID, renderAdminNavBar } from '../admin.js';
import { Panel } from '@/widgets/panel';
import { UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, FILTER_LIST_SVG } from '@/utils/icons'
import { Pagination } from '@/widgets/Pagination';

/**
 * Main rendering function for the admin events management dashboard.
 * Parses current URL state to set initial filters.
 */
export async function renderManageEvents(): Promise<void> {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'start';
    const order = urlParams.get('order') || 'asc';
    const page = parseInt(urlParams.get('page') || '1') || 1;
    const showPast = urlParams.get('showPast') === 'true';
    const minCost = urlParams.get('minCost') || '';
    const maxCost = urlParams.get('maxCost') || '';
    const difficulty = urlParams.get('difficulty') || '';
    const location = urlParams.get('location') || '';

    adminContent.innerHTML = `
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('events')}
                 <div class="toolbar-content">
                    <div class="toolbar-left">
                        <div class="search-bar">
                            <input type="text" id="event-search-input" placeholder="Search events..." value="${search}">
                            <button id="event-search-btn" class="search-icon-btn" title="Search">
                                ${SEARCH_SVG}
                            </button>
                        </div>
                    </div>
                    
                    <div class="toolbar-right">
                         <button id="toggle-filters-btn" class="small-btn outline secondary">
                            ${FILTER_LIST_SVG} Filters
                         </button>
                         <button data-nav="/admin/event/new" class="small-btn">Create Event</button>
                        
                        <div id="advanced-filters-panel" class="glass-filter-panel hidden">
                            <div class="filter-grid">
                                    <label>
                                    Events Display
                                    <select id="filter-show-past">
                                        <option value="false" ${!showPast ? 'selected' : ''}>Upcoming Only</option>
                                        <option value="true" ${showPast ? 'selected' : ''}>All Events</option>
                                    </select>
                                </label>
                                <label>
                                    Difficulty
                                    <input type="number" id="filter-difficulty" value="${difficulty}" placeholder="Exact">
                                </label>
                                <label>
                                    Min Cost
                                    <input type="number" id="filter-min-cost" value="${minCost}" step="0.01">
                                </label>
                                    <label>
                                    Max Cost
                                    <input type="number" id="filter-max-cost" value="${maxCost}" step="0.01">
                                </label>
                                <label>
                                    Location
                                    <input type="text" id="filter-location" value="${location}" placeholder="Contains...">
                                </label>
                            </div>
                            <div class="filter-actions">
                                <button id="apply-filters-btn" class="small-btn">Apply Filters</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table">
                        <thead id="events-table-head"></thead>
                        <tbody id="events-table-body">
                            <tr><td colspan="5" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="events-pagination"></div>
        </div>
    `;

    // --- UI Logic Binding ---
    const searchInput = document.getElementById('event-search-input') as HTMLInputElement | null;
    const searchBtn = document.getElementById('event-search-btn');
    const filterBtn = document.getElementById('toggle-filters-btn');
    const filterPanel = document.getElementById('advanced-filters-panel');
    const applyBtn = document.getElementById('apply-filters-btn');

    const difficultyInput = document.getElementById('filter-difficulty') as HTMLInputElement | null;
    const minCostInput = document.getElementById('filter-min-cost') as HTMLInputElement | null;
    const maxCostInput = document.getElementById('filter-max-cost') as HTMLInputElement | null;

    if (difficultyInput) setupNumberInput(difficultyInput);
    if (minCostInput) setupNumberInput(minCostInput);
    if (maxCostInput) setupNumberInput(maxCostInput);

    if (searchBtn && searchInput) {
        searchBtn.onclick = () => updateEventParams({ search: searchInput.value, page: 1 });
        searchInput.onkeypress = (e) => { if (e.key === 'Enter') searchBtn.click(); };
    }

    if (filterBtn && filterPanel) {
        filterBtn.onclick = () => {
            filterPanel.classList.toggle('hidden');
        };
    }

    if (applyBtn) {
        applyBtn.onclick = () => {
            updateEventParams({
                showPast: (document.getElementById('filter-show-past') as HTMLSelectElement).value,
                minCost: (document.getElementById('filter-min-cost') as HTMLInputElement).value,
                maxCost: (document.getElementById('filter-max-cost') as HTMLInputElement).value,
                difficulty: (document.getElementById('filter-difficulty') as HTMLInputElement).value,
                location: (document.getElementById('filter-location') as HTMLInputElement).value,
                page: 1
            });
        };
    }

    await fetchAndRenderEvents({ page, search, sort, order, showPast, minCost, maxCost, difficulty, location });
}

interface EventParams {
    page?: number;
    search?: string;
    sort?: string;
    order?: string;
    showPast?: string | boolean;
    minCost?: string;
    maxCost?: string;
    difficulty?: string;
    location?: string;
}

/**
 * Updates the browser URL with new query parameters and triggers a table refresh.
 * 
 * @param {EventParams} updates - Key-value pairs of URL parameters to change.
 */
function updateEventParams(updates: EventParams): void {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '' || value === false) params.delete(key);
        else params.set(key, String(value));
    }
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

    fetchAndRenderEvents({
        page: parseInt(params.get('page') || '1') || 1,
        search: params.get('search') || '',
        sort: params.get('sort') || 'start',
        order: params.get('order') || 'asc',
        showPast: params.get('showPast') === 'true',
        minCost: params.get('minCost') || '',
        maxCost: params.get('maxCost') || '',
        difficulty: params.get('difficulty') || '',
        location: params.get('location') || ''
    });
}

/**
 * Fetches the event list from the API and renders the table rows.
 * 
 * @param {any} params - Search and sort parameters.
 */
async function fetchAndRenderEvents({ page, search, sort, order, showPast, minCost, maxCost, difficulty, location }: any): Promise<void> {
    const thead = document.getElementById('events-table-head');
    const tbody = document.getElementById('events-table-body');

    try {
        const query = new URLSearchParams({ 
            page: String(page), 
            limit: '10', 
            search: String(search), 
            sort: String(sort), 
            order: String(order), 
            showPast: String(showPast), 
            minCost: String(minCost), 
            maxCost: String(maxCost), 
            difficulty: String(difficulty), 
            location: String(location) 
        }).toString();
        const data = await apiRequest('GET', `/api/admin/events?${query}`);
        const events = data.events || [];
        const totalPages = data.totalPages || 1;

        const columns = [
            { key: 'title', label: 'Title', sort: 'title' },
            { key: 'start', label: 'Date', sort: 'start' },
            { key: 'location', label: 'Location', sort: 'location' },
            { key: 'difficulty_level', label: 'Difficulty', sort: 'difficulty_level' },
            { key: 'upfront_cost', label: 'Cost', sort: 'upfront_cost' }
        ];

        // Render sortable header
        if (thead) {
            thead.innerHTML = `<tr>${columns.map(c => `
                <th class="sortable" data-sort="${c.sort}">
                    ${c.label} ${sort === c.sort ? (order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG}
                </th>
            `).join('')}</tr>`;

            thead.querySelectorAll('th.sortable').forEach(th => {
                const element = th as HTMLElement;
                element.onclick = () => {
                    const currentSort = new URLSearchParams(window.location.search).get('sort') || 'start';
                    const currentOrder = new URLSearchParams(window.location.search).get('order') || 'asc';
                    const field = element.dataset.sort!;
                    updateEventParams({ sort: field, order: (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc' });
                };
            });
        }

        if (tbody) {
            if (events.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No events found.</td></tr>';
            } else {
                tbody.innerHTML = (events as any[]).map(event => `
                    <tr class="event-row clickable-row" data-id="${event.id}">
                        <td data-label="Title" class="primary-text">${event.title}</td>
                        <td data-label="Date">${new Date(event.start).toLocaleString()}</td>
                        <td data-label="Location">${event.location}</td>
                        <td data-label="Difficulty"><span class="badge difficulty-${event.difficulty_level}">${event.difficulty_level}</span></td>
                        <td data-label="Cost">£${event.upfront_cost.toFixed(2)}</td>
                    </tr>
                `).join('');

                tbody.querySelectorAll('.event-row').forEach(row => {
                    const element = row as HTMLElement;
                    element.onclick = (e) => {
                        const target = e.target as HTMLElement;
                        if (target.tagName === 'BUTTON' || target.closest('button')) return;
                        switchView(`/admin/event/${element.dataset.id}`);
                    };
                });
            }
        }

        const paginationEl = document.getElementById('events-pagination');
        if (paginationEl) {
            const pager = new Pagination(paginationEl, (newPage) => {
                updateEventParams({ page: newPage });
            });
            pager.render(page, totalPages);
        }

    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="error-cell">Error loading events.</td></tr>';
    }
}