import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { LoginEvent } from './login.js';
import { ViewChangedEvent, addRoute, switchView } from '/js/utils/view.js';
import './event.js';
import { CALENDAR_TODAY_SVG, CHECK_SVG, LOCATION_ON_SVG, ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG, REFRESH_SVG, SCHEDULE_SVG, CALENDAR_MONTH_SVG, GROUP_SVG, SETTINGS_SVG, ALL_INCLUSIVE_SVG, CURRENCY_POUND_SVG, CLOSE_SVG } from '../../images/icons/outline/icons.js';

addRoute('/events', 'events');

const HTML_TEMPLATE = /*html*/`
        <div id="events-view" class="view hidden small-container">
            <div class="events-controls-modern">
                <button id="admin-events-link" class="admin-link-btn glass-panel hidden" title="Event Admin">
                    ${SETTINGS_SVG}
                    <span>Admin</span>
                </button>

                <div class="week-navigator glass-panel">
                    <button class="nav-btn prev-week" title="Previous Week">${ARROW_BACK_IOS_NEW_SVG}</button>
                    <div class="current-week-display">
                        <span id="week-range-text">Loading...</span>
                    </div>
                    <button class="nav-btn next-week" title="Next Week">${ARROW_FORWARD_IOS_SVG}</button>
                </div>
                
                <button class="today-btn glass-panel" title="Back to Today">
                    ${REFRESH_SVG}
                    <span>Today</span>
                </button>
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

let relativeWeekOffset = 0;
let isAnimating = false;
let isAdmin = false;

const weekDataCache = new Map();

/**
 * Fetch week data with caching.
 * @param {number} offset
 */
async function getWeekData(offset) {
    if (weekDataCache.has(offset)) return weekDataCache.get(offset);
    const data = await ajaxGet(`/api/events/paged/${offset}`);
    weekDataCache.set(offset, data);
    return data;
}

/**
 * Preload data for surrounding weeks.
 * @param {number} baseOffset
 */
function preloadWeeks(baseOffset) {
    [-2, -1, 1, 2].forEach(delta => {
        const offset = baseOffset + delta;
        if (!weekDataCache.has(offset)) {
            getWeekData(offset).catch(() => {});
        }
    });
}

/**
 * Format date range for the week navigator.
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
    } else if (end.getTime() === new Date(today).setDate(today.getDate() - 1)) {
        return `${formatDate(start)} - Yesterday`;
    } else {
        return `${formatDate(start)} - ${formatDate(end)}`;
    }
}

/**
 * Render HTML for a single event card.
 * @param {object} event
 * @returns {string}
 */
function formatEvent(event) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const isPast = endDate < new Date();
    const isCanceled = event.is_canceled;

    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const startTime = startDate.toLocaleTimeString('en-UK', timeOptions);
    const endTime = endDate.toLocaleTimeString('en-UK', timeOptions);

    const tagsHtml = (event.tags || []).map(tag =>
        `<span class="tag-badge" style="--tag-color: ${tag.color};">${tag.name}</span>`
    ).join('');

    const imageUrl = event.image_url || '/images/misc/ducc.png';
    const imageHtml = `<div class="event-image-container">
        <div class="event-image" style="--event-image-url: url('${imageUrl}');"></div>
        <div class="image-overlay"></div>
    </div>`;

    const count = event.attendee_count !== undefined ? event.attendee_count : '0';
    let attendanceDisplay = event.max_attendees > 0 ? `${count}/${event.max_attendees}` : `${count}/∞`;

    let attendanceHtml = `<div class="attendance-count" title="${event.max_attendees > 0 ? (count + '/' + event.max_attendees) : (count + ' / Unlimited')} Attending">
        ${GROUP_SVG} <span>${attendanceDisplay}</span>
    </div>`;

    let costHtml = event.upfront_cost > 0 ? `<div class="info-item cost" title="Upfront Cost">
        ${CURRENCY_POUND_SVG}
        <span>£${event.upfront_cost.toFixed(2)}</span>
    </div>` : '';

    let statusLabel = '';
    if (isCanceled) statusLabel = '<span class="status-badge error">Canceled</span>';
    else if (isPast) statusLabel = '<span class="status-badge neutral">Unavailable</span>';

    return /*html*/`
        <div class="event-card glass-panel ${isPast ? 'past-event' : ''} ${isCanceled ? 'canceled-event' : ''}" data-nav="event/${event.id}" role="button" tabindex="0">
            ${imageHtml}
            <div class="event-card-content">
                <div class="event-header-row">
                    <div class="event-tags">${tagsHtml}</div>
                </div>
                
                <h3 class="event-title-bold ${isCanceled ? 'strikethrough' : ''}">${event.title || 'Untitled Event'}</h3>
                
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

/** Sync week offset with URL query parameters. */
function updateUrlParams() {
    const url = new URL(window.location);
    if (relativeWeekOffset === 0) url.searchParams.delete('week');
    else url.searchParams.set('week', relativeWeekOffset);
    window.history.pushState({}, '', url);
}

/** Toggle admin link visibility based on user permissions. */
async function checkAdminAccess() {
    try {
        const data = await ajaxGet('/api/user/elements/permissions');
        const perms = data.permissions || [];
        const btn = document.querySelector('.admin-link-btn');

        isAdmin = perms.includes('event.manage.all') || perms.includes('event.manage.scoped') || perms.includes('user.manage') || perms.length > 0;

        if (btn) {
            if (isAdmin) btn.classList.remove('hidden');
            else btn.classList.add('hidden');
        }
        
        if (relativeWeekOffset !== undefined) changeWeek(0, false);
    } catch (e) {
        isAdmin = false;
        const btn = document.querySelector('.admin-link-btn');
        if (btn) btn.classList.add('hidden');
    }
}

/**
 * Fetch and render events for a specific week.
 * @param {number} offset
 * @param {HTMLElement} targetElement
 */
async function renderWeekContent(offset, targetElement) {
    try {
        const data = await getWeekData(offset);
        const events = data.events || [];
        const { startDate, endDate } = data;

        const rangeText = document.getElementById('week-range-text');
        if (rangeText && startDate && endDate) {
            rangeText.textContent = getRangeText(startDate, endDate);
        }

        const todayBtn = document.querySelector('.today-btn');
        if (todayBtn) {
            if (offset === 0) todayBtn.classList.add('disabled');
            else todayBtn.classList.remove('disabled');
        }

        if (events.length === 0) {
            targetElement.innerHTML = /*html*/`
                <div class="empty-week-state">
                    <p>No events found for this period.</p>
                </div>`;
            return;
        }

        let html = '';
        let last_day = null;
        for (const event of events) {
            const eventDate = new Date(event.start).getDate();
            if (last_day !== eventDate) {
                if (last_day !== null) html += '</div></div>';
                last_day = eventDate;
                const dateObj = new Date(event.start);
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
        console.error(error);
        targetElement.innerHTML = /*html*/`<p class="error-text">Failed to load events.</p>`;
    }
}

/**
 * Navigate between weeks with animation.
 * @param {number} delta
 * @param {boolean} animated
 */
async function changeWeek(delta, animated = true) {
    if (isAnimating) return;
    const slider = document.getElementById('events-slider');
    const currentView = document.getElementById('events-page-current');
    if (!slider || !currentView) return;

    const oldOffset = relativeWeekOffset;
    let newOffset = relativeWeekOffset;

    if (delta === 0) newOffset = 0;
    else if (delta !== undefined && delta !== null) newOffset = relativeWeekOffset + delta;

    if (newOffset === oldOffset && delta !== null && delta !== undefined) return;

    isAnimating = true;
    relativeWeekOffset = newOffset;
    updateUrlParams();

    if (!animated) {
        await renderWeekContent(relativeWeekOffset, currentView);
        isAnimating = false;
        slider.style.transition = 'none';
        slider.style.transform = 'translateX(0%)';
        return;
    }

    let direction = delta;
    if (delta === 0) direction = (oldOffset > 0) ? -1 : 1;
    if (delta === null || delta === undefined) direction = 1;

    const nextView = document.createElement('div');
    nextView.className = 'events-page';
    nextView.innerHTML = '<div class="loading-container"><div class="spinner"></div></div>';

    const loadPromise = renderWeekContent(relativeWeekOffset, nextView);

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
        console.error("Failed to load week content", e);
    } finally {
        currentView.innerHTML = nextView.innerHTML;
        slider.style.transition = 'none';
        slider.style.transform = 'translateX(0%)';
        if (nextView.parentNode === slider) slider.removeChild(nextView);
        isAnimating = false;
        preloadWeeks(relativeWeekOffset);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    LoginEvent.subscribe(() => checkAdminAccess());

    document.addEventListener('click', async (e) => {
        const target = e.target.closest('.nav-btn, .today-btn, .admin-link-btn');
        if (target) {
            target.classList.add('click-animate');
            target.addEventListener('animationend', () => target.classList.remove('click-animate'), { once: true });
        }

        const todayBtn = e.target.closest('.today-btn');
        if (todayBtn) {
            todayBtn.classList.add('spin-active');
            todayBtn.addEventListener('animationend', () => todayBtn.classList.remove('spin-active'), { once: true });
            changeWeek(0);
        } else if (e.target.closest('.prev-week')) {
            changeWeek(-1);
        } else if (e.target.closest('.next-week')) {
            changeWeek(1);
        } else if (e.target.closest('.admin-link-btn')) {
            switchView('/admin/events');
        } else if (e.target.closest('.cancel-event-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.cancel-event-btn');
            const id = btn.dataset.id;
            if (confirm('Are you sure you want to cancel this event?')) {
                try {
                    await ajaxPost(`/api/admin/event/${id}/cancel`);
                    changeWeek(null, false);
                } catch (err) {
                    alert('Failed to cancel event.');
                }
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        const ev = document.getElementById('events-view');
        if (!ev || ev.classList.contains('hidden') || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (e.key === 'ArrowLeft') changeWeek(-1);
        else if (e.key === 'ArrowRight') changeWeek(1);
        else if (e.key === ' ') { e.preventDefault(); changeWeek(0); }
    });

    LoginEvent.subscribe(() => changeWeek(0, false));
    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/events') {
            checkAdminAccess();
            const urlParams = new URLSearchParams(window.location.search);
            const weekParam = parseInt(urlParams.get('week'));
            relativeWeekOffset = isNaN(weekParam) ? 0 : weekParam;
            changeWeek(null, false);
        }
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

