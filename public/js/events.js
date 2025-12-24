/**
 * events.js
 * Events List View Module.
 * 
 * Responsible for displaying a weekly calendar of events.
 * Users can navigate through weeks and see events they are eligible to attend.
 * Events are color-coded based on their primary tag.
 */

import { ajaxGet } from './misc/ajax.js';
import { LoginEvent } from './login.js';
import './event.js';


// --- Constants & Templates ---

/**
 * Main template for the events view.
 * Includes navigation controls (prev/next week) and a container for the list.
 */
const HTML_TEMPLATE = `
        <div id="/events-view" class="view hidden small-container">
            <div class="events-controls">
                <div class="week-nav-icons">
                    <span class="prev-week nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10 -10 10a10 10 0 1 1 0 -20m2 13v-6a1 1 0 0 0 -1.707 -.708l-3 3a1 1 0 0 0 0 1.415l3 3a1 1 0 0 0 1.414 0l.083 -.094c.14 -.18 .21 -.396 .21 -.613" /></svg></span>
                    <span class="next-week nav-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3.34a10 10 0 1 1 -15 8.66l.005 -.324a10 10 0 0 1 14.995 -8.336m-5.293 4.953a1 1 0 0 0 -1.707 .707v6c0 .217 .07 .433 .21 .613l.083 .094a1 1 0 0 0 1.414 0l3 -3a1 1 0 0 0 0 -1.414z" /></svg></span>
                </div>
                <h1 id="events-controls-title"></h1>
                <button class="this-week-button">Today 📅</button>
            </div>

            <div id="events-list">
                <p aria-busy="true">Loading events...</p>
            </div>
            <div id="event-navigation"></div>
        </div>`

// --- State ---

let relativeWeekOffset = 0; // 0 = current week, 1 = next week, etc.

// --- Helper Functions ---

/**
 * Utility to calculate the HSL hue from a HEX color code.
 * Used to dynamically generate readable background colors for event cards.
 * @param {string} hex - HEX color string.
 * @returns {number} Hue value (0-360).
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
 * Formats a single event object into its HTML card representation.
 * Includes logic for past events and tag-based theming.
 * @param {object} event - The event data from API.
 * @returns {string} HTML string.
 */
function formatEvent(event) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

    const startTime = startDate.toLocaleTimeString('en-UK', timeOptions);
    const endTime = endDate.toLocaleTimeString('en-UK', timeOptions);

    // Build tag chips
    const tagsHtml = (event.tags || []).map(tag => `<span class="tag" style="background-color: ${tag.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-right: 4px;">${tag.name}</span>`).join('');

    let hue = 0;
    let hasTags = false;

    // Pick the most important tag to theme the event card
    if (event.tags && event.tags.length > 0) {
        hasTags = true;
        const highestPriorityTag = event.tags.reduce((prev, current) => {
            return ((prev.priority || 0) > (current.priority || 0)) ? prev : current;
        });
        hue = getHueFromHex(highestPriorityTag.color || '#808080');
    }

    const now = new Date();
    const isPast = startDate < now;

    let classes = 'event-item';
    if (isPast) classes += ' past-event';
    if (!hasTags) classes += ' glassy';

    let style = '';
    if (hasTags) {
        // Generate light and dark versions of the tag color for the card background
        style = `
            --event-bg-light: hsl(${hue}, 70%, 85%); 
            --event-bg-dark: hsl(${hue}, 50%, 30%);
        `;
    }

    return `
        <div class="${classes}" style="${style}" onclick="switchView('event/${event.id}')">
            <div class="event-top">
                <span>${startTime} - ${endTime}</span>
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

// --- Main Logic ---

/**
 * Fetches events for the currently selected week and renders them.
 * Groups events by day headers.
 * @returns {Promise<void>}
 */
async function populateEvents() {

    const title = document.getElementById('events-controls-title');
    const now = new Date();
    
    // Calculate the date range for the header
    const startOfWeek = new Date(now);
    // Adjust to Monday of the target week
    startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1) + relativeWeekOffset * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    title.textContent = `${startOfWeek.toLocaleDateString('en-UK', options)} - ${endOfWeek.toLocaleDateString('en-UK', options)}`;

    const thisWeekButton = document.querySelector('.this-week-button');
    if (relativeWeekOffset === 0) {
        thisWeekButton.disabled = true;
    } else {
        thisWeekButton.disabled = false;
    }

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
        // Group events by day
        for (const event of events) {
            const eventDate = new Date(event.start).getDate();
            if (last_day !== eventDate) {
                if (last_day !== null) {
                    html += '</div>'; // Close previous day container
                }
                last_day = eventDate;
                html += `<h2 class="event-day-header">${new Date(event.start).toLocaleDateString('en-UK', { weekday: 'long', month: 'short', day: 'numeric' })}</h2>`;
                html += '<div class="day-events-container">';
            }
            html += formatEvent(event);
        }

        if (events.length > 0) {
            html += '</div>'; // Close last day container
        }

        eventsList.innerHTML = html;
    } catch (error) {
        console.error('Failed to populate events:', error);
        document.getElementById('events-list').innerHTML = '<p class="error-message">Failed to load events. Please try again later.</p>';
    }
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Initial fetch
    populateEvents();

    // Setup navigation controls
    document.querySelector('.prev-week').addEventListener('click', () => {
        relativeWeekOffset--;
        populateEvents();
    });

    document.querySelector('.next-week').addEventListener('click', () => {
        relativeWeekOffset++;
        populateEvents();
    });

    document.querySelector('.this-week-button').addEventListener('click', () => {
        relativeWeekOffset = 0;
        populateEvents();
    });

    // Refresh events when user logs in (to show restricted events)
    LoginEvent.subscribe(() => {
        populateEvents();
    });
});

// Register view with the main container
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);