/**
 * Pagination.js
 * Standardized pagination widget for tables and lists.
 * 
 * Usage:
 * import { Pagination } from '/js/widgets/Pagination.js';
 * const pager = new Pagination(document.getElementById('pager'), (page) => loadData(page));
 * pager.render(currentPage, totalPages);
 */

import { ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG } from '../../images/icons/outline/icons.js';

export class Pagination {
    /**
     * @param {HTMLElement} container - Element where pagination will be rendered.
     * @param {Function} onPageChange - Callback when a page is selected.
     */
    constructor(container, onPageChange) {
        this.container = container;
        this.onPageChange = onPageChange;
    }

    /**
     * Renders the pagination controls.
     * @param {number} currentPage - Current active page (1-indexed).
     * @param {number} totalPages - Total number of pages.
     */
    render(currentPage, totalPages) {
        if (!this.container) return;
        
        if (totalPages <= 1) {
            this.container.innerHTML = '';
            return;
        }

        // Determine visible page range (show 3 pages if possible)
        let startPage = currentPage - 1;
        if (startPage < 1) startPage = 1;
        let endPage = startPage + 2;
        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - 2);
        }

        const nav = document.createElement('nav');
        nav.className = 'glass-pagination';

        const createBtn = (content, page, disabled = false, active = false) => {
            const btn = document.createElement('button');
            btn.innerHTML = content;
            btn.disabled = disabled;
            btn.className = `page-btn ${active ? 'active' : ''}`;
            btn.onclick = (e) => {
                e.preventDefault();
                if (!disabled && !active) this.onPageChange(page);
            };
            return btn;
        };

        nav.appendChild(createBtn(ARROW_BACK_IOS_NEW_SVG, currentPage - 1, currentPage <= 1));

        for (let i = startPage; i <= endPage; i++) {
            nav.appendChild(createBtn(i, i, false, i === currentPage));
        }

        nav.appendChild(createBtn(ARROW_FORWARD_IOS_SVG, currentPage + 1, currentPage >= totalPages));

        this.container.innerHTML = '';
        this.container.appendChild(nav);
    }
}
