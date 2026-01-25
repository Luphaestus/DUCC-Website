/**
 * events.js
 * 
 * Logic for the primary events listing view.
 * 
 * Registered Route: /events
 */

import { apiRequest } from '/js/utils/api.js';
import { LoginEvent } from './login.js';
import { ViewChangedEvent, addRoute, switchView } from '/js/utils/view.js';
import { CHECK_SVG, LOCATION_ON_SVG, ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG, 
    REFRESH_SVG, SCHEDULE_SVG, GROUP_SVG, SETTINGS_SVG, CURRENCY_POUND_SVG 
} from '../../images/icons/outline/icons.js';
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
            getPageData(page).catch(() => {}); 
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
 * Generates the HTML for a single event card.
 * @param {object} event 
 * @returns {string} HTML string
 */
function formatEvent(event) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const isPast = endDate < new Date();
    const isCanceled = event.is_canceled;

    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const startTime = startDate.toLocaleTimeString('en-UK', timeOptions);
    const endTime = endDate.toLocaleTimeString('en-UK', timeOptions);

    const tagsHtml = (event.tags || [])
        .map(tag => `<span class="tag-badge" style="--tag-color: ${tag.color};">${tag.name}</span>`)
        .join('');

    const imageUrl = event.image_url || '/images/misc/ducc.png';
    const imageHtml = /*html*/`
        <div class="event-image-container">
            <div class="event-image" style="--event-image-url: url('${imageUrl}');"></div>
            <div class="image-overlay"></div>
            <div class="event-image-content">
                <div class="event-tags">${tagsHtml}</div>
                <h3 class="event-title-bold ${isCanceled ? 'strikethrough' : ''}">
                    ${event.title || 'Untitled Event'}
                </h3>
            </div>
        </div>`;

    const count = event.attendee_count !== undefined ? event.attendee_count : '0';
    const max = event.max_attendees;
    const attendanceDisplay = max > 0 ? `${count}/${max}` : `${count}/∞`;
    const attendanceTitle = max > 0 ? `${count}/${max} Attending` : `${count} / Unlimited Attending`;

    const attendanceHtml = /*html*/`
        <div class="attendance-count" title="${attendanceTitle}">
            ${GROUP_SVG} <span>${attendanceDisplay}</span>
        </div>`;

    const costHtml = event.upfront_cost > 0 ? /*html*/`
        <div class="info-item cost" title="Upfront Cost">
            ${CURRENCY_POUND_SVG}
            <span>£${event.upfront_cost.toFixed(2)}</span>
        </div>` : '';

    let statusLabel = '';
    if (isCanceled) statusLabel = '<span class="status-badge error">Canceled</span>';
    else if (isPast) statusLabel = '<span class="status-badge neutral">Unavailable</span>';
    else if (event.can_attend === false && !event.is_attending) statusLabel = '<span class="status-badge neutral">Unavailable</span>';

    const cardClasses = ['event-card', 'glass-panel'];
    if (isPast) cardClasses.push('past-event');
    if (isCanceled) cardClasses.push('canceled-event');
    if (event.can_attend === false && !event.is_attending) cardClasses.push('unavailable-event');


    return /*html*/`
        <div class="${cardClasses.join(' ')}" data-nav="${`event/${event.id}`}" role="button" tabindex="0">
            ${imageHtml}
            <div class="event-card-content">
                <div class="event-info-block">
                    <div class="info-item time">
                        ${SCHEDULE_SVG}
                        <span>${startTime} - ${endTime}</span>
                    </div>
                    <div class="info-item location">
                        ${LOCATION_ON_SVG}
                        <span>${event.location || 'Location TBD'}</span>
                    </div>
                    ${costHtml}
                </div>

                <div class="card-footer">
                    <div class="footer-left">
                        ${attendanceHtml}
                        ${event.is_attending ? `<div class="attendance-status">${CHECK_SVG} Attending</div>` : ''}
                    </div>
                    <div class="footer-right">
                        ${statusLabel}
                    </div>
                </div>
            </div>
        </div>`;
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
        const data = await apiRequest('GET', '/api/user/elements/permissions');
        const perms = data.permissions || [];
        
        isAdmin = perms.includes('event.manage.all') 
               || perms.includes('event.manage.scoped') 
               || perms.includes('user.manage') 
               || perms.length > 0;

        btn.classList.toggle('hidden', !isAdmin);
    } catch (e) {
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
            html += formatEvent(event);
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

// --- Initialization ---

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
        checkAdminAccess();
        changePage(0, false);
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