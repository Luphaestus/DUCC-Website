/**
 * quotes.js
 * 
 * Logic for the quotes page.
 * 
 * Registered Route: /quotes
 */

import { apiRequest } from '@/utils/api';
import { ViewChangedEvent, addRoute } from '@/utils/view';
import { Modal } from '@/widgets/Modal';
import { ADD_SVG, SEARCH_SVG } from '@/utils/icons';
import { Pagination } from '@/widgets/Pagination';
import { notify } from '../components/notification.js';
import { renderAvatar } from '@/utils/avatar';

addRoute('/quotes', 'quotes');

const HTML_TEMPLATE = /*html*/`
    <div id="quotes-view" class="view hidden small-container">
        <div class="quotes-header">
            <div class="quotes-title-row">
                <h1>Club Quotes</h1>
            </div>
            <div class="quotes-controls">
                <button id="manage-quotes-btn" class="hidden secondary" data-nav="/admin/quotes">Manage Quotes</button>
                <div class="search-box">
                    <span class="icon">${SEARCH_SVG}</span>
                    <input type="text" id="quote-search" placeholder="Search quotes or person:">
                </div>
                <button id="create-quote-btn" class="button primary">${ADD_SVG} Create Quote</button>
            </div>
        </div>

        <div id="quotes-list" class="quotes-grid">
            <div class="loading-spinner"></div>
        </div>

        <div id="quotes-pagination" class="pagination"></div>
    </div>
`;

interface QuoteUser {
    id: number;
    first_name: string;
    last_name: string;
}

interface Quote {
    id: number;
    text: string;
    quoted_user: QuoteUser;
    submitted_by?: QuoteUser;
}
let users: QuoteUser[] = [];
let currentOptions: Record<string, any> = {
    page: 1,
    limit: 12,
    search: ''
};

/**
 * Verifies if the current user has permission to manage quotes.
 */
async function checkManagePermissions(): Promise<void> {
    const manageBtn = document.getElementById('manage-quotes-btn');
    if (!manageBtn) return;

    try {
        const userData = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({}));
        const perms = userData.permissions || [];
        if (perms.includes('quote.manage')) {
            manageBtn.classList.remove('hidden');
        } else {
            manageBtn.classList.add('hidden');
        }
    } catch (e) { }
}

/**
 * Renders the list of quotes.
 */
async function renderQuotes(): Promise<void> {
    const container = document.getElementById('quotes-list');
    if (!container) return;

    try {
        const queryParams: Record<string, string> = {};
        Object.keys(currentOptions).forEach(key => {
            queryParams[key] = String(currentOptions[key]);
        });
        const query = new URLSearchParams(queryParams);
        const response = await apiRequest('GET', `/api/quotes?${query.toString()}`);
        const { quotes, totalPages } = response.data || { quotes: [], totalPages: 0 };

        if (quotes.length === 0) {
            container.innerHTML = '<p class="no-results">No quotes found.</p>';
            const paginationEl = document.getElementById('quotes-pagination');
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        container.innerHTML = (quotes as Quote[]).map((quote: Quote) => `
            <div class="quote-card" data-mos="fade-up">
                <div class="quote-card-header">
                    ${renderAvatar(quote.quoted_user, { classes: 'mini' })}
                    <p class="quote-author">${quote.quoted_user.first_name} ${quote.quoted_user.last_name}</p>
                </div>
                <p class="quote-text">"${quote.text}"</p>
                ${quote.submitted_by ? `
                    <div class="quote-card-footer">
                        ${renderAvatar(quote.submitted_by, { classes: 'mini' })}
                        <p class="quote-submitter">Submitted by ${quote.submitted_by.first_name}</p>
                    </div>
                ` : ''}
            </div>
        `).join('');

        const paginationEl = document.getElementById('quotes-pagination');
        if (paginationEl) {
            const pager = new Pagination(paginationEl, (page) => {
                currentOptions.page = page;
                renderQuotes();
            });
            pager.render(currentOptions.page, totalPages);
        }
    } catch (e: any) {
        container.innerHTML = `<p class="error">${e.message || 'Failed to load quotes.'}</p>`;
    }
}

/**
 * Fetches users for the creation dropdown.
 */
async function loadUsers(): Promise<void> {
    try {
        users = await apiRequest('GET', '/api/quotes/users');
    } catch (e) {}
}

/**
 * Opens the "Create Quote" modal.
 */
function openCreateModal(): void {
    const modalContent = /*html*/`
        <form id="create-quote-form">
            <div class="form-group">
                <label for="new-quote-text">Quote</label>
                <textarea id="new-quote-text" placeholder="What did they say?" required></textarea>
            </div>
            <div class="form-group">
                <label for="new-quote-user">Who said it?</label>
                <select id="new-quote-user" required>
                    <option value="" disabled selected>Select a person</option>
                    ${users.map(u => `<option value="${u.id}">${u.first_name} ${u.last_name}</option>`).join('')}
                </select>
            </div>
            <button type="submit" class="button primary full-width">Submit Quote</button>
        </form>
    `;

    const modal = new Modal({
        id: 'create-quote-modal',
        title: 'Submit New Quote',
        content: modalContent
    });

    document.body.insertAdjacentHTML('beforeend', modal.getHTML());
    modal.attachListeners();
    modal.show();

    const form = document.getElementById('create-quote-form') as HTMLFormElement | null;

    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const text = (document.getElementById('new-quote-text') as HTMLTextAreaElement).value;
        const quotedUserId = (document.getElementById('new-quote-user') as HTMLSelectElement).value;

        try {
            await apiRequest('POST', '/api/quotes', { text, quotedUserId });
            notify('Quote submitted for moderation.', 'success');
            modal.close();
        } catch (err: any) {
            notify(err.message || 'Failed to submit quote.', 'error');
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.insertAdjacentHTML('beforeend', HTML_TEMPLATE);

    const searchInput = document.getElementById('quote-search') as HTMLInputElement | null;
    const createBtn = document.getElementById('create-quote-btn') as HTMLButtonElement | null;

    let searchTimeout: ReturnType<typeof setTimeout>;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentOptions.search = searchInput.value;
                currentOptions.page = 1;
                renderQuotes();
            }, 300);
        });
    }

    if (createBtn) createBtn.onclick = openCreateModal;

    ViewChangedEvent.subscribe(async ({ resolvedPath, viewId }: any) => {
        if (viewId === 'quotes') {
            await checkManagePermissions();
            await loadUsers();
            await renderQuotes();
        }
    });
});