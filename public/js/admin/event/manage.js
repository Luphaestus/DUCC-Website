import { ajaxGet } from '../../misc/ajax.js';
import { switchView } from '../../misc/view.js';
import { adminContentID, renderAdminNavBar } from '../common.js';

/**
 * Event Management Module (Admin).
 * Provides a paginated, searchable, and sortable table of all events.
 * Users can click on rows to edit specific events or create new ones via the action bar.
 */

// --- Main Render Function ---

/**
 * Renders the event management shell.
 * Includes the search bar, action buttons, and the table structure.
 */
export async function renderManageEvents() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    // Read initial state from URL to support bookmarking/deep-linking of filters
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
                        </button>
                    </div>
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
                                <th class="sortable" data-sort="title">Title ↕</th>
                                <th class="sortable" data-sort="start">Date ↕</th>
                                <th class="sortable" data-sort="location">Location ↕</th>
                                <th class="sortable" data-sort="difficulty_level">Difficulty ↕</th>
                                <th class="sortable" data-sort="upfront_cost">Cost ↕</th>
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

    // --- Search Setup ---
    const searchInput = document.getElementById('event-search-input');
    const searchBtn = document.getElementById('event-search-btn');
    const pastToggle = document.getElementById('show-past-toggle');

    searchBtn.onclick = () => updateEventParams({ search: searchInput.value, page: 1 });
    searchInput.onkeypress = (e) => { if (e.key === 'Enter') searchBtn.click(); };

    pastToggle.onchange = () => updateEventParams({ showPast: pastToggle.checked, page: 1 });

    // --- Sort Setup ---
    adminContent.querySelectorAll('th.sortable').forEach(th => {
        th.onclick = () => {
            const currentSort = new URLSearchParams(window.location.search).get('sort') || 'start';
            const currentOrder = new URLSearchParams(window.location.search).get('order') || 'asc';
            const field = th.dataset.sort;
            // Toggle order if clicking the same column, otherwise default to ascending
            const newOrder = (currentSort === field && currentOrder === 'asc') ? 'desc' : 'asc';
            updateEventParams({ sort: field, order: newOrder });
        };
    });

    // Initial data load
    await fetchAndRenderEvents({ page, search, sort, order, showPast });
}

// --- Helper Functions ---

/**
 * Updates the URL and triggers a re-render of the table.
 * @param {object} updates - Changed parameters.
 */
function updateEventParams(updates) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '' || value === false) params.delete(key);
        else params.set(key, value);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    // Sync browser history so "Back" button works
    window.history.pushState({}, '', newUrl);

    // Refresh content
    fetchAndRenderEvents({
        page: parseInt(params.get('page')) || 1,
        search: params.get('search') || '',
        sort: params.get('sort') || 'start',
        order: params.get('order') || 'asc',
        showPast: params.get('showPast') === 'true'
    });
}

/**
 * Fetches event data from API and generates table rows.
 * Also renders pagination controls.
 * @param {object} params - Query parameters.
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
            // Map event data to HTML table rows
            tbody.innerHTML = events.map(event => `
                <tr class="event-row" data-id="${event.id}">
                    <td>${event.title}</td>
                    <td>${new Date(event.start).toLocaleString()}</td>
                    <td>${event.location}</td>
                    <td>${event.difficulty_level}</td>
                    <td>£${event.upfront_cost.toFixed(2)}</td>
                </tr>
            `).join('');

            // Make rows clickable for editing
            tbody.querySelectorAll('.event-row').forEach(row => {
                row.onclick = () => switchView(`/admin/event/${row.dataset.id}`);
            });
        }

        // --- Pagination Controls ---
        const pagination = document.getElementById('events-pagination');
        pagination.innerHTML = '';
        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Prev';
        prevBtn.disabled = page <= 1;
        prevBtn.classList.add('pagination-btn');
        prevBtn.onclick = (e) => {
            e.preventDefault();
            updateEventParams({ page: page - 1 });
        };

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.disabled = page >= totalPages;
        nextBtn.classList.add('pagination-btn');
        nextBtn.onclick = (e) => {
            e.preventDefault();
            updateEventParams({ page: page + 1 });
        };

        pagination.append(prevBtn, ` Page ${page} of ${totalPages} `, nextBtn);

    } catch (e) {
        console.error(e);
        const tbody = document.getElementById('events-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5">Error loading events.</td></tr>';
    }
}