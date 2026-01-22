import { ajaxGet } from '/js/utils/ajax.js';

/**
 * Returns the HTML for the library section.
 */
export function library() {
    return /*html*/`
        <h3 class="section-header-modern small-header">From Library</h3>
        <div id="image-library-grid" class="image-grid">
            <p class="loading-cell">Loading images...</p>
        </div>
    `;
}

/**
 * Loads images into the library grid and attaches selection handlers.
 * 
 * @param {Function} onSelect - Callback when an image is selected.
 */
export async function loadLibrary(onSelect) {
    const grid = document.getElementById('image-library-grid');
    if (!grid) return;

    try {
        const [filesRes, slidesRes] = await Promise.all([
            ajaxGet('/api/files?limit=50'),
            ajaxGet('/api/slides/images')
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
        grid.innerHTML = '<p class="error-cell">Failed to load library.</p>';
    }
}
