import { ajaxGet } from '/js/utils/ajax.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID, renderAdminNavBar } from '../common.js';

/**
 * Paginated, searchable, and sortable events management table.
 * @module AdminEventManage
 */

// --- Icons ---
const SORT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9l4 -4l4 4" /><path d="M16 15l-4 4l-4 -4" /></svg>`;

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

    adminContent.innerHTML = `
        <div class="form-info">
            <article class="form-box">
                <div class="admin-controls-bar">
                    ${await renderAdminNavBar('events')}
                    <div class="search-input-wrapper">
                        <input type="text" id="event-search-input" placeholder="Search events..." value="${search}">
                                                                        <button id="event-search-btn" title="Search">
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
                    <div class="admin-actions">
                        <label class="admin-toggle-label">
                            <input type="checkbox" id="show-past-toggle" ${showPast ? 'checked' : ''}>
                            Show Past Events
                        </label>
                        <button onclick="switchView('/admin/event/new')" class="primary">Create New Event</button>
                    </div>
                </div>
                <div>
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th class="sortable" data-sort="title">Title ${SORT_SVG}</th>
                                <th class="sortable" data-sort="start">Date ${SORT_SVG}</th>
                                <th class="sortable" data-sort="location">Location ${SORT_SVG}</th>
                                <th class="sortable" data-sort="difficulty_level">Difficulty ${SORT_SVG}</th>
                                <th class="sortable" data-sort="upfront_cost">Cost ${SORT_SVG}</th>
                            </tr>
                        </thead>
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
    const pastToggle = document.getElementById('show-past-toggle');

    searchBtn.onclick = () => updateEventParams({ search: searchInput.value, page: 1 });
    searchInput.onkeypress = (e) => { if (e.key === 'Enter') searchBtn.click(); };
    pastToggle.onchange = () => updateEventParams({ showPast: pastToggle.checked, page: 1 });

    adminContent.querySelectorAll('th.sortable').forEach(th => {
        th.onclick = () => {
            const currentSort = new URLSearchParams(window.location.search).get('sort') || 'start';
            const currentOrder = new URLSearchParams(window.location.search).get('order') || 'asc';
            const field = th.dataset.sort;
            updateEventParams({ sort: field, order: (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc' });
        };
    });

    await fetchAndRenderEvents({ page, search, sort, order, showPast });
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
        showPast: params.get('showPast') === 'true'
    });
}

/**
 * Fetch and render events list.
 * @param {object} params
 */
async function fetchAndRenderEvents({ page, search, sort, order, showPast }) {
    try {
        const query = new URLSearchParams({ page, limit: 10, search, sort, order, showPast }).toString();
        const data = await ajaxGet(`/api/admin/events?${query}`);
        const events = data.events || [];
        const totalPages = data.totalPages || 1;
        const tbody = document.getElementById('events-table-body');

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
        const tbody = document.getElementById('events-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5">Error loading events.</td></tr>';
    }
}