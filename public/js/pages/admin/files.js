import { adminContentID, renderAdminNavBar } from './common.js';
import { ajaxGet, ajaxPost, ajaxDelete, ajaxPut } from '../../utils/ajax.js';
import { switchView } from '../../utils/view.js';
import { notify, NotificationTypes } from '../../components/notification.js';
import { BACKUP_SVG, CLOUD_DOWNLOAD_SVG, CLOSE_SVG, SEARCH_SVG, INFO_SVG, CALENDAR_TODAY_SVG, PERSON_SVG, UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG } from '../../../images/icons/outline/icons.js';

/**
 * Admin interface for managing files and categories.
 * @module AdminFiles
 */

let currentOptions = {
    page: 1,
    limit: 15,
    search: '',
    sort: 'date',
    order: 'desc',
    categoryId: ''
};

export async function renderAdminFiles() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    adminContent.innerHTML = /*html*/`
        <div class="admin-controls-container">
            <div class="admin-nav-row">
                ${await renderAdminNavBar('files')}
            </div>
            
            <div class="admin-tools-row">
                <div class="search-input-wrapper">
                    <input type="text" id="admin-file-search-input" placeholder="Search files..." value="${currentOptions.search}">
                    <button id="admin-file-search-btn" title="Search">
                        ${SEARCH_SVG}
                    </button>
                </div>
                <div class="admin-actions">
                    <select id="admin-category-filter" style="margin-bottom: 0; width: auto; min-width: 150px;">
                        <option value="">All Categories</option>
                    </select>
                    <button id="manage-categories-btn" class="secondary">Categories</button>
                    <button id="upload-files-btn" class="primary">Upload Files</button>
                </div>
            </div>

            <div id="files-admin-content">
                <div class="files-table-wrapper">
                    <table class="admin-table files-table">
                        <thead id="files-table-head"></thead>
                        <tbody id="admin-files-list">
                            <tr><td colspan="6" class="text-center">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="admin-files-pagination" class="pagination"></div>
        </div>

        <!-- Multi-Upload Modal -->
        <dialog id="upload-files-modal">
            <article>
                <header>
                    <a href="#close" aria-label="Close" class="close" id="close-upload-modal"></a>
                    <h3>Upload Files</h3>
                </header>
                <form id="multi-upload-form">
                    <label>Select Files
                        <input type="file" id="upload-files" name="files" multiple required>
                    </label>
                    <div class="grid">
                        <label>Category
                            <select class="category-select" name="categoryId" required></select>
                        </label>
                        <label>Visibility
                            <select name="visibility">
                                <option value="members">Members</option>
                                <option value="public">Public</option>
                                <option value="execs">Execs Only</option>
                            </select>
                        </label>
                    </div>
                    <footer>
                        <button type="submit">Upload All</button>
                    </footer>
                </form>
            </article>
        </dialog>

        <!-- Edit File Modal -->
        <dialog id="edit-file-modal">
            <article>
                <header>
                    <a href="#close" aria-label="Close" class="close" id="close-edit-modal"></a>
                    <h3>Edit File</h3>
                </header>
                <form id="edit-file-form">
                    <input type="hidden" name="id">
                    <label>Title
                        <input type="text" name="title" required>
                    </label>
                    <div class="grid">
                        <label>Author
                            <input type="text" name="author" required>
                        </label>
                        <label>Date
                            <input type="date" name="date" required>
                        </label>
                    </div>
                    <div class="grid">
                        <label>Category
                            <select class="category-select" name="categoryId" required></select>
                        </label>
                        <label>Visibility
                            <select name="visibility">
                                <option value="members">Members</option>
                                <option value="public">Public</option>
                                <option value="execs">Execs Only</option>
                            </select>
                        </label>
                    </div>
                    <footer>
                        <button type="submit">Save Changes</button>
                    </footer>
                </form>
            </article>
        </dialog>

        <!-- Category Management Modal -->
        <dialog id="categories-modal">
            <article style="max-width: 600px; width: 100%;">
                <header>
                    <a href="#close" aria-label="Close" class="close" id="close-categories-modal"></a>
                    <h3>File Categories</h3>
                </header>
                <div id="categories-list-container"></div>
                <form id="new-category-form">
                    <div class="grid">
                        <input type="text" name="name" placeholder="New Category Name" required>
                        <select name="default_visibility">
                            <option value="members">Default: Members</option>
                            <option value="public">Default: Public</option>
                            <option value="execs">Default: Execs</option>
                        </select>
                        <button type="submit">Add</button>
                    </div>
                </form>
            </article>
        </dialog>
    `;

    setupEventListeners();
    await Promise.all([
        loadAdminFiles(),
        loadAdminCategories()
    ]);
}

