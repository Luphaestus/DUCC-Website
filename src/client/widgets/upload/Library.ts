//todo refine 

import { apiRequest } from '@/utils/api';

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

    container.innerHTML = /*html*/`
        <div class="image-library-grid">
            <p class="loading-cell">Loading images...</p>
        </div>
    `;

    const grid = container.querySelector('.image-library-grid') as HTMLElement;

    (container as LibraryContainer)._libraryParams = { onSelect, options };

    try {
        const [filesRes, slidesRes] = await Promise.all([
            apiRequest('GET', '/api/files?limit=50&includeUsed=true'),
            apiRequest('GET', '/api/slides/images')
        ]);

        const files = (filesRes.data?.files || []).filter((f: any) => {
            const isImage = f.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i);
            const isExcluded = exclude.includes(f.id.toString()) || exclude.includes(`/api/files/${f.id}/download?view=true`);
            return isImage && !isExcluded;
        });
        
        const slides = (slidesRes.images || []).filter((url: string) => !exclude.includes(url));

        grid.innerHTML = '';

        slides.forEach((url: string) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.style.backgroundImage = `url('${url}')`;
            item.title = url;
            item.onclick = () => onSelect(url, null);
            grid.appendChild(item);
        });

        files.forEach((f: any) => {
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
 */
export async function refreshLibrary(container: HTMLElement | null): Promise<void> {
    const libContainer = container as LibraryContainer;
    if (libContainer && libContainer._libraryParams) {
        const { onSelect, options } = libContainer._libraryParams;
        return renderLibrary(libContainer, onSelect, options);
    }
}