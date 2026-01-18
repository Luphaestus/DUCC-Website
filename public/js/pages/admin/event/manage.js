import { ajaxGet } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderAdminNavBar } from '../common.js';
import { UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG } from '../../../../images/icons/outline/icons.js'


/**
 * Paginated, searchable, and sortable events management table.
 * @module AdminEventManage
 */

/**
 * Render event management interface.
 */
export async function renderManageEvents() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

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
        <div class="form-info">
            <article class="form-box">
                <div class="admin-controls-container">
                    <div class="admin-nav-row">
                         ${await renderAdminNavBar('events')}
                    </div>
                    <div class="admin-tools-row">
                        <div class="search-input-wrapper">
                            <input type="text" id="event-search-input" placeholder="Search events..." value="${search}">
                                <button id="event-search-btn" title="Search">
                                    ${SEARCH_SVG}
                                </button>
                        </div>
                        <div class="admin-actions">
                             <button id="toggle-filters-btn" class="contrast outline">Filters ${UNFOLD_MORE_SVG}</button>
                             <div id="advanced-filters-panel" class="filter-panel hidden">
                                <div class="grid">
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
                                <button id="apply-filters-btn" class="small-btn">Apply Filters</button>
                            </div>
                            <button data-nav="/admin/event/new" class="primary">Create New Event</button>
                        </div>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="admin-table">
                        <thead id="events-table-head"></thead>
                        <tbody id="events-table-body">
                            <tr><td colspan="5">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="events-pagination"></div>
            </article>
        </div>
    `;

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
 * Update URL parameters and refresh events list.
 * @param {object} updates
 */
function updateEventParams(updates) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '' || value === false) params.delete(key);
        else params.set(key, value);
    }
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);

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
 * Fetch and render events list.
 * @param {object} params
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
            tbody.innerHTML = '<tr><td colspan="5">No events found.</td></tr>';
        } else {
            tbody.innerHTML = events.map(event => `
                <tr class="event-row" data-id="${event.id}">
                    <td data-label="Title">${event.title}</td>
                    <td data-label="Date">${new Date(event.start).toLocaleString()}</td>
                    <td data-label="Location">${event.location}</td>
                    <td data-label="Difficulty">${event.difficulty_level}</td>
                    <td data-label="Cost">£${event.upfront_cost.toFixed(2)}</td>
                </tr>
            `).join('');

            tbody.querySelectorAll('.event-row').forEach(row => {
                row.onclick = () => switchView(`/admin/event/${row.dataset.id}`);
            });
        }

        const pagination = document.getElementById('events-pagination');
        pagination.innerHTML = '';
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Prev';
        prevBtn.disabled = page <= 1;
        prevBtn.onclick = (e) => { e.preventDefault(); updateEventParams({ page: page - 1 }); };

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.disabled = page >= totalPages;
        nextBtn.onclick = (e) => { e.preventDefault(); updateEventParams({ page: page + 1 }); };

        pagination.append(prevBtn, ` Page ${page} of ${totalPages} `, nextBtn);
    } catch (e) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5">Error loading events.</td></tr>';
    }
}