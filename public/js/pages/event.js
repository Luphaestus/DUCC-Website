import { ViewChangedEvent, switchView, addRoute } from "/js/utils/view.js";
import { ajaxGet, ajaxPost } from "/js/utils/ajax.js";
import { notify } from '/js/components/notification.js';
import { BalanceChangedEvent } from '/js/utils/globals.js';

/**
 * View details for a single event and manage sign-ups.
 * @module EventDetail
 */

// --- Icons ---
const CALENDAR_SVG = `<svg
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
  <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" />
  <path d="M16 3v4" />
  <path d="M8 3v4" />
  <path d="M4 11h16" />
  <path d="M11 15h1" />
  <path d="M12 15v3" />
</svg>`;
const DESCRIPTION_SVG = `<svg
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
  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
  <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
  <path d="M9 17h6" />
  <path d="M9 13h6" />
</svg>`;
const DIFFICULTY_SVG = `<svg
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
  <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11" />
</svg>`;
const ATTENDEES_SVG = `<svg
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
  <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
  <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
</svg>`;
const COST_SVG = `<svg
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
  <path d="M17 18.5a6 6 0 0 1 -5 0a6 6 0 0 0 -5 .5a3 3 0 0 0 2 -2.5v-7.5a4 4 0 0 1 7.45 -2m-2.55 6h-7" />
</svg>`;
const INFO_SVG = `<svg
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
  <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
  <path d="M12 9h.01" />
  <path d="M11 12h1v4h1" />
</svg>`;
const X_SVG = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="currentColor"
>
  <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-6.489 5.8a1 1 0 0 0 -1.218 1.567l1.292 1.293l-1.292 1.293l-.083 .094a1 1 0 0 0 1.497 1.32l1.293 -1.292l1.293 1.292l.094 .083a1 1 0 0 0 1.32 -1.497l-1.292 -1.293l1.292 -1.293l.083 -.094a1 1 0 0 0 -1.497 -1.32l-1.293 1.292l-1.293 -1.292l-.094 -.083z" />
</svg>`;
const MINUS_SVG = `<svg
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
  <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
  <path d="M9 12l6 0" />
