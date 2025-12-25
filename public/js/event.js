import { ViewChangedEvent, switchView } from "./misc/view.js";
import { ajaxGet, ajaxPost } from "./misc/ajax.js";
import { notify } from './misc/notification.js';
import { BalanceChangedEvent } from './misc/globals.js';

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
const X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.676 2.001l.324 -.001c7.752 0 10 2.248 10 10l-.005 .642c-.126 7.235 -2.461 9.358 -9.995 9.358l-.642 -.005c-7.13 -.125 -9.295 -2.395 -9.358 -9.67v-.325c0 -7.643 2.185 -9.936 9.676 -9.999m2.771 5.105a1 1 0 0 0 -1.341 .447l-1.106 2.21l-1.106 -2.21a1 1 0 0 0 -1.234 -.494l-.107 .047a1 1 0 0 0 -.447 1.341l1.774 3.553l-1.775 3.553a1 1 0 0 0 .345 1.283l.102 .058a1 1 0 0 0 1.341 -.447l1.107 -2.211l1.106 2.211a1 1 0 0 0 1.234 .494l.107 -.047a1 1 0 0 0 .447 -1.341l-1.776 -3.553l1.776 -3.553a1 1 0 0 0 -.345 -1.283z" /></svg>`;
const MINUS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.676 2.001l.324 -.001c7.752 0 10 2.248 10 10l-.005 .642c-.126 7.235 -2.461 9.358 -9.995 9.358l-.642 -.005c-7.13 -.125 -9.295 -2.395 -9.358 -9.67v-.325c0 -7.643 2.185 -9.936 9.676 -9.999m3.324 8.999h-6a1 1 0 0 0 0 2h6a1 1 0 0 0 0 -2z" /></svg>`;

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
        // Fetch event core data and user data in parallel if logged in
        const requests = [ajaxGet("/api" + path)];
        if (loggedIn) {
            requests.push(ajaxGet('/api/user/elements/is_member,free_sessions,filled_legal_info,balance,is_instructor'));
            requests.push(ajaxGet(`/api${path}/isAttending`));
            requests.push(ajaxGet(`/api${path}/attendees`));
            requests.push(ajaxGet(`/api${path}/isPaying`).catch(() => ({ isPaying: false })));
        }

        const [eventResponse, userProfile, isAttendingRes, attendeesResponse, isPayingRes] = await Promise.all(requests);
        const { event } = eventResponse;
        const isAttending = isAttendingRes?.isAttending || false;
        const isPaying = isPayingRes?.isPaying || false;

        // Count coaches in the attendee list
        const attendees = attendeesResponse?.attendees || [];
        // Note: For now we check 'is_instructor' if available, otherwise we might need another way to identify coaches
        // Let's assume the API already filtered correctly or provided hints. 
        // For simplicity, we can fetch coach count specifically.
        const coachCountRes = await ajaxGet(`/api/event/${event.id}/coachCount`).catch(() => ({ count: 0 }));
        const coachCount = coachCountRes.count;

        // --- Attendance Logic & Warnings ---
        let canAttend = true;
        let warningHtml = '';
        const now = new Date();
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const attendeeCount = attendees.length;

        if (loggedIn && !isAttending) {
            if (now > endDate) {
                canAttend = false;
                warningHtml = `<div class="event-warning-banner error">${X_SVG} This event has already ended.</div>`;
            } else if (now > startDate) {
                canAttend = false;
                warningHtml = `<div class="event-warning-banner error">${X_SVG} This event has already started.</div>`;
            } else if (!userProfile.is_instructor && coachCount === 0) {
                canAttend = false;
                warningHtml = `<div class="event-warning-banner warning">${MINUS_SVG} At least one coach must sign up before members can join this event.</div>`;
            } else if (event.max_attendees > 0 && attendeeCount >= event.max_attendees) {
                canAttend = false;
                warningHtml = `<div class="event-warning-banner warning">${MINUS_SVG} This event is currently full.</div>`;
            } else if (!userProfile.filled_legal_info) {
                canAttend = false;
                warningHtml = `<div class="event-warning-banner error">
                    ${X_SVG} You must complete your legal and medical information before signing up.
                    <button class="banner-btn" onclick="switchView('/legal')">Complete Form</button>
                </div>`;
            } else if (!userProfile.is_member && userProfile.free_sessions <= 0) {
                canAttend = false;
                warningHtml = `<div class="event-warning-banner error">
                    ${X_SVG} You are not a member and have no free sessions remaining.
                    <button class="banner-btn" onclick="switchView('/profile')">Join Club</button>
                </div>`;
            } else if (userProfile.balance < -20 && !isPaying) {
                canAttend = false;
                warningHtml = `<div class="event-warning-banner error">
                    ${X_SVG} You have outstanding debts and cannot sign up for new events.
                    <button class="banner-btn" onclick="switchView('/transactions')">View Balance</button>
                </div>`;
            }
        }

        // Process refund logic for display
        const refundCutOffPassed = event.upfront_refund_cutoff ? (now > new Date(event.upfront_refund_cutoff)) : false;
        const refundCutOffDaysLeft = event.upfront_refund_cutoff ? Math.ceil((new Date(event.upfront_refund_cutoff) - now) / (1000 * 60 * 60 * 24)) : null;
        const refundCutOffDateStr = event.upfront_refund_cutoff ? new Date(event.upfront_refund_cutoff).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A';
        const refundToolTip = `<span class="info-tooltip-wrapper">${INFO_SVG}<span class="tooltip-text">The upfront cost is non-refundable as it covers pre-booked expenses like transport or accommodation. Refunds are only possible if someone else takes your place after the cutoff.</span></span>`
        
        const tagsHtml = (event.tags || []).map(tag => `<span class="tag" style="background-color: ${tag.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.85em;">${tag.name}</span>`).join('');

        // Render main event information box
        navContainer.innerHTML = `
            ${warningHtml}
            <div class="form-info" id="event-info-container" style="margin-top: ${warningHtml ? '1rem' : '2rem'}">
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
                                ${attendeesResponse?.attendees?.length > 0 ? 
                                    attendeesResponse.attendees.map(u => `<li>${u.first_name} ${u.last_name}</li>`).join('') : 
                                    '<li>No attendees yet.</li>'}
                            </ul>
                        </div>` : ''}
                    </div>
                </article>
                ${loggedIn ? `
                <article class="form-box" id="event-attendees-container">
                    <h3>${ATTENDEES_SVG} Attendees</h3>
                    <ul class="attendees-list">
                        ${attendeesResponse?.attendees?.length > 0 ? 
                            attendeesResponse.attendees.map(u => `<li>${u.first_name} ${u.last_name}</li>`).join('') : 
                            '<li>No attendees yet.</li>'}
                    </ul>
                </article>` : ''}
            
            </div>`;

        const attendButton = document.getElementById('attend-event-button');
        const buttonContainer = attendButton?.parentElement;

        // Check for admin permissions to show 'Edit' button
        try {
            const perms = await ajaxGet('/api/user/elements/can_manage_events');
            if (perms && perms.can_manage_events) {
                const editBtn = document.getElementById('edit-event-button');
                editBtn.classList.remove('hidden');
                editBtn.onclick = () => switchView(`/admin/event/${event.id}`);
            }
        } catch (e) { }

        // Setup Attend/Leave button
        if (attendButton) {
            if (!loggedIn) {
                if (buttonContainer) buttonContainer.classList.add('hidden');
            } else {
                attendButton.textContent = isAttending ? 'Leave Event' : 'Attend Event';
                attendButton.classList.remove('hidden');
                
                if (!canAttend) {
                    attendButton.disabled = true;
                    attendButton.style.opacity = '0.5';
                    attendButton.style.cursor = 'not-allowed';
                    attendButton.title = 'You cannot attend this event at this time.';
                }

                attendButton.addEventListener('click', async () => {
                    if (!canAttend && !isAttending) return;

                    // Logic for last coach leaving
                    if (isAttending && userProfile.is_instructor && coachCount === 1 && attendees.length > 1) {
                        // Import showConfirmModal if needed or define it. 
                        // Since it's in profile.js, let's define a local version or use native confirm for now if not shared.
                        // Actually, I'll define it locally since we need it here.
                        const confirmed = confirm("Warning: You are the only coach attending this event. If you leave, all other attendees will be automatically removed and refunded. Are you sure you want to leave?");
                        if (!confirmed) return;
                    }

                    try {
                        await ajaxPost(`/api/event/${event.id}/${isAttending ? 'leave' : 'attend'}`, {});
                        BalanceChangedEvent.notify();
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