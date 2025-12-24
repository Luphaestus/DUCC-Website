import { ajaxGet } from './misc/ajax.js';
import { LoginEvent } from './login.js';
import './event.js';
import seedrandom from 'https://cdn.skypack.dev/seedrandom';


// --- Constants & Templates ---

const HTML_TEMPLATE = `
        <div id="/events-view" class="view hidden small-container">
            <div class="events-controls">
                <div>
                    <img class="prev-week" src="/images/icons/filled/circle-caret-left.svg" alt="Previous week" />
                    <img class="next-week" src="/images/icons/filled/circle-caret-right.svg" alt="Next week" />
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

let relativeWeekOffset = 0;

// --- Helper Functions ---

/**
 * Generates a pastel color hue based on a seed.
 * @param {*} seed - The seed for the random number generator.
 * @returns {{light: number, dark: number}} An object containing light and dark hue values.
 */
function pastelColourGenerator(seed) {
    const hue = Math.floor(seedrandom(seed)() * 360);
    return {
        light: hue,
        dark: hue
    };
}

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
        h = s = 0; // achromatic
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
 * Formats an event object into an HTML string for display.
 * @param {object} event - The event object.
 * @returns {string} An HTML formatted event.
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

    const now = new Date();
    const isPast = startDate < now;

    let classes = 'event-item';
    if (isPast) classes += ' past-event';
    if (!hasTags) classes += ' glassy';

    let style = '';
    if (hasTags) {
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
 * Populates the offsetted weekly events list via API.
 * @returns {Promise<void>}
 */
async function populateEvents() {

    const title = document.getElementById('events-controls-title');
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1 + relativeWeekOffset * 7);
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
        for (const event of events) {
            if (last_day !== new Date(event.start).getDate()) {
                if (last_day !== null) {
                    html += '</div>';
                }
                last_day = new Date(event.start).getDate();
                html += `<h2 class="event-day-header">${new Date(event.start).toLocaleDateString('en-UK', { weekday: 'long', month: 'short', day: 'numeric' })}</h2>`;
                html += '<div class="day-events-container">';
            }
            html += formatEvent(event);
        }

        if (events.length > 0) {
            html += '</div>';
        }

        eventsList.innerHTML = html;
    } catch (error) {
        console.error('Failed to populate events:', error);
        document.getElementById('events-list').innerHTML = '<p class="error-message">Failed to load events. Please try again later.</p>';
    }
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    populateEvents();

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

    LoginEvent.subscribe(() => {
        populateEvents();
    });
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);