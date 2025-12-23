// --- Constants ---

export const adminContentID = 'admin-content';

// --- Helper Functions ---

/**
 * Renders pagination controls into a container.
 * @param {HTMLElement} container - The container element to render controls into.
 * @param {number} currentPage - The current page number.
 * @param {number} totalPages - The total number of pages.
 * @param {function} onPageChange - Callback function invoked when a page button is clicked. Receives the new page number.
 */
export function renderPaginationControls(container, currentPage, totalPages, onPageChange) {
    container.innerHTML = '';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.classList.add('pagination-btn');
    prevBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) onPageChange(currentPage - 1);
    };

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.classList.add('pagination-btn');
    nextBtn.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    };

    const info = document.createElement('span');
    info.textContent = `Page ${currentPage} of ${totalPages}`;

    container.appendChild(prevBtn);
    container.appendChild(info);
    container.appendChild(nextBtn);
}