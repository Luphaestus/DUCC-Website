/**
 * manage.js
 * 
 * Logic for the administrative events list view.
 * Features advanced server-side search, multi-field filtering (cost, difficulty, location),
 * and sortable, paginated data tables.
 * 
 * Registered Route: /admin/events
 */

import { ajaxGet } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderAdminNavBar, renderPaginationControls } from '../common.js';
import { UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, FILTER_LIST_SVG } from '../../../../images/icons/outline/icons.js'

/**
 * Main rendering function for the admin events management dashboard.
 * Parses current URL state to set initial filters.
 */
export async function renderManageEvents() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    // Load initial filter state from URL
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'start';
    const order = urlParams.get('order') || 'asc';
    const page = parseInt(urlParams.get('page')) || 1;
    const showPast = urlParams.get('showPast') === 'true';
    const minCost = urlParams.get('minCost') || '';
    const maxCost = urlParams.get('maxCost') || '';
    const difficulty = urlParams.get('difficulty') || '';
    const location = urlParams.get('location') || '';

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('events')}
                 <div class="toolbar-content">
                    <div class="toolbar-left">
                        <!-- Search Input -->
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
                         <button data-nav="/admin/event/new" class="small-btn primary">Create Event</button>
                        
                        <!-- Advanced Filter Panel (Hidden by default) -->
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
                            <div class="filter-actions text-right">
                                <button id="apply-filters-btn" class="small-btn primary">Apply Filters</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Events Table -->
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
    const searchInput = document.getElementById('event-search-input');
    const searchBtn = document.getElementById('event-search-btn');
    const filterBtn = document.getElementById('toggle-filters-btn');
    const filterPanel = document.getElementById('advanced-filters-panel');
    const applyBtn = document.getElementById('apply-filters-btn');

    searchBtn.onclick = () => updateEventParams({ search: searchInput.value, page: 1 });
    searchInput.onkeypress = (e) => { if (e.key === 'Enter') searchBtn.click(); };
    
    filterBtn.onclick = () => {
        filterPanel.classList.toggle('hidden');
    };

    applyBtn.onclick = () => {
        updateEventParams({
            showPast: document.getElementById('filter-show-past').value,
            minCost: document.getElementById('filter-min-cost').value,
            maxCost: document.getElementById('filter-max-cost').value,
            difficulty: document.getElementById('filter-difficulty').value,
            location: document.getElementById('filter-location').value,
            page: 1
        });
    };

    await fetchAndRenderEvents({ page, search, sort, order, showPast, minCost, maxCost, difficulty, location });
}

/**
 * Updates the browser URL with new query parameters and triggers a table refresh.
 * 
 * @param {object} updates - Key-value pairs of URL parameters to change.
 */
function updateEventParams(updates) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '' || value === false) params.delete(key);
        else params.set(key, value);
    }
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

    // Re-fetch with new state
    fetchAndRenderEvents({
        page: parseInt(params.get('page')) || 1,
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
 * @param {object} params - Search and sort parameters.
 */
async function fetchAndRenderEvents({ page, search, sort, order, showPast, minCost, maxCost, difficulty, location }) {
    const thead = document.getElementById('events-table-head');
    const tbody = document.getElementById('events-table-body');

    try {
        const query = new URLSearchParams({ page, limit: 10, search, sort, order, showPast, minCost, maxCost, difficulty, location }).toString();
        const data = await ajaxGet(`/api/admin/events?${query}`);
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
        thead.innerHTML = `<tr>${columns.map(c => `
            <th class="sortable" data-sort="${c.sort}">
                ${c.label} ${sort === c.sort ? (order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG}
            </th>
        `).join('')}</tr>`;

        thead.querySelectorAll('th.sortable').forEach(th => {
            th.onclick = () => {
                const currentSort = new URLSearchParams(window.location.search).get('sort') || 'start';
                const currentOrder = new URLSearchParams(window.location.search).get('order') || 'asc';
                const field = th.dataset.sort;
                updateEventParams({ sort: field, order: (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc' });
            };
        });

        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No events found.</td></tr>';
        } else {
            tbody.innerHTML = events.map(event => `
                <tr class="event-row clickable-row" data-id="${event.id}">
                    <td data-label="Title" class="primary-text">${event.title}</td>
                    <td data-label="Date">${new Date(event.start).toLocaleString()}</td>
                    <td data-label="Location">${event.location}</td>
                    <td data-label="Difficulty"><span class="badge difficulty-${event.difficulty_level}">${event.difficulty_level}</span></td>
                    <td data-label="Cost">£${event.upfront_cost.toFixed(2)}</td>
                </tr>
            `).join('');
            
            // Re-attach row click listeners
            tbody.querySelectorAll('.event-row').forEach(row => {
                row.onclick = (e) => {
                    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
                    switchView(`/admin/event/${row.dataset.id}`);
                };
            });
        }

        const pagination = document.getElementById('events-pagination');
        renderPaginationControls(pagination, page, totalPages, (newPage) => updateEventParams({ page: newPage }));

    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="error-cell">Error loading events.</td></tr>';
    }
}