</svg>`;

addRoute('/event/:id', 'event');

/**
 * Base template for event detail view.
 */
const HTML_TEMPLATE = `<div id="event-view" class="view hidden small-container">
            <div id="event-detail">
                <p aria-busy="true">Loading event...</p>
            </div>
        </div>`;

let notification = null;

/**
 * Show notification for this view.
 */
function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

/**
 * Handle view switch to a specific event.
 * @param {object} params
 */
async function NavigationEventListner({ viewId, path }) {
    if (viewId !== "event") return;

    const navContainer = document.getElementById('event-detail');
    if (!navContainer) return;

    try {
        const loggedIn = await ajaxGet('/api/auth/status').then((data) => data.authenticated).catch(() => false);
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

        const attendees = attendeesResponse?.attendees || [];
        const coachCountRes = await ajaxGet(`/api/event/${event.id}/coachCount`).catch(() => ({ count: 0 }));
        const coachCount = coachCountRes.count;

        let canAttend = true;
        let warningHtml = '';
        const now = new Date();
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);

        // Filter out attendees who have left for the count check
        const activeAttendees = attendees.filter(u => u.is_attending === undefined || u.is_attending === 1);
        const attendeeCount = activeAttendees.length;

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

        const refundCutOffPassed = event.upfront_refund_cutoff ? (now > new Date(event.upfront_refund_cutoff)) : false;
        const refundCutOffDateStr = event.upfront_refund_cutoff ? new Date(event.upfront_refund_cutoff).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A';
        const refundToolTip = `<span class="info-tooltip-wrapper">${INFO_SVG}<span class="tooltip-text">The upfront cost is non-refundable as it covers pre-booked expenses. Refunds are only possible if someone else takes your place after the cutoff.</span></span>`
        const tagsHtml = (event.tags || []).map(tag => `<span class="tag-badge" style="background-color: ${tag.color};">${tag.name}</span>`).join('');

        const attendeesListHtml = attendees.length > 0 ? attendees.map(u => {
            if (u.is_attending === 0) {
                return `<li class="attendee-left">${u.first_name} ${u.last_name} (Left)</li>`;
            }
            return `<li>${u.first_name} ${u.last_name}</li>`;
        }).join('') : '<li>No attendees yet.</li>';

        // Format duration
        const durationMs = new Date(event.end) - new Date(event.start);
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const durationParts = [];
        if (hours > 0) durationParts.push(`${hours}h`);
        if (minutes > 0) durationParts.push(`${minutes}m`);
        const durationStr = durationParts.length > 0 ? durationParts.join(' ') : '0m';

        // Format start date and time
        const start = new Date(event.start);
        const month = start.toLocaleDateString('en-GB', { month: 'short' });
        const day = start.getDate();

        const mins = start.getMinutes();
        const hour = start.getHours();
        const timeStr = `${hour % 12 || 12}${mins ? ':' + mins.toString().padStart(2, '0') : ''}${hour >= 12 ? 'pm' : 'am'}`;

        const dateTimeStr = `${month} ${day}, ${timeStr}`;

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
                                <span class="value">${dateTimeStr}</span>
                            </p>
                            <p class="detail-field">
                                <span class="label">${CALENDAR_SVG} <strong>Length:</strong></span>
                                <span class="value">${durationStr}</span>
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
                                <span class="value">£${event.upfront_cost.toFixed(2)} ${event.upfront_cost > 0 && event.upfront_refund_cutoff ? (refundCutOffPassed ? `- no refunds ${refundToolTip}` : `- refunds available until ${refundCutOffDateStr} ${refundToolTip}`) : ''}</span>
                            </p>` : ''}
                            <div class="event-buttons">
                                <button id="attend-event-button" class="hidden">Attend Event</button>
                                <button id="edit-event-button" class="hidden">Edit Event</button>
                            </div>
                        </div>
                        ${loggedIn ? `
                        <div class="event-attendees-section">
                            <h3>${ATTENDEES_SVG} Attendees</h3>
                            <ul class="attendees-list">
                                ${attendeesListHtml}
                            </ul>
                        </div>` : ''}
                    </div>
                </article>
                ${loggedIn ? `
                <article class="form-box" id="event-attendees-container">
                    <h3>${ATTENDEES_SVG} Attendees</h3>
                    <ul class="attendees-list">
                        ${attendeesListHtml}
                    </ul>
                </article>` : ''}
            </div>`;

        const attendButton = document.getElementById('attend-event-button');
        const buttonContainer = attendButton?.parentElement;

        try {
            const perms = await ajaxGet('/api/user/elements/can_manage_events');
            if (perms?.can_manage_events) {
                const editBtn = document.getElementById('edit-event-button');
                editBtn?.classList.remove('hidden');
                editBtn.onclick = () => switchView(`/admin/event/${event.id}`);
            }
        } catch (e) { }

        if (attendButton) {
            if (!loggedIn) {
                buttonContainer?.classList.add('hidden');
            } else {
                attendButton.textContent = isAttending ? 'Leave Event' : 'Attend Event';
                attendButton.classList.remove('hidden');

                if (!canAttend) {
                    attendButton.disabled = true;
                    attendButton.style.opacity = '0.5';
                    attendButton.style.cursor = 'not-allowed';
                }

                attendButton.addEventListener('click', async () => {
                    if (!canAttend && !isAttending) return;
                    if (isAttending && userProfile.is_instructor && coachCount === 1 && attendees.length > 1) {
                        if (!confirm("Warning: You are the last coach. Leaving will remove all other attendees. Proceed?")) return;
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
        navContainer.innerHTML = `<p class="error-message">Could not load event details.</p>`;
    }
}

ViewChangedEvent.subscribe(NavigationEventListner);
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);