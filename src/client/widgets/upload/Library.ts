import { apiRequest } from '@/utils/api';
import { SEARCH_SVG, FILTER_LIST_SVG } from '@/utils/icons';
import { escapeHTML } from '@/utils/utils';

interface LibraryOptions {
    exclude?: string[];
}

interface LibraryContainer extends HTMLElement {
    _libraryParams?: {
        onSelect: (url: string, id: number | null) => void;
        options: LibraryOptions;
    };
}

/**
 * Renders the image library into a container.
 */
export async function renderLibrary(
    container: HTMLElement | null, 
    onSelect: (url: string, id: number | null) => void, 
    options: LibraryOptions = {}
): Promise<void> {
    if (!container) return;

    const exclude = options.exclude || [];
    let currentSearch = '';
    let currentCategory = '';

    container.innerHTML = /*html*/`
        <div class="library-modal-content">
            <div class="library-controls">
                <div class="glass-input-group liquid-container search-box">
                    <span class="icon">${SEARCH_SVG}</span>
                    <input type="text" placeholder="Search images..." class="lib-search-input">
                </div>
                <div class="glass-input-group liquid-container category-filter">
                    <span class="icon">${FILTER_LIST_SVG}</span>
                    <select class="lib-category-select">
                        <option value="">All Categories</option>
                    </select>
                </div>
            </div>
            <div class="library-grid">
                <div class="loading-cell text-centre" style="grid-column: 1/-1; padding: 3rem;">Loading Library...</div>
            </div>
        </div>
    `;

    const grid = container.querySelector('.library-grid') as HTMLElement;
    const searchInput = container.querySelector('.lib-search-input') as HTMLInputElement;
    const categorySelect = container.querySelector('.lib-category-select') as HTMLSelectElement;

    (container as LibraryContainer)._libraryParams = { onSelect, options };

    // Fetch categories
    apiRequest('GET', '/api/file-categories').then(res => {
        const cats = res.data || [];
        cats.forEach((cat: any) => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            categorySelect.appendChild(opt);
        });
    });

    const loadFiles = async () => {
        grid.innerHTML = '<div class="loading-cell text-centre" style="grid-column: 1/-1; padding: 3rem;">Loading Library...</div>';
        try {
            const query = new URLSearchParams({
                limit: '50',
                search: currentSearch,
                categoryId: currentCategory,
                includeUsed: 'true'
            });
            const res = await apiRequest('GET', `/api/files?${query.toString()}`);
            const files = (res.data?.files || []).filter((f: any) => {
                const isImage = f.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                const isExcluded = exclude.includes(f.id.toString()) || exclude.includes(`/api/files/${f.id}/download?view=true`);
                return isImage && !isExcluded;
            });

            grid.innerHTML = '';

            if (files.length === 0) {
                grid.innerHTML = '<div class="empty-cell text-centre" style="grid-column: 1/-1; padding: 3rem;">No images found.</div>';
                return;
            }

            files.forEach((f: any) => {
                const url = `/api/files/${f.id}/download?view=true`;
                const item = document.createElement('div');
                item.className = 'library-item';
                item.innerHTML = /*html*/`
                    <div class="lib-img-wrapper">
                        <img src="${url}" alt="${escapeHTML(f.title)}" loading="lazy">
                    </div>
                    <span>${escapeHTML(f.title)}</span>
                `;
                item.onclick = () => onSelect(url, f.id);
                grid.appendChild(item);
            });
        } catch (e) {
            console.error(e);
            grid.innerHTML = '<div class="error-cell text-centre" style="grid-column: 1/-1; padding: 3rem;">Failed to load library.</div>';
        }
    };

    searchInput.addEventListener('input', (e) => {
        currentSearch = (e.target as HTMLInputElement).value;
        loadFiles();
    });

    categorySelect.addEventListener('change', (e) => {
        currentCategory = (e.target as HTMLSelectElement).value;
        loadFiles();
    });

    await loadFiles();
}

/**
 * Refreshes the library content if it was previously rendered in the container.
 */
export async function refreshLibrary(container: HTMLElement | null): Promise<void> {
    const libContainer = container as LibraryContainer;
    if (libContainer && libContainer._libraryParams) {
        const { onSelect, options } = libContainer._libraryParams;
        return renderLibrary(libContainer, onSelect, options);
    }
}