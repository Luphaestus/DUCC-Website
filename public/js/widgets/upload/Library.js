//todo refine

import { apiRequest } from '/js/utils/api.js';

/**
 * Renders the image library into a container.
 * 
 * @param {HTMLElement} container - The container to render the grid into.
 * @param {Function} onSelect - Callback(url, id) when an image is selected.
 */
export async function renderLibrary(container, onSelect) {
    if (!container) return;

    container.innerHTML = /*html*/`
        <div class="image-library-grid">
            <p class="loading-cell">Loading images...</p>
        </div>
    `;

    const grid = container.querySelector('.image-library-grid');

    try {
        const [filesRes, slidesRes] = await Promise.all([
            apiRequest('GET', '/api/files?limit=50'),
            apiRequest('GET', '/api/slides/images')
        ]);

        const files = (filesRes.data?.files || []).filter(f => f.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i));
        const slides = slidesRes.images || [];

        grid.innerHTML = '';
        
        // Custom slides
        slides.forEach(url => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.style.backgroundImage = `url('${url}')`;
            item.title = url;
            item.onclick = () => onSelect(url, null);
            grid.appendChild(item);
        });

        // Uploaded files
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
