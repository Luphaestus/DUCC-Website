/**
 * files.js
 * 
 * Administrative interface for managing club files and categories.
 * 
 * Registered Route: /admin/files
 */

import { adminContentID, renderAdminNavBar } from './admin.js';
import { apiRequest } from '../../utils/api.js';
import { switchView } from '../../utils/view.js';
import { UploadWidget } from '@/widgets/upload/UploadWidget';
import { notify, NotificationTypes } from '../../components/notification.js';
import { Panel } from '@/widgets/panel';
import { SEARCH_SVG, UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, DELETE_SVG, EDIT_SVG, UPLOAD_SVG, FOLDER_SVG, CLOSE_SVG } from '@/utils/icons';
import { Modal } from '@/widgets/Modal';
import { Pagination } from '@/widgets/Pagination';
import { showConfirmModal } from '@/utils/modal';

let currentOptions: Record<string, any> = {
    page: 1,
    limit: 15,
    search: '',
    sort: 'date',
    order: 'desc',
    categoryId: ''
};

let uploadModal: Modal | null = null;
let editModal: Modal | null = null;
let categoriesModal: Modal | null = null;

/**
 * Main rendering function for the admin files dashboard.
 * Sets up the layout, modals, and initial data fetch.
 */
export async function renderAdminFiles(): Promise<void> {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    uploadModal = new Modal({
        id: 'upload-files-modal',
        title: 'Upload Files',
        contentClasses: 'glass-panel',
        content: /*html*/`
            <form id="multi-upload-form" class="modern-form">
                <div id="bulk-upload-widget"></div>
                <div class="grid-2-col">
                    <label>Category
                        <select class="category-select modern-select" name="categoryId" required></select>
                    </label>
                    <label>Visibility
                        <select name="visibility" class="modern-select">
                            <option value="members">Members</option>
                            <option value="public">Public</option>
                            <option value="execs">Execs Only</option>
                        </select>
                    </label>
                </div>
                <footer>
                    <button type="submit" class="wide-btn">Upload All</button>
                </footer>
            </form>
        `
    });

    editModal = new Modal({
        id: 'edit-file-modal',
        title: 'Edit File',
        contentClasses: 'glass-panel',
        content: /*html*/`
            <form id="edit-file-form" class="modern-form">
                <input type="hidden" name="id">
                <label>Title
                    <input type="text" name="title" required>
                </label>
                <div class="grid-2-col">
                    <label>Author
                        <input type="text" name="author" required>
                    </label>
                    <label>Date
                        <input type="date" name="date" required>
                    </label>
                </div>
                <div class="grid-2-col">
                    <label>Category
                        <select class="category-select modern-select" name="categoryId" required></select>
                    </label>
                    <label>Visibility
                        <select name="visibility" class="modern-select">
                            <option value="members">Members</option>
                            <option value="public">Public</option>
                            <option value="execs">Execs Only</option>
                        </select>
                    </label>
                </div>
                <footer>
                    <button type="submit" class="wide-btn">Save Changes</button>
                </footer>
            </form>
        `
    });

    categoriesModal = new Modal({
        id: 'categories-modal',
        title: 'Manage Categories',
        contentClasses: 'glass-panel',
        content: /*html*/`
            <div id="categories-list-container" class="categories-list"></div>
            <form id="new-category-form" class="inline-add-form">
                <input type="text" name="name" placeholder="New Category Name" required class="flex-grow">
                <select name="default_visibility" class="modern-select compact">
                    <option value="members">Members</option>
                    <option value="public">Public</option>
                    <option value="execs">Execs</option>
                </select>
                <button type="submit" class="icon-btn">${UPLOAD_SVG}</button>
            </form>
        `
    });

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <div class="glass-toolbar">
                ${await renderAdminNavBar('files')}
                <div class="toolbar-content">
                    <div class="toolbar-left">
                        <div class="search-bar">
                            <input type="text" id="admin-file-search-input" placeholder="Search title, content or filename: content:" value="${currentOptions.search}">
                            <button id="admin-file-search-btn" class="search-icon-btn" title="Search">
                                ${SEARCH_SVG}
                            </button>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <select id="admin-category-filter" class="modern-select compact">
                            <option value="">All Categories</option>
                        </select>
                        <button id="manage-categories-btn" class="small-btn outline secondary">${FOLDER_SVG} Categories</button>
                        <button id="upload-files-btn" class="small-btn">${UPLOAD_SVG} Upload</button>
                    </div>
                </div>
            </div>

            ${Panel({
        content: /*html*/`
                    <div id="files-admin-content" class="glass-table-container">
                        <div class="table-responsive">
                            <table class="glass-table files-table">
                                <thead id="files-table-head"></thead>
                                <tbody id="admin-files-list">
                                    <tr><td colspan="6" class="loading-cell">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div id="admin-files-pagination" class="pagination"></div>
                `
    })}
        </div>

        ${uploadModal.getHTML()}
        ${editModal.getHTML()}
        ${categoriesModal.getHTML()}
    `;

    setupEventListeners();
    await Promise.all([
        loadAdminFiles(),
        loadAdminCategories()
    ]);
}

/**
 * Fetches and renders the list of files for administration.
 */
async function loadAdminFiles(): Promise<void> {
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

    thead.innerHTML = /*html*/`<tr>${columns.map(c => `
        <th class="sortable" data-sort="${c.sort}" data-label="${c.label}">
            ${c.label} ${currentOptions.sort === c.sort ? (currentOptions.order === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG}
        </th>
    `).join('')}<th data-label="Actions" class="action-col">Actions</th></tr>`;
    thead.querySelectorAll('th.sortable').forEach(th => {
        (th as HTMLElement).onclick = () => {
            const field = (th as HTMLElement).dataset.sort;
            if (currentOptions.sort === field) {
                currentOptions.order = currentOptions.order === 'asc' ? 'desc' : 'asc';
            } else {
                currentOptions.sort = field;
                currentOptions.order = 'asc';
            }
            loadAdminFiles();
        };
    });

    const queryParams: Record<string, string> = {};
    Object.keys(currentOptions).forEach(key => {
        queryParams[key] = String(currentOptions[key]);
    });
    const query = new URLSearchParams(queryParams).toString();
    try {
        const res = await apiRequest('GET', `/api/files?${query}`);
        const { files, totalPages } = res.data;

        if (files.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="empty-cell">No files found.</td></tr>';
            return;
        }

        list.innerHTML = (files as any[]).map(file => /*html*/`
            <tr>
                <td data-label="Title" class="primary-text"><strong>${file.title}</strong></td>
                <td data-label="Category"><span class="badge neutral">${file.category_name || 'Uncategorised'}</span></td>
                <td data-label="Author">${file.author}</td>
                <td data-label="Visibility"><span class="tag-badge ${file.visibility}">${file.visibility}</span></td>
                <td data-label="Date">
                    <span class="full-date">${new Date(file.date).toLocaleDateString('en-GB')}</span>
                </td>
                <td data-label="Actions">
                    <div class="row-actions">
                        <button class="icon-btn edit-file" data-id="${file.id}" title="Edit">${EDIT_SVG}</button>
                        <button class="icon-btn delete-file delete" data-id="${file.id}" title="Delete">${DELETE_SVG}</button>
                    </div>
                </td>
            </tr>
        `).join('');

        const paginationEl = document.getElementById('admin-files-pagination');
        if (paginationEl) {
            const pager = new Pagination(paginationEl, (page) => {
                currentOptions.page = page;
                loadAdminFiles();
            });
            pager.render(currentOptions.page, totalPages);
        }
    } catch (e) {
        list.innerHTML = '<tr><td colspan="6" class="error-cell">Error loading files.</td></tr>';
    }
}

/**
 * Fetches and populates the toolbar category filter.
 */
async function loadAdminCategories(): Promise<void> {
    const filter = document.getElementById('admin-category-filter') as HTMLSelectElement | null;
    if (!filter) return;

    try {
        const res = await apiRequest('GET', '/api/file-categories');
        const categories = res.data || [];
        filter.innerHTML = /*html*/`<option value="">All Categories</option>` +
            categories.map((c: any) => `<option value="${c.id}">${c.name}</option>`).join('');
        filter.value = currentOptions.categoryId;
    } catch (e) {
        console.error('Failed to load categories', e);
    }
}

/**
 * Synchronizes all category selection dropdowns in modals with the latest data.
 */
async function loadCategorySelects(): Promise<void> {
    try {
        const res = await apiRequest('GET', '/api/file-categories');
        const cats = res.data || [];
        const selects = document.querySelectorAll('.category-select');
        selects.forEach(sel => {
            sel.innerHTML = cats.map((c: any) => `<option value="${c.id}">${c.name}</option>`).join('');
        });
    } catch (e) { }
}

/**
 * Populates the category management modal list.
 */
async function loadCategoriesList(): Promise<void> {
    const container = document.getElementById('categories-list-container');
    if (!container) return;
    try {
        const res = await apiRequest('GET', '/api/file-categories');
        const cats = res.data || [];
        container.innerHTML = cats.map((c: any) => /*html*/`
            <div class="category-item">
                <input type="text" class="cat-name-input compact-input" value="${c.name}" data-id="${c.id}">
                <select class="cat-visibility-select modern-select compact" data-id="${c.id}">
                    <option value="members" ${c.default_visibility === 'members' ? 'selected' : ''}>Members</option>
                    <option value="public" ${c.default_visibility === 'public' ? 'selected' : ''}>Public</option>
                    <option value="execs" ${c.default_visibility === 'execs' ? 'selected' : ''}>Execs</option>
                </select>
                <button class="icon-btn delete-cat delete" data-id="${c.id}" title="Delete">${DELETE_SVG}</button>
            </div>
        `).join('');
    } catch (e) { }
}

/**
 * Sets up listeners for searching, filtering, pagination, and modal controls.
 */
function setupEventListeners(): void {
    // --- Search ---
    const searchInput = document.getElementById('admin-file-search-input') as HTMLInputElement | null;
    const searchBtn = document.getElementById('admin-file-search-btn');

    if (searchBtn && searchInput) {
        searchBtn.onclick = () => {
            currentOptions.search = searchInput.value;
            currentOptions.page = 1;
            loadAdminFiles();
        };
        searchInput.onkeypress = (e) => {
            if (e.key === 'Enter') searchBtn.click();
        };
    }

    // --- Filter ---
    const categoryFilter = document.getElementById('admin-category-filter') as HTMLSelectElement | null;
    if (categoryFilter) {
        categoryFilter.onchange = (e: Event) => {
            currentOptions.categoryId = (e.target as HTMLSelectElement).value;
            currentOptions.page = 1;
            loadAdminFiles();
        };
    }

    // --- Modal Toggles ---
    if (uploadModal) uploadModal.attachListeners();
    if (editModal) editModal.attachListeners();
    if (categoriesModal) categoriesModal.attachListeners();

    const uploadBtn = document.getElementById('upload-files-btn');
    if (uploadBtn) {
        uploadBtn.onclick = async () => {
            await loadCategorySelects();
            if (uploadModal) uploadModal.show();
        };
    }

    const manageCatsBtn = document.getElementById('manage-categories-btn');
    if (manageCatsBtn) {
        manageCatsBtn.onclick = async () => {
            await loadCategoriesList();
            if (categoriesModal) categoriesModal.show();
        };
    }

    // --- Bulk File Upload Widget ---
    const uploadWidget = new UploadWidget('bulk-upload-widget', {
        mode: 'modal',
        selectMode: 'multiple',
        autoUpload: false,
        onUploadComplete: async () => {
            if (uploadModal) uploadModal.close();
            await loadAdminFiles();
            notify('Success', 'Files uploaded', 'success');
            uploadWidget.reset();
        }
    });

    // --- Bulk File Upload Submit ---
    const multiUploadForm = document.getElementById('multi-upload-form') as HTMLFormElement | null;
    if (multiUploadForm) {
        multiUploadForm.onsubmit = async (e: Event) => {
            e.preventDefault();
            if (uploadWidget.files.length === 0) {
                notify('Warning', 'Please select files to upload', NotificationTypes.WARNING);
                return;
            }

            const formData = new FormData(e.target as HTMLFormElement);
            uploadWidget.manualUpload({
                categoryId: formData.get('categoryId') as string,
                visibility: formData.get('visibility') as string
            });
        };
    }

    // --- Edit File Details ---
    const editFileForm = document.getElementById('edit-file-form') as HTMLFormElement | null;
    if (editFileForm) {
        editFileForm.onsubmit = async (e: Event) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const id = formData.get('id');
            try {
                await apiRequest('PUT', `/api/files/${id}`, {
                    title: formData.get('title'),
                    author: formData.get('author'),
                    date: formData.get('date'),
                    categoryId: formData.get('categoryId'),
                    visibility: formData.get('visibility')
                });
                if (editModal) editModal.close();
                await loadAdminFiles();
                notify('Success', 'File updated', 'success');
            } catch (e) {
                notify('Error', 'Update failed', 'error');
            }
        };
    }

    // --- Category Creation ---
    const newCatForm = document.getElementById('new-category-form') as HTMLFormElement | null;
    if (newCatForm) {
        newCatForm.onsubmit = async (e: Event) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            try {
                await apiRequest('POST', '/api/file-categories', {
                    name: formData.get('name'),
                    default_visibility: formData.get('default_visibility')
                });
                (e.target as HTMLFormElement).reset();
                await loadCategoriesList();
                await loadAdminCategories(); // Refresh toolbar filter
                notify('Success', 'Category created', 'success');
            } catch (e) {
                notify('Error', 'Creation failed', 'error');
            }
        };
    }

    // --- Row Action Dispatcher ---
    const handleActionClick = async (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        // Edit File
        const editBtn = target.closest('.edit-file') as HTMLElement | null;
        if (editBtn) {
            const id = editBtn.dataset.id;
            await loadCategorySelects();
            const res = await apiRequest('GET', `/api/files?limit=1000`);
            const file = res.data.files.find((f: any) => f.id == id);

            if (file) {
                const form = document.getElementById('edit-file-form') as HTMLFormElement | null;
                if (form) {
                    (form.elements.namedItem('id') as HTMLInputElement).value = file.id;
                    (form.elements.namedItem('title') as HTMLInputElement).value = file.title;
                    (form.elements.namedItem('author') as HTMLInputElement).value = file.author;
                    (form.elements.namedItem('date') as HTMLInputElement).value = file.date.split('T')[0];
                    (form.elements.namedItem('categoryId') as HTMLSelectElement).value = file.category_id || '';
                    (form.elements.namedItem('visibility') as HTMLSelectElement).value = file.visibility;
                    if (editModal) editModal.show();
                }
            }
        }

        // Delete File
        const deleteFileBtn = target.closest('.delete-file') as HTMLElement | null;
        if (deleteFileBtn) {
            const id = deleteFileBtn.dataset.id;
            if (await showConfirmModal('Delete File', 'Are you sure you want to delete this file?')) {
                await apiRequest('DELETE', `/api/files/${id}`);
                await loadAdminFiles();
                notify('Success', 'File deleted', 'success');
            }
        }

        // Delete Category
        const deleteCatBtn = target.closest('.delete-cat') as HTMLElement | null;
        if (deleteCatBtn) {
            const id = deleteCatBtn.dataset.id;
            if (await showConfirmModal('Delete Category', 'Delete category? Files in this category will be uncategorised.')) {
                await apiRequest('DELETE', `/api/file-categories/${id}`);
                await loadCategoriesList();
                await loadAdminCategories();
                notify('Success', 'Category removed', 'success');
            }
        }
    };

    const list = document.getElementById('admin-files-list');
    if (list) list.onclick = handleActionClick;

    const catList = document.getElementById('categories-list-container');
    if (catList) {
        catList.onclick = handleActionClick;

        catList.onchange = async (e: Event) => {
            const target = e.target as HTMLElement;
            const id = target.dataset.id;
            const container = target.closest('.category-item');
            if (!id || !container) return;

            const name = (container.querySelector('.cat-name-input') as HTMLInputElement).value;
            const visibility = (container.querySelector('.cat-visibility-select') as HTMLSelectElement).value;

            try {
                await apiRequest('PUT', `/api/file-categories/${id}`, {
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