import { ViewChangedEvent, switchView } from "./misc/view.js";
import { ajaxGet, ajaxPost } from "./misc/ajax.js";
import { notify } from './misc/notification.js';

// --- Constants & Templates ---

const CALENDAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
const DESCRIPTION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>`;
const DIFFICULTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;
const ATTENDEES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2c0-.656-.126-1.283-.356-1.857M9 20H7a4 4 0 01-4-4v-2.75a4 4 0 014-4h2.5M9 20v-2.75a4 4 0 00-4-4M9 20h2.5a4 4 0 004-4v-2.75M9 6V5a2 2 0 012-2h2a2 2 0 012 2v1m-3 14H9" /></svg>`;
const COST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
const INFO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

const HTML_TEMPLATE = `<div id="/event/*-view" class="view hidden small-container">
            <div id="event-detail">
                <p aria-busy="true">Loading event...</p>
            </div>
        </div>`;

// --- State ---
let notification = null;

// --- Helper Functions ---

function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

async function NavigationEventListner({ resolvedPath, path }) {
    if (resolvedPath !== "/event/*") return;

    const navContainer = document.getElementById('event-detail');
    if (!navContainer) return;

    try {
        const { event } = await ajaxGet("/api" + path);

        navContainer.innerHTML = `
            <div class="form-info" id="event-info-container">
                <article class="form-box">
                    <h2 class="event-title-large">${event.title}</h2>
                    <div class="event-content-split">
                        <div class="event-details-section">
                            <h3>${INFO_SVG} Event Details</h3>
                            <p>${CALENDAR_SVG} <strong>Date:</strong> ${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleString()}</p>
                            <p>${DESCRIPTION_SVG} <strong>Description:</strong> ${event.description || 'No description provided.'}</p>
                            <p>${DIFFICULTY_SVG} <strong>Difficulty:</strong> ${event.difficulty_level}</p>
                            <p>${ATTENDEES_SVG} <strong>Max Attendees:</strong> ${event.max_attendees || 'Unlimited'}</p>
                            <p>${COST_SVG} <strong>Upfront Cost:</strong> £${event.upfront_cost.toFixed(2)}</p>
                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button id="attend-event-button" class="hidden">Attend Event</button>
                                <button id="edit-event-button" class="hidden">Edit Event</button>
                            </div>
                        </div>
                        <div class="event-attendees-section">
                            <h3>${ATTENDEES_SVG} Attendees</h3>
                            <ul class="attendees-list">
                                <li aria-busy="true">Loading attendees...</li>
                            </ul>
                        </div>
                    </div>
                </article>
                <article class="form-box" id="event-attendees-container">
                    <h3>${ATTENDEES_SVG} Attendees</h3>
                    <ul class="attendees-list">
                        <li aria-busy="true">Loading attendees...</li>
                    </ul>
                </article>
            
            </div>`;

        const attendeesResponse = await ajaxGet(`/api${path}/attendees`).catch(() => null);
        const attendeesLists = document.querySelectorAll('.attendees-list');

        if (attendeesLists.length > 0) {
            attendeesLists.forEach(attendeesList => {
                if (attendeesResponse && attendeesResponse.attendees && attendeesResponse.attendees.length > 0) {
                    attendeesList.innerHTML = '';
                    for (const user of attendeesResponse.attendees) {
                        const li = document.createElement('li');
                        li.textContent = `${user.first_name} ${user.last_name}`;
                        attendeesList.appendChild(li);
                    }
                } else {
                    attendeesList.innerHTML = '<li>No attendees yet.</li>';
                }
            });
        }

        const attendButton = document.getElementById('attend-event-button');
        const loggedIn = await ajaxGet('/api/auth/status').then((data) => data.authenticated).catch(() => false);

        try {
            const perms = await ajaxGet('/api/user/elements/can_manage_events');
            if (perms && perms.can_manage_events) {
                const editBtn = document.getElementById('edit-event-button');
                editBtn.classList.remove('hidden');
                editBtn.onclick = () => switchView(`/admin/event/${event.id}`);
            }
        } catch (e) { }

        if (attendButton) {
            if (!loggedIn) {
                attendButton.classList.add('hidden');
            } else {
                const isAttending = await ajaxGet(`/api${path}/isAttending`).then((data) => data.isAttending).catch(() => false);
                attendButton.textContent = isAttending ? 'Leave Event' : 'Attend Event';

                attendButton.classList.remove('hidden');
                attendButton.addEventListener('click', async () => {
                    try {
                        await ajaxPost(`/api/event/${event.id}/${isAttending ? 'leave' : 'attend'}`, {});
                        NavigationEventListner({ resolvedPath, path });
                    } catch (error) {
                        displayNotification('Action Failed', error, 'error');
                    }
                });
            }
        }
    } catch (error) {
        console.error("Failed to load event details:", error);
        navContainer.innerHTML = `<p class="error-message">Could not load event details. You may not have permission to view this event.</p>`;
    }
}

ViewChangedEvent.subscribe(NavigationEventListner);

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);