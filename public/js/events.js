import { ajaxGet } from './misc/ajax.js'; 

let relativeWeekOffset = 0; 

function formatEvent(event) {
    const eventDate = new Date(event.start);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const formattedDate = eventDate.toLocaleDateString(undefined, options);

    return `
        <div class="event-item='">
            <h4>${event.title}</h4>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Location:</strong> ${event.location}</p>
            <p>${event.description}</p>
            <hr>
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
        events.forEach(event => {
            html += formatEvent(event);
        });
        
        eventsList.innerHTML = html;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    populateEvents();
    
    document.getElementById('event-navigation').innerHTML = `
        <div class="navigation-buttons">
        <button id="prev-week">Previous Week</button>
        <button id="next-week">Next Week</button>
        </div>
    `;

    document.getElementById('prev-week').addEventListener('click', () => {
        relativeWeekOffset--;
        populateEvents(relativeWeekOffset);
    });

    document.getElementById('next-week').addEventListener('click', () => {
        relativeWeekOffset++;
        populateEvents(relativeWeekOffset);
    });
});