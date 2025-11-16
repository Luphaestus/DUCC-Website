import { ajaxGet } from './misc/ajax.js';
import seedrandom from 'https://cdn.skypack.dev/seedrandom';

let relativeWeekOffset = 0;


function pastelColourGenerator(seed) {
    const hue = Math.floor(seedrandom(seed)() * 360);
    return {
        light: hue,
        dark: hue
    };
}

function formatEvent(event) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

    const startTime = startDate.toLocaleTimeString('en-US', timeOptions);
    const endTime = endDate.toLocaleTimeString('en-US', timeOptions);

    const tagsHtml = (event.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');

    const hues = pastelColourGenerator(startDate);
    const now = new Date();
    const brightnessFactor = startDate > now ? 1 : 0.4;

    if (brightnessFactor < 1) {
        var style = `filter: brightness(${brightnessFactor});
                    --event-bg-light: hsl(${hues.dark}, 50%, 30%); 
                    --event-bg-dark: hsl(${hues.dark}, 50%, 30%);
                    --event-text-color: white;
                    color: white;
        `;
    } else {
        var style = `
            --event-bg-light: hsl(${hues.light}, 70%, 85%); 
            --event-bg-dark: hsl(${hues.dark}, 50%, 30%);
        `;
    }


    return `
        <div class="event-item" style="${style}">
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
                <div class="event-tags">${tagsHtml}</div>
            </div>
        </div>
    `;
}

function populateEvents() {

    ajaxGet(`/api/events/rweek/${relativeWeekOffset}`, (data) => {
        const events = data.events;
        const eventsList = document.getElementById('events-list');

        if (events.length === 0) {
            eventsList.innerHTML = '<p>No events scheduled for this week.</p>';
            return;
        }

        let html = '';
        let last_day = null;
        events.forEach(event => {
            if (last_day !== new Date(event.start).getDate()) {
                if (last_day !== null) {
                    html += '</div>';
                }
                last_day = new Date(event.start).getDate();
                html += `<h2 class="event-day-header">${new Date(event.start).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>`;
                html += '<div class="day-events-container">';
            }
            html += formatEvent(event);
        });

        eventsList.innerHTML = html;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    populateEvents();

    document.querySelector('.prev-week').addEventListener('click', () => {
        relativeWeekOffset--;
        populateEvents(relativeWeekOffset);
    });

    document.querySelector('.next-week').addEventListener('click', () => {
        relativeWeekOffset++;
        populateEvents(relativeWeekOffset);
    });
});