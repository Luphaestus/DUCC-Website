/**
 * events.js
 * 
 * Logic for the primary events listing view.
 * 
 * Registered Route: /events
 */

import { apiRequest } from '/js/utils/api.js';
import { ViewChangedEvent, addRoute, switchView } from '/js/utils/view.js';
import {
    ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG,
    REFRESH_SVG, SETTINGS_SVG
} from '../../images/icons/outline/icons.js';
import { StandardCard } from '../widgets/StandardCard.js';
import { 
    EventAttendanceChangedEvent, 
    LoginEvent, 
    LegalEvent, 
    BalanceChangedEvent 
} from '/js/utils/events/events.js';
import "./event.js";

addRoute('/events', 'events');

// --- Constants & Templates ---

const HTML_TEMPLATE = /*html*/`
    <div id="events-view" class="view hidden small-container">
        <div class="events-controls-modern">
            <div class="week-navigator glass-panel">
                <button class="nav-btn prev-week" title="Previous Page">${ARROW_BACK_IOS_NEW_SVG}</button>
                <div class="current-week-display">
                    <span id="page-range-text">Loading...</span>
                </div>
                <button class="nav-btn next-week" title="Next Page">${ARROW_FORWARD_IOS_SVG}</button>
            </div>

            <div class="controls-group glass-panel">
                <button id="admin-events-link" class="admin-link-btn hidden" title="Event Admin">
                    ${SETTINGS_SVG}
                    <span>Admin</span>
                </button>
                
                <button class="today-btn" title="Back to Today">
                    ${REFRESH_SVG}
                    <span>Today</span>
                </button>
            </div>
        </div>

        <div id="events-list">
            <div id="events-slider">
                <div class="events-page" id="events-page-current">
                    <p class="loading-text">Loading events...</p>
                </div>
            </div>
        </div>
        <div id="event-navigation"></div>
    </div>`;

// --- State ---

let currentPage = 0;
let isAnimating = false;
let isAdmin = false;
const pageCache = new Map();

/**
 * Clears the internal page cache, forcing a re-fetch of event data.
 */
function clearCache() {
    pageCache.clear();
}

// --- Data Fetching ---

/**
 * Fetches data for a specific page, utilizing the internal cache.
 * @param {number} page - Page number (offset from today).
 * @returns {Promise<object>}
 */
async function getPageData(page) {
    if (pageCache.has(page)) return pageCache.get(page);
    try {
        const data = await apiRequest('GET', `/api/events/paged/${page}`);
        pageCache.set(page, data);
        return data;
    } catch (error) {
        console.error(`Failed to fetch events for page ${page}`, error);
        throw error;
    }
}

/**
 * Background preloads data for surrounding pages to improve responsiveness.
 * @param {number} basePage - The central page number.
 */
function preloadPages(basePage) {
    const offsetsToPreload = [-2, -1, 1, 2];
    offsetsToPreload.forEach(delta => {
        const page = basePage + delta;
        if (!pageCache.has(page)) {
            getPageData(page).catch(() => { });
        }
    });
}

// --- Helpers ---

/**
 * Generates a human-readable date range string for the UI display.
 * @param {string} startDateStr 
 * @param {string} endDateStr 
 * @returns {string}
 */