async function loadAdminFiles() {
    const list = document.getElementById('admin-files-list');
    const thead = document.getElementById('files-table-head');
    if (!list || !thead) return;

    const columns = [
        { key: 'title', label: 'Title', sort: 'title' },
        { key: 'category_name', label: 'Category', sort: 'category_name' },
        { key: 'author', label: 'Author', sort: 'author' },
        { key: 'visibility', label: 'Visibility', sort: 'visibility' },
        { key: 'date', label: 'Date', sort: 'date' }
    ];

    thead.innerHTML = `<tr>${columns.map(c => `
        <th class="sortable" data-sort="${c.sort}">
            ${c.label} ${currentOptions.sort === c.sort ? (currentOptions.order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG}
        </th>
    `).join('')}<th>Actions</th></tr>`;

    thead.querySelectorAll('th.sortable').forEach(th => {
        th.onclick = () => {
            const field = th.dataset.sort;
            if (currentOptions.sort === field) {
                currentOptions.order = currentOptions.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentOptions.sort = field;
                currentOptions.order = 'asc';
            }
            loadAdminFiles();
        };
    });

    const query = new URLSearchParams(currentOptions).toString();
    try {
        const res = await ajaxGet(`/api/files?${query}`);
        const { files, totalPages } = res.data;
        
        if (files.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center">No files found.</td></tr>';
            return;
        }

        list.innerHTML = files.map(file => `
            <tr>
                <td><strong>${file.title}</strong></td>
                <td>${file.category_name || 'Uncategorized'}</td>
                <td>${file.author}</td>
                <td><span class="tag-badge">${file.visibility}</span></td>
                <td>
                    <span class="full-date">${new Date(file.date).toLocaleDateString('en-GB')}</span>
                    <span class="short-date">
                        <span>${new Date(file.date).getDate().toString().padStart(2, '0')}</span>
                        <span>${new Date(file.date).toLocaleString('en-GB', { month: 'short' })}</span>
                        <span>${new Date(file.date).getFullYear().toString().slice(-2)}</span>
                    </span>
                </td>
                <td>
                    <div class="admin-row-actions">
                        <button class="status-btn edit-file" data-id="${file.id}" title="Edit">Edit</button>
                        <button class="status-btn error delete-file" data-id="${file.id}" title="Delete">${CLOSE_SVG}</button>
                    </div>
                </td>
            </tr>
        `).join('');

        renderAdminPagination(totalPages);
    } catch (e) {
        list.innerHTML = '<tr><td colspan="6" class="text-center error">Error loading files.</td></tr>';
    }
}

function renderAdminPagination(totalPages) {
    const container = document.getElementById('admin-files-pagination');
    if (!container) return;

    let html = '';
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentOptions.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    container.innerHTML = html;
}

async function loadAdminCategories() {
    const filter = document.getElementById('admin-category-filter');
    if (!filter) return;

    try {
        const res = await ajaxGet('/api/file-categories');
        const categories = res.data || [];
        filter.innerHTML = '<option value="">All Categories</option>' + 
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        filter.value = currentOptions.categoryId;
    } catch (e) {
        console.error('Failed to load categories', e);
    }
}

async function loadCategorySelects() {
    try {
        const res = await ajaxGet('/api/file-categories');
        const cats = res.data || [];
        const selects = document.querySelectorAll('.category-select');
        selects.forEach(sel => {
            sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        });
    } catch (e) {}
}

async function loadCategoriesList() {
    const container = document.getElementById('categories-list-container');
    try {
        const res = await ajaxGet('/api/file-categories');
        const cats = res.data || [];
        container.innerHTML = cats.map(c => `
            <div class="category-item">
                <input type="text" class="cat-name-input" value="${c.name}" data-id="${c.id}" style="margin: 0; flex: 1; min-width: 100px;">
                <select class="cat-visibility-select" data-id="${c.id}" style="margin: 0; width: auto; margin-left: 0.5rem;">
                    <option value="members" ${c.default_visibility === 'members' ? 'selected' : ''}>Members</option>
                    <option value="public" ${c.default_visibility === 'public' ? 'selected' : ''}>Public</option>
                    <option value="execs" ${c.default_visibility === 'execs' ? 'selected' : ''}>Execs</option>
                </select>
                <div class="admin-row-actions" style="margin-left: 0.5rem;">
                    <button class="status-btn error delete-cat" data-id="${c.id}" title="Delete">${CLOSE_SVG}</button>
                </div>
            </div>
        `).join('');
    } catch (e) {}
}

function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('admin-file-search-input');
    const searchBtn = document.getElementById('admin-file-search-btn');

    if (searchBtn) {
        searchBtn.onclick = () => {
            currentOptions.search = searchInput.value;
            currentOptions.page = 1;
            loadAdminFiles();
        };
    }
    if (searchInput) {
        searchInput.onkeypress = (e) => {
            if (e.key === 'Enter') searchBtn.click();
        };
    }

    // Filter
    const categoryFilter = document.getElementById('admin-category-filter');
    if (categoryFilter) {
        categoryFilter.onchange = (e) => {
            currentOptions.categoryId = e.target.value;
            currentOptions.page = 1;
            loadAdminFiles();
        };
    }

    // Pagination
    document.addEventListener('click', (e) => {
        const pageBtn = e.target.closest('.page-btn');
        if (pageBtn && e.target.closest('#admin-files-pagination')) {
            currentOptions.page = parseInt(pageBtn.dataset.page);
            loadAdminFiles();
            return;
        }
    });

    // Modal controls
    const uploadBtn = document.getElementById('upload-files-btn');
    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            await loadCategorySelects();
            document.getElementById('upload-files-modal').showModal();
        };
    }
    document.getElementById('close-upload-modal').onclick = () => document.getElementById('upload-files-modal').close();

    const manageCatsBtn = document.getElementById('manage-categories-btn');
    if (manageCatsBtn) {
        manageCatsBtn.onclick = async () => {
            await loadCategoriesList();
            document.getElementById('categories-modal').showModal();
        };
    }
    document.getElementById('close-categories-modal').onclick = () => document.getElementById('categories-modal').close();
    document.getElementById('close-edit-modal').onclick = () => document.getElementById('edit-file-modal').close();

    // Multi-Upload
    const multiUploadForm = document.getElementById('multi-upload-form');
    if (multiUploadForm) {
        multiUploadForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const files = document.getElementById('upload-files').files;
            
            const uploadData = new FormData();
            for (let i = 0; i < files.length; i++) {
                uploadData.append('files', files[i]);
            }
            uploadData.append('categoryId', formData.get('categoryId'));
            uploadData.append('visibility', formData.get('visibility'));

            try {
                const res = await fetch('/api/files', {
                    method: 'POST',
                    body: uploadData
                });
                if (res.ok) {
                    document.getElementById('upload-files-modal').close();
                    await loadAdminFiles();
                }
            } catch (e) {
                console.error('Upload failed', e);
            }
        };
    }

    // Edit File
    const editFileForm = document.getElementById('edit-file-form');
    if (editFileForm) {
        editFileForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const id = formData.get('id');
            try {
                await ajaxPut(`/api/files/${id}`, {
                    title: formData.get('title'),
                    author: formData.get('author'),
                    date: formData.get('date'),
                    categoryId: formData.get('categoryId'),
                    visibility: formData.get('visibility')
                });
                document.getElementById('edit-file-modal').close();
                await loadAdminFiles();
            } catch (e) {}
        };
    }

    // Category Creation
    const newCatForm = document.getElementById('new-category-form');
    if (newCatForm) {
        newCatForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await ajaxPost('/api/file-categories', {
                    name: formData.get('name'),
                    default_visibility: formData.get('default_visibility')
                });
                e.target.reset();
                await loadCategoriesList();
                await loadAdminCategories(); // Refresh the filter dropdown
            } catch (e) {}
        };
    }

    // Interaction Listeners (Delete and Edit)
    const handleActionClick = async (e) => {
        const editBtn = e.target.closest('.edit-file');
        if (editBtn) {
            const id = editBtn.dataset.id;
            await loadCategorySelects();
            const res = await ajaxGet(`/api/files?limit=1000`); // Simple fetch for now
            const file = res.data.files.find(f => f.id == id);
            
            if (file) {
                const form = document.getElementById('edit-file-form');
                form.elements['id'].value = file.id;
                form.elements['title'].value = file.title;
                form.elements['author'].value = file.author;
                form.elements['date'].value = file.date.split('T')[0];
                form.elements['categoryId'].value = file.category_id || '';
                form.elements['visibility'].value = file.visibility;
                document.getElementById('edit-file-modal').showModal();
            }
        }

        if (e.target.closest('.delete-file')) {
            const id = e.target.closest('.delete-file').dataset.id;
            if (confirm('Are you sure you want to delete this file?')) {
                await ajaxDelete(`/api/files/${id}`);
                await loadAdminFiles();
            }
        }
        if (e.target.closest('.delete-cat')) {
            const id = e.target.closest('.delete-cat').dataset.id;
            if (confirm('Delete category? Files in this category will be uncategorized.')) {
                await ajaxDelete(`/api/file-categories/${id}`);
                await loadCategoriesList();
                await loadAdminCategories();
            }
        }
    };
    
    const list = document.getElementById('admin-files-list');
    if (list) list.onclick = handleActionClick;

    const catList = document.getElementById('categories-list-container');
    if (catList) {
        catList.onclick = handleActionClick;
        
        // Auto-save for categories
        catList.onchange = async (e) => {
            const id = e.target.dataset.id;
            const container = e.target.closest('.category-item');
            if (!id || !container) return;
            
            const name = container.querySelector('.cat-name-input').value;
            const visibility = container.querySelector('.cat-visibility-select').value;
            
            try {
                await ajaxPut(`/api/file-categories/${id}`, {
                    name: name,
                    default_visibility: visibility
                });
                await loadAdminCategories();
                notify('Success', 'Category updated', NotificationTypes.SUCCESS);
            } catch (e) {
                notify('Error', 'Failed to update category', NotificationTypes.ERROR);
            }
        };
    }
}