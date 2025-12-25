import { ViewChangedEvent, switchView } from "./misc/view.js";
import { ajaxGet, ajaxPost } from "./misc/ajax.js";
import { notify } from './misc/notification.js';

/**
 * Event Detail View Module.
 * 
 * Displays full information for a single event and allows users to sign up or leave.
 * Dynamic rendering is based on the URL parameter (e.g., /event/123).
 */

// --- Constants & Templates ---

// Inline SVGs for UI elements
const CALENDAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
const DESCRIPTION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>`;
const DIFFICULTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;
const ATTENDEES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2c0-.656-.126-1.283-.356-1.857M9 20H7a4 4 0 01-4-4v-2.75a4 4 0 014-4h2.5M9 20v-2.75a4 4 0 00-4-4M9 20h2.5a4 4 0 004-4v-2.75M9 6V5a2 2 0 012-2h2a2 2 0 012 2v1m-3 14H9" /></svg>`;
const COST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
const INFO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;

/**
 * View template placeholder. 
 * Content is filled dynamically in NavigationEventListner.
 */
const HTML_TEMPLATE = `<div id="/event/*-view" class="view hidden small-container">
            <div id="event-detail">
                <p aria-busy="true">Loading event...</p>
            </div>
        </div>`;

// --- State ---
let notification = null; // Stores the dismiss callback for active notification

// --- Helper Functions ---

/**
 * Standardized notification display for this view.
 */
function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

// --- Main Update Function ---

/**
 * Listener for SPA view changes.
 * When path matches /event/*, it extracts the ID, fetches data, and renders the detail card.
 * @param {object} params - SPA navigation parameters.
 */
async function NavigationEventListner({ resolvedPath, path }) {
    if (resolvedPath !== "/event/*") return;

    const navContainer = document.getElementById('event-detail');
    if (!navContainer) return;

    try {
        const loggedIn = await ajaxGet('/api/auth/status').then((data) => data.authenticated).catch(() => false);
        // Fetch event core data
        const { event } = await ajaxGet("/api" + path);

        // Process refund logic for display
        const refundCutOffPassed = event.upfront_refund_cutoff ? (new Date() > new Date(event.upfront_refund_cutoff)) : false;
        const refundCutOffDaysLeft = event.upfront_refund_cutoff ? Math.ceil((new Date(event.upfront_refund_cutoff) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        const refundCutOffDateStr = event.upfront_refund_cutoff ? new Date(event.upfront_refund_cutoff).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A';
        const refundToolTip = `<span class="info-tooltip-wrapper">${INFO_SVG}<span class="tooltip-text">The upfront cost is non-refundable as it covers pre-booked expenses like transport or accommodation which the club cannot recover if you cancel. However, if someone else joins the event to take your place, you will be eligible for a refund.</span></span>`
        
        const tagsHtml = (event.tags || []).map(tag => `<span class="tag" style="background-color: ${tag.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${tag.name}</span>`).join('');

        // Render main event information box
        navContainer.innerHTML = `
            <div class="form-info" id="event-info-container">
                <article class="form-box">
                    <div class="event-header">
                        <h2 class="event-title-large">${event.title}</h2>
                        <div class="event-title-tags">${tagsHtml}</div>
                    </div>
                    <div class="event-content-split">
                        <div class="event-details-section">
                            <p class="detail-field">
                                <span class="label">${CALENDAR_SVG} <strong>Date:</strong></span>
                                <span class="value">${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleString()}</span>
                            </p>
                            <p class="detail-field">
                                <span class="label">${DESCRIPTION_SVG} <strong>Description:</strong></span>
                                <span class="value">${event.description || 'No description provided.'}</span>
                            </p>
                            <p class="detail-field">
                                <span class="label">${DIFFICULTY_SVG} <strong>Difficulty:</strong></span>
                                <span class="value">${event.difficulty_level}</span>
                            </p>
                            <p class="detail-field">
                                <span class="label">${ATTENDEES_SVG} <strong>Max Attendees:</strong></span>
                                <span class="value">${event.max_attendees || 'Unlimited'}</span>
                            </p>
                            ${event.upfront_cost ? `
                            <p class="detail-field">
                                <span class="label">${COST_SVG} <strong>Upfront Cost:</strong></span>
                                <span class="value">£${event.upfront_cost.toFixed(2)} ${event.upfront_cost > 0 && event.upfront_refund_cutoff ? (refundCutOffPassed ? `- no refunds ${refundToolTip}` : `- refunds available until ${refundCutOffDateStr} (${refundCutOffDaysLeft} days left) ${refundToolTip}`) : ''}</span>
                            </p>` : ''}
                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button id="attend-event-button" class="hidden">Attend Event</button>
                                <button id="edit-event-button" class="hidden">Edit Event</button>
                            </div>
                        </div>
                        ${loggedIn ? `
                        <div class="event-attendees-section">
                            <h3>${ATTENDEES_SVG} Attendees</h3>
                            <ul class="attendees-list">
                                <li aria-busy="true">Loading attendees...</li>
                            </ul>
                        </div>` : ''}
                    </div>
                </article>
                ${loggedIn ? `
                <article class="form-box" id="event-attendees-container">
                    <h3>${ATTENDEES_SVG} Attendees</h3>
                    <ul class="attendees-list">
                        <li aria-busy="true">Loading attendees...</li>
                    </ul>
                </article>` : ''}
            
            </div>`;

        if (loggedIn) {
            // Fetch and render the list of attendees
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
        }

        const attendButton = document.getElementById('attend-event-button');

        // Check for admin permissions to show 'Edit' button
        try {
            const perms = await ajaxGet('/api/user/elements/can_manage_events');
            if (perms && perms.can_manage_events) {
                const editBtn = document.getElementById('edit-event-button');
                editBtn.classList.remove('hidden');
                editBtn.onclick = () => switchView(`/admin/event/${event.id}`);
            }
        } catch (e) { }

        // Setup Attend/Leave button based on login status and registration state
        if (attendButton) {
            if (!loggedIn) {
                attendButton.classList.add('hidden');
            } else {
                const isAttending = await ajaxGet(`/api${path}/isAttending`).then((data) => data.isAttending).catch(() => false);
                attendButton.textContent = isAttending ? 'Leave Event' : 'Attend Event';

                attendButton.classList.remove('hidden');
                attendButton.addEventListener('click', async () => {
                    try {
                        // Toggle attendance
                        await ajaxPost(`/api/event/${event.id}/${isAttending ? 'leave' : 'attend'}`, {});
                        // Refresh the view to update lists and buttons
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

// --- Initialization ---

// Register for view change events
ViewChangedEvent.subscribe(NavigationEventListner);

// Register view with main container
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);