function getRangeText(startDateStr, endDateStr) {
    const formatDate = (d) => new Date(d).toLocaleDateString('en-UK', { month: 'short', day: 'numeric' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (start.getTime() === today.getTime()) {
        return `Today - ${formatDate(end)}`;
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (end.toDateString() === yesterday.toDateString()) {
        return `${formatDate(start)} - Yesterday`;
    }

    return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Synchronizes the internal page number with the browser URL.
 * @param {boolean} push - Whether to push a new history state or replace the current one.
 */
function updateUrlParams(push = true) {
    const url = new URL(window.location);
    if (currentPage === 0) url.searchParams.delete('page');
    else url.searchParams.set('page', currentPage);

    const newPath = url.pathname + url.search;

    if (push) {
        window.history.pushState({}, '', url);
        ViewChangedEvent.notify({
            resolvedPath: '/events',
            viewId: 'events',
            path: newPath
        });
    } else {
        window.history.replaceState({}, '', url);
    }
}

/**
 * Checks if the user has permission to see the Admin quick-link button.
 */
async function checkAdminAccess() {
    const btn = document.querySelector('.admin-link-btn');
    if (!btn) return;

    try {
        const auth = await apiRequest('GET', '/api/auth/status', true);
        if (!auth.authenticated) {
            isAdmin = false;
            btn.classList.add('hidden');
            return;
        }

        const data = await apiRequest('GET', '/api/user/elements/permissions');
        const perms = data.permissions || [];

        isAdmin = perms.includes('event.manage.all')
            || perms.includes('event.manage.scoped')
            || perms.includes('user.manage')
            || perms.length > 0;

        btn.classList.toggle('hidden', !isAdmin);
    } catch (e) {
        if (e.message && !e.message.includes('Unauthorized'))
            console.warn('Failed to check admin access', e);
        isAdmin = false;
        btn.classList.add('hidden');
    }
}

// --- Rendering & Navigation ---

/**
 * Fetches events for a specific page and injects them into the DOM.
 * @param {number} page - Page number.
 * @param {HTMLElement} targetElement - DOM element to populate.
 */
async function renderPageContent(page, targetElement) {
    try {
        const data = await getPageData(page);
        const events = data.events || [];
        const { startDate, endDate } = data;

        const rangeText = document.getElementById('page-range-text');
        if (rangeText && startDate && endDate) {
            rangeText.textContent = getRangeText(startDate, endDate);
        }

        const todayBtn = document.querySelector('.today-btn');
        if (todayBtn) {
            todayBtn.classList.toggle('disabled', page === 0);
        }

        if (events.length === 0) {
            targetElement.innerHTML = /*html*/`
                <div class="empty-week-state">
                    <p>No events found for this period.</p>
                </div>`;
            return;
        }

        let html = '';
        let lastDay = null;

        for (const event of events) {
            const dateObj = new Date(event.start);
            const eventDay = dateObj.getDate();

            // Start a new day group if the date changes
            if (lastDay !== eventDay) {
                if (lastDay !== null) html += '</div></div>';

                lastDay = eventDay;
                const dayName = dateObj.toLocaleDateString('en-UK', { weekday: 'long' });
                const dateNum = dateObj.getDate();
                const monthName = dateObj.toLocaleDateString('en-UK', { month: 'short' });

                html += /*html*/`
                    <div class="day-group">
                        <div class="date-strip">
                            <span class="date-num">${dateNum}</span>
                            <div class="date-text-group">
                                <span class="day-name">${dayName}</span>
                                <div class="date-line"></div>
                                <span class="month-name">${monthName}</span>
                            </div>
                        </div>
                        <div class="day-events-grid">`;
            }
            html += StandardCard.render(event);
        }

        if (events.length > 0) html += '</div></div>';
        targetElement.innerHTML = html;

    } catch (error) {
        targetElement.innerHTML = /*html*/`<p class="error-text">Failed to load events.</p>`;
    }
}

/**
 * Handles navigation to a new page with a smooth sliding transition.
 * @param {number|null} delta - Amount to shift the page number. 
 * @param {boolean} [animated=true] - Whether to perform the slide animation.
 */
async function changePage(delta, animated = true) {
    if (isAnimating) return;

    const slider = document.getElementById('events-slider');
    const currentView = document.getElementById('events-page-current');
    if (!slider || !currentView) return;

    const oldPage = currentPage;
    let newPage = currentPage;

    if (delta === 0) {
        newPage = 0;
    } else if (typeof delta === 'number') {
        newPage = currentPage + delta;
    }

    if (newPage === oldPage && delta !== null) return;

    isAnimating = true;
    currentPage = newPage;

    const isUserAction = delta !== null;
    updateUrlParams(isUserAction);

    if (!animated) {
        await renderPageContent(currentPage, currentView);
        isAnimating = false;
        slider.style.transition = 'none';
        slider.style.transform = 'translateX(0%)';
        return;
    }

    let direction = delta;
    if (delta === 0) direction = (oldPage > 0) ? -1 : 1;
    if (delta === null) direction = 1;

    const nextView = document.createElement('div');
    nextView.className = 'events-page';
    nextView.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';

    const loadPromise = renderPageContent(currentPage, nextView);

    slider.style.transition = 'none';
    if (direction > 0) {
        slider.appendChild(nextView);
        slider.style.transform = `translateX(0)`;
    } else {
        slider.insertBefore(nextView, currentView);
        slider.style.transform = `translateX(-100%)`;
    }

    slider.offsetHeight;

    slider.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
    if (direction > 0) slider.style.transform = 'translateX(-100%)';
    else slider.style.transform = 'translateX(0%)';

    await new Promise(resolve => setTimeout(resolve, 310));

    try {
        await loadPromise;
    } catch (e) {
        console.error("Failed to load page content during animation", e);
    } finally {
        currentView.innerHTML = nextView.innerHTML;
        slider.style.transition = 'none';
        slider.style.transform = 'translateX(0%)';

        if (nextView.parentNode === slider) {
            slider.removeChild(nextView);
        }

        isAnimating = false;
        preloadPages(currentPage);
    }
}

// --- Initialisation ---

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();

    document.addEventListener('click', (e) => {
        const target = e.target;

        const btn = target.closest('.nav-btn, .today-btn, .admin-link-btn');
        if (btn) {
            btn.classList.add('click-animate');
            btn.addEventListener('animationend', () => btn.classList.remove('click-animate'), { once: true });
        }

        // Navigation
        const todayBtn = target.closest('.today-btn');
        if (todayBtn) {
            todayBtn.classList.add('spin-active');
            todayBtn.addEventListener('animationend', () => todayBtn.classList.remove('spin-active'), { once: true });
            
            // Disable hover effect until mouse leaves
            todayBtn.classList.add('disabled-hover');
            const onMouseLeave = () => {
                todayBtn.classList.remove('disabled-hover');
                todayBtn.removeEventListener('mouseleave', onMouseLeave);
            };
            todayBtn.addEventListener('mouseleave', onMouseLeave);

            changePage(0);
        } else if (target.closest('.prev-week')) {
            changePage(-1);
        } else if (target.closest('.next-week')) {
            changePage(1);
        } else if (target.closest('.admin-link-btn')) {
            switchView('/admin/events');
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const view = document.getElementById('events-view');
        if (!view || view.classList.contains('hidden') ||
            ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }

        if (e.key === 'ArrowLeft') changePage(-1);
        else if (e.key === 'ArrowRight') changePage(1);
        else if (e.key === ' ') {
            e.preventDefault();
            changePage(0);
        }
    });

    // Subscriptions
    LoginEvent.subscribe(() => {
        clearCache();
        checkAdminAccess();
        changePage(0, false);
    });

    LegalEvent.subscribe(() => {
        clearCache();
        changePage(currentPage, false);
    });

    BalanceChangedEvent.subscribe(() => {
        clearCache();
        changePage(currentPage, false);
    });

    EventAttendanceChangedEvent.subscribe(async ({ eventId }) => {
        clearCache();
        if (!eventId) return;
        const card = document.querySelector(`.event-card[data-nav="event/${eventId}"]`);
        if (!card) return;

        try {
            const { event } = await apiRequest('GET', `/api/event/${eventId}`);
            const newHtml = StandardCard.render(event);
            const temp = document.createElement('div');
            temp.innerHTML = newHtml;
            const newCard = temp.firstElementChild;
            card.replaceWith(newCard);
        } catch (e) {
            console.error('Failed to update event card', e);
        }
    });

    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/events') {
            checkAdminAccess();
            const urlParams = new URLSearchParams(window.location.search);
            const pageParam = parseInt(urlParams.get('page'));
            currentPage = isNaN(pageParam) ? 0 : pageParam;
            changePage(null, false);
        }
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);