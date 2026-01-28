/**
 * files.js
 * 
 * Logic for the club resources and documents view.
 * 
 * Registered Route: /files
 */

import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { apiRequest } from '/js/utils/api.js';
import { CLOUD_DOWNLOAD_SVG, SEARCH_SVG, UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, 
    ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG 
} from '../../images/icons/outline/icons.js';
import { Pagination } from '/js/widgets/Pagination.js';

addRoute('/files', 'files');

const HTML_TEMPLATE = /*html*/`
<div id="files-view" class="view hidden small-container">
    <div class="files-header">
        <div class="files-title-row">
            <h1>Files</h1>
        </div>
        <div class="files-controls">
            <button id="manage-files-btn" class="hidden secondary" data-nav="/admin/files">Manage Files</button>
            <div class="search-box">
                <span class="icon">${SEARCH_SVG}</span>
                <input type="text" id="file-search" placeholder="Search title, content or filename: content:">
            </div>
            <select id="category-filter">
                <option value="">All Categories</option>
            </select>
        </div>
    </div>

    <div class="files-table-wrapper">
        <table class="files-table">
            <thead id="files-table-head"></thead>
            <tbody id="files-list">
                <tr><td colspan="5" class="text-centre">Loading...</td></tr>
            </tbody>
        </table>
    </div>

    <div id="files-pagination" class="pagination"></div>
</div>`;

let currentOptions = {
    page: 1,
    limit: 15,
    search: '',
    sort: 'date',
    order: 'desc',
    categoryId: ''
};

/**
 * Formats a byte count into a human-readable size string.
 * 
 * @param {number} bytes 
 * @returns {string} - e.g. "1.5 MB".
 */
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Fetches and populates the category filter dropdown.
 */
async function loadCategories() {
    const filter = document.getElementById('category-filter');
    if (!filter) return;

    try {
        const res = await apiRequest('GET', '/api/file-categories');
        const categories = res.data || [];
        filter.innerHTML = '<option value="">All Categories</option>' +
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (e) {
        console.error('Failed to load categories', e);
    }
}

/**
 * Verifies if the current user has permission to manage files.
 */
async function checkManagePermissions() {
    const editBtn = document.getElementById('manage-files-btn');
    if (!editBtn) return;

    try {
        const userData = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({}));
        const perms = userData.permissions || [];
        if (perms.includes('file.write') || perms.includes('file.edit')) {
            editBtn.classList.remove('hidden');
        } else {
            editBtn.classList.add('hidden');
        }
    } catch (e) { }
}

/**
 * Fetches the list of files from the server and renders the table content.
 */
async function fetchFiles() {
    const list = document.getElementById('files-list');
    const thead = document.getElementById('files-table-head');
    if (!list || !thead) return;

    const columns = [
        { key: 'title', label: 'Title', sort: 'title' },
        { key: 'author', label: 'Author', sort: 'author' },
        { key: 'date', label: 'Date', sort: 'date' },
        { key: 'size', label: 'Size', sort: 'size' }
    ];

    // Generate table header with sort indicators
    thead.innerHTML = `<tr>${columns.map(c => `
        <th class="sortable" data-sort="${c.sort}" data-label="${c.label}">
            ${c.label} ${currentOptions.sort === c.sort ? (currentOptions.order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG}
        </th>
    `).join('')}<th data-label="Action">Action</th></tr>`;

    thead.querySelectorAll('th.sortable').forEach(th => {
        th.onclick = () => {
            const field = th.dataset.sort;
            if (currentOptions.sort === field) {
                currentOptions.order = currentOptions.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentOptions.sort = field;
                currentOptions.order = 'asc';
            }
            fetchFiles();
        };
    });

    const query = new URLSearchParams(currentOptions).toString();
    try {
        const res = await apiRequest('GET', `/api/files?${query}`);
        const { files, totalPages } = res.data;

        if (files.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-centre">No files found.</td></tr>';
            return;
        }

        list.innerHTML = files.map(file => {
            const viewableExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'txt', 'mp4', 'webm', 'mp3'];
            const ext = file.filename.split('.').pop().toLowerCase();
            const viewable = viewableExtensions.includes(ext);
            const downloadUrl = `/api/files/${file.id}/download${viewable ? '?view=true' : ''}`;
            const target = viewable ? 'target="_blank"' : '';

            return `
                <tr>
                    <td data-label="Title">
                        <div class="file-title">
                            <strong>${file.title}</strong>
                            <span class="file-category">${file.category_name || 'Uncategorised'}</span>
                        </div>
                    </td>
                    <td data-label="Author">${file.author}</td>
                    <td data-label="Date">
                        <span class="full-date">${new Date(file.date).toLocaleDateString('en-GB')}</span>
                        <span class="short-date">
                            <span>${new Date(file.date).getDate().toString().padStart(2, '0')}</span>
                            <span>${new Date(file.date).toLocaleString('en-GB', { month: 'short' })}</span>
                            <span>${new Date(file.date).getFullYear().toString().slice(-2)}</span>
                        </span>
                    </td>
                    <td data-label="Size">${formatSize(file.size)}</td>
                    <td data-label="Action">
                        <a href="${downloadUrl}" class="download-btn" title="${viewable ? 'View' : 'Download'}" ${target}>
                            ${CLOUD_DOWNLOAD_SVG}
                        </a>
                    </td>
                </tr>
            `;
        }).join('');

        const pager = new Pagination(document.getElementById('files-pagination'), (page) => {
            currentOptions.page = page;
            fetchFiles();
        });
        pager.render(currentOptions.page, totalPages);
    } catch (e) {
        list.innerHTML = '<tr><td colspan="5" class="text-centre error">Failed to load files.</td></tr>';
    }
}

// Router subscription
ViewChangedEvent.subscribe(async ({ viewId }) => {
    if (viewId === 'files') {
        await checkManagePermissions();
        await loadCategories();
        await fetchFiles();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

    // Filter and Search Listeners
    document.addEventListener('input', (e) => {
        if (e.target.id === 'file-search') {
            currentOptions.search = e.target.value;
            currentOptions.page = 1;
            fetchFiles();
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.id === 'category-filter') {
            currentOptions.categoryId = e.target.value;
            currentOptions.page = 1;
            fetchFiles();
        }
    });
});