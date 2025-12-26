/**
 * Weekly calendar view for events.
 */

import { ajaxGet } from './misc/ajax.js';
import { LoginEvent } from './login.js';
import { ViewChangedEvent } from './misc/view.js';
import './event.js';

/**
 * Main events view template.
 */
const HTML_TEMPLATE = `
        <div id="/events-view" class="view hidden small-container">
            <div class="events-controls">
                <div class="week-nav-icons">
                    <span class="prev-week nav-icon" title="Previous Week"><svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 21a9 9 0 1 0 0 -18a9 9 0 0 0 0 18" />
  <path d="M8 12l4 4" />
  <path d="M8 12h8" />
  <path d="M12 8l-4 4" />
</svg></span>
                    <span class="next-week nav-icon" title="Next Week"><svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18" />
  <path d="M16 12l-4 -4" />
  <path d="M16 12h-8" />
  <path d="M12 16l4 -4" />
</svg></span>
                </div>
                <h1 id="events-controls-title">Loading Week...</h1>
                <button class="this-week-button secondary">Today 📅</button>
            </div>

            <div id="events-list">
                <p aria-busy="true">Loading events...</p>
            </div>
            <div id="event-navigation"></div>
        </div>`

let relativeWeekOffset = 0;

/**
 * Calculate HSL hue from HEX color.
 * @param {string} hex
 * @returns {number}
 */
function getHueFromHex(hex) {
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0;

    var r = parseInt(result[1], 16) / 255;
    var g = parseInt(result[2], 16) / 255;
    var b = parseInt(result[3], 16) / 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0;
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return Math.round(h * 360);
}

/**
 * Format event data into an HTML card.
 * @param {object} event
 * @returns {string}
 */
function formatEvent(event) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const startTime = startDate.toLocaleTimeString('en-UK', timeOptions);
    const endTime = endDate.toLocaleTimeString('en-UK', timeOptions);

    const tagsHtml = (event.tags || []).map(tag => `<span class="tag" style="background-color: ${tag.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-right: 4px;">${tag.name}</span>`).join('');

    let hue = 0;
    let hasTags = false;

    if (event.tags && event.tags.length > 0) {
        hasTags = true;
        const highestPriorityTag = event.tags.reduce((prev, current) => {
            return ((prev.priority || 0) > (current.priority || 0)) ? prev : current;
        });
        hue = getHueFromHex(highestPriorityTag.color || '#808080');
    }

    let classes = 'event-item';
    if (startDate < new Date()) classes += ' past-event';
    if (!hasTags) classes += ' glassy';

    let style = hasTags ? `--event-bg-light: hsl(${hue}, 70%, 85%); --event-bg-dark: hsl(${hue}, 50%, 30%);` : '';

    return `
        <div class="${classes}" style="${style}" onclick="switchView('event/${event.id}')">
            <div class="event-top">
                <span>${startTime} - ${endTime}</span>
                ${event.is_attending ? `<span class="attending-badge" style="background: #2ecc71; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; margin-left: auto;">✓ Attending</span>` : ''}
            </div>
            <div class="event-middle">
                <h3>${event.title || 'No Title'}</h3>
            </div>
            <div class="event-bottom">
                <div class="event-location">
                    <span>📍 ${event.location || 'No Location'}</span>
                </div>
                <div class="event-tags" style="margin-left: auto;">${tagsHtml}</div>
            </div>
        </div>
    `;
}

/**
 * Sync week offset to URL.
 */
function updateUrlParams() {
    const url = new URL(window.location);
    if (relativeWeekOffset === 0) url.searchParams.delete('week');
    else url.searchParams.set('week', relativeWeekOffset);
    window.history.pushState({}, '', url);
}

/**
 * Fetch and render events for the current week.
 * @returns {Promise<void>}
 */
async function populateEvents() {
    const title = document.getElementById('events-controls-title');
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) + relativeWeekOffset * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    title.textContent = `${startOfWeek.toLocaleDateString('en-UK', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-UK', { month: 'short', day: 'numeric' })}`;

    const thisWeekButton = document.querySelector('.this-week-button');
    if (thisWeekButton) thisWeekButton.disabled = relativeWeekOffset === 0;

    try {
        const data = await ajaxGet(`/api/events/rweek/${relativeWeekOffset}`);
        const events = data.events;
        const eventsList = document.getElementById('events-list');

        if (!events || events.length === 0) {
            eventsList.innerHTML = '<p>No events scheduled for this week.</p>';
            return;
        }

        let html = '';
        let last_day = null;
        for (const event of events) {
            const eventDate = new Date(event.start).getDate();
            if (last_day !== eventDate) {
                if (last_day !== null) html += '</div>';
                last_day = eventDate;
                html += `<h2 class="event-day-header">${new Date(event.start).toLocaleDateString('en-UK', { weekday: 'long', month: 'short', day: 'numeric' })}</h2><div class="day-events-container">`;
            }
            html += formatEvent(event);
        }
        if (events.length > 0) html += '</div>';
        eventsList.innerHTML = html;
    } catch (error) {
        document.getElementById('events-list').innerHTML = '<p class="error-message">Failed to load events.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const eventsView = document.getElementById('/events-view');
    let touchStartX = 0;
    let touchEndX = 0;

    if (eventsView) {
        eventsView.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        eventsView.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchEndX - touchStartX;
            if (Math.abs(diff) > 50) {
                relativeWeekOffset += (diff > 0 ? -1 : 1);
                updateUrlParams();
                populateEvents();
            }
        }, { passive: true });
    }

    document.querySelector('.prev-week').addEventListener('click', () => { relativeWeekOffset--; updateUrlParams(); populateEvents(); });
    document.querySelector('.next-week').addEventListener('click', () => { relativeWeekOffset++; updateUrlParams(); populateEvents(); });
    document.querySelector('.this-week-button').addEventListener('click', () => { relativeWeekOffset = 0; updateUrlParams(); populateEvents(); });

    LoginEvent.subscribe(() => populateEvents());

    ViewChangedEvent.subscribe(({ resolvedPath }) => {
        if (resolvedPath === '/events') {
            const urlParams = new URLSearchParams(window.location.search);
            const weekParam = parseInt(urlParams.get('week'));
            relativeWeekOffset = isNaN(weekParam) ? 0 : weekParam;
            populateEvents();
        }
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);