//todo refine 

import { apiRequest } from '/js/utils/api.js';

/**
 * Renders the image library into a container.
 * 
 * @param {HTMLElement} container - The container to render the grid into.
 * @param {Function} onSelect - Callback(url, id) when an image is selected.
 * @param {object} options
 * @param {string[]} [options.exclude=[]] - List of URLs or IDs to exclude from the library.
 */
export async function renderLibrary(container, onSelect, options = {}) {
    if (!container) return;

    const exclude = options.exclude || [];

    container.innerHTML = /*html*/`
        <div class="image-library-grid">
            <p class="loading-cell">Loading images...</p>
        </div>
    `;

    const grid = container.querySelector('.image-library-grid');

    container._libraryParams = { onSelect, options };

    try {
        const [filesRes, slidesRes] = await Promise.all([
            apiRequest('GET', '/api/files?limit=50&includeUsed=true'),
            apiRequest('GET', '/api/slides/images')
        ]);

        const files = (filesRes.data?.files || []).filter(f => {
            const isImage = f.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i);
            const isExcluded = exclude.includes(f.id) || exclude.includes(`/api/files/${f.id}/download?view=true`);
            return isImage && !isExcluded;
        });
        
        const slides = (slidesRes.images || []).filter(url => !exclude.includes(url));

        grid.innerHTML = '';

        slides.forEach(url => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.style.backgroundImage = `url('${url}')`;
            item.title = url;
            item.onclick = () => onSelect(url, null);
            grid.appendChild(item);
        });

        files.forEach(f => {
            const url = `/api/files/${f.id}/download?view=true`;
            const item = document.createElement('div');
            item.className = 'image-item';
            item.style.backgroundImage = `url('${url}')`;
            item.title = f.title;
            item.onclick = () => onSelect(url, f.id);
            grid.appendChild(item);
        });

        if (slides.length === 0 && files.length === 0) {
            grid.innerHTML = '<p class="empty-cell">No images found.</p>';
        }

    } catch (e) {
        console.error(e);
        grid.innerHTML = '<p class="error-cell">Failed to load library.</p>';
    }
}

/**
 * Refreshes the library content if it was previously rendered in the container.
 * @param {HTMLElement} container 
 */
export async function refreshLibrary(container) {
    if (container && container._libraryParams) {
        const { onSelect, options } = container._libraryParams;
        return renderLibrary(container, onSelect, options);
    }
}