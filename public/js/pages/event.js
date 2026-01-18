import { ViewChangedEvent, switchView, addRoute } from "/js/utils/view.js";
import { ajaxGet, ajaxPost } from "/js/utils/ajax.js";
import { notify } from '/js/components/notification.js';
import { BalanceChangedEvent } from '/js/utils/globals.js';
import { showConfirmModal } from '/js/utils/modal.js';
import { CALENDAR_TODAY_SVG, DESCRIPTION_SVG, BOLT_SVG, GROUP_SVG, HOURGLASS_TOP_SVG, CURRENCY_POUND_SVG, INFO_SVG, CLOSE_SVG, CHECK_INDETERMINATE_SMALL_SVG, AVG_PACE_SVG, BRIGHTNESS_ALERT_SVG } from '../../images/icons/outline/icons.js';

/**
 * View details for a single event and manage sign-ups.
 * @module EventDetail
 */


addRoute('/event/:id', 'event');

/**
 * Base template for event detail view.
 */
const HTML_TEMPLATE = /*html*/`<div id="event-view" class="view hidden small-container">
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
 * Fill the attendees list in the UI.
 * @param {number} eventId 
 */
async function fillAttendeesList(eventId) {
    try {
        const response = await ajaxGet(`/api/event/${eventId}/attendees`);
        const attendees = response.attendees || [];

        const attendeesListHtml = attendees.length > 0 ? attendees.map(u => {
            if (u.is_attending === 0) {
                return `<li class="attendee-left">${u.first_name} ${u.last_name} (Left)</li>`;
            }
            return `<li>${u.first_name} ${u.last_name}</li>`;
        }).join('') : '<li>No attendees yet.</li>';

        document.querySelectorAll('.attendees-list').forEach(el => {
            el.innerHTML = attendeesListHtml;
        });
    } catch (e) {
        console.error("Failed to fill attendees list", e);
    }
}

/**
 * Fill the waiting list information in the UI.
 * @param {number} eventId 
 * @param {boolean} isFull
 */
async function fillWaitlist(eventId, isFull) {
    try {
        const data = await ajaxGet(`/api/event/${eventId}/waitlist`);

        const summaryField = document.getElementById('waitlist-summary-field');
        const summaryValue = document.getElementById('waitlist-summary-value');
        const adminSections = document.querySelectorAll('.waitlist-admin-section');
        const adminLists = document.querySelectorAll('.waitlist-admin-list');

        // Only show waitlist summary if event is full
        if (isFull && (data.count > 0 || data.position)) {
            summaryField?.classList.remove('hidden');
            if (summaryValue) {
                if (data.position) {
                    // User is on waitlist: hide total count, show people in front
                    summaryValue.innerHTML = `<strong>${data.position - 1}</strong> people in front of you`;
                } else {
                    // User not on waitlist: show total count
                    summaryValue.innerHTML = `<strong>${data.count || 0}</strong> people waiting`;
                }
            }
        } else {
            summaryField?.classList.add('hidden');
        }

        // Always show full list for execs if anyone is on it
        if (data.waitlist && data.waitlist.length > 0) {
            adminSections.forEach(s => s.classList.remove('hidden'));
            if (adminLists.length > 0) {
                const listHtml = data.waitlist.map(u => `<li>${u.first_name} ${u.last_name}</li>`).join('');
                adminLists.forEach(l => l.innerHTML = listHtml);
            }
        } else {
            adminSections.forEach(s => s.classList.add('hidden'));
        }
    } catch (e) {
        console.error("Failed to fill waitlist", e);
    }
}

/**
 * Setup and update the attend/leave/waitlist button.
 */
async function setupEventButtons(eventId, path, resolvedPath) {
    try {
        const loggedIn = await ajaxGet('/api/auth/status').then((data) => data.authenticated).catch(() => false);
        const attendButton = document.getElementById('attend-event-button');
        const buttonContainer = attendButton?.parentElement;
        const warningContainer = document.getElementById('event-warning-container');
        const attendeeContainers = [document.querySelector('.event-attendees-section'), document.getElementById('event-attendees-container')];
        const waitlistCountField = document.getElementById('waitlist-count-field');

        if (!loggedIn) {
            buttonContainer?.classList.add('hidden');
            attendeeContainers.forEach(c => c?.classList.add('hidden'));
            waitlistCountField?.classList.add('hidden');
            if (warningContainer) {
                warningContainer.innerHTML = /*html*/`
                    <div class="event-warning-banner info">
                        <span>${INFO_SVG} Please log in to sign up for this event.</span>
                        <div class="banner-actions">
                            <button class="banner-btn" data-nav="/login">Login</button>
                            <button class="banner-btn secondary" data-nav="/signup">Sign Up</button>
                        </div>
                    </div>`;
                const infoContainer = document.getElementById('event-info-container');
                if (infoContainer) infoContainer.style.marginTop = '1rem';
            }
            return;
        }

        attendeeContainers.forEach(c => c?.classList.remove('hidden'));
        waitlistCountField?.classList.remove('hidden');

        const [isAttendingRes, isOnWaitlistRes, attendeesResponse, eventResponse, canJoinRes, userRes, coachCountRes] = await Promise.all([
            ajaxGet(`/api/event/${eventId}/isAttending`),
            ajaxGet(`/api/event/${eventId}/isOnWaitlist`).catch(() => ({ isOnWaitlist: false })),
            ajaxGet(`/api/event/${eventId}/attendees`).catch(() => ({ attendees: [] })),
            ajaxGet(`/api/event/${eventId}`),
            ajaxGet(`/api/event/${eventId}/canJoin`).catch(e => ({ canJoin: false, reason: e.message || 'Error' })),
            ajaxGet('/api/user/elements/is_instructor').catch(() => ({ is_instructor: false })),
            ajaxGet(`/api/event/${eventId}/coachCount`).catch(() => ({ count: 0 }))
        ]);

        const { event } = eventResponse;
        const isInstructor = userRes.is_instructor;
        const coachCount = coachCountRes.count;
        
        if (!event.signup_required) {
            buttonContainer?.classList.add('hidden');
            attendeeContainers.forEach(c => c?.classList.add('hidden'));
            waitlistCountField?.classList.add('hidden');
            if (warningContainer) warningContainer.innerHTML = `<div class="event-warning-banner info">${INFO_SVG} No sign-up required for this event.</div>`;
            return;
        }

        const isAttending = isAttendingRes?.isAttending || false;
        const isOnWaitlist = isOnWaitlistRes?.isOnWaitlist || false;
        
        const attendees = attendeesResponse?.attendees || [];
        const activeAttendees = attendees.filter(u => u.is_attending === undefined || u.is_attending === 1);
        const attendeeCount = activeAttendees.length;
        const isFull = event.max_attendees > 0 && attendeeCount >= event.max_attendees;

        // Refresh waitlist info
        if (event.enable_waitlist) {
            await fillWaitlist(eventId, isFull);
        } else {
            waitlistCountField?.classList.add('hidden');
        }

        let canAttend = true;
        let warningHtml = '';

        if (event.status === 'canceled') {
            canAttend = false;
            warningHtml = `<div class="event-warning-banner error">${CLOSE_SVG} This event has been canceled.</div>`;
        } else if (!isAttending) {
            if (!canJoinRes.canJoin) {
                canAttend = false;
                let actionBtn = '';
                
                if (canJoinRes.reason.includes('Legal info')) {
                    actionBtn = `<button class="banner-btn" data-nav="/legal">Complete Form</button>`;
                } else if (canJoinRes.reason.includes('free sessions')) {
                    actionBtn = `<button class="banner-btn" data-nav="/profile">Join Club</button>`;
                } else if (canJoinRes.reason.includes('debts')) {
                    actionBtn = `<button class="banner-btn" data-nav="/transactions">View Balance</button>`;
                } 

                if (isFull && event.enable_waitlist && !isOnWaitlist && canJoinRes.reason === 'Event is full') {
                     warningHtml = `<div class="event-warning-banner warning">${CHECK_INDETERMINATE_SMALL_SVG} This event is full. You can join the waiting list.</div>`;
                     canAttend = false; // Main button becomes Join Waitlist
                } else {
                     warningHtml = `<div class="event-warning-banner error"><span>${CLOSE_SVG} ${canJoinRes.reason}</span> ${actionBtn}</div>`;
                }
            }
        }

        if (warningContainer) {
            warningContainer.innerHTML = warningHtml;
            const infoContainer = document.getElementById('event-info-container');
            if (infoContainer) infoContainer.style.marginTop = warningHtml ? '1rem' : '2rem';
        }

        if (attendButton) {
            attendButton.classList.remove('hidden');
            buttonContainer?.classList.remove('hidden');

            if (isAttending) attendButton.textContent = 'Leave Event';
            else if (isOnWaitlist) attendButton.textContent = 'Leave Waiting List';
            else if (isFull && event.enable_waitlist) attendButton.textContent = 'Join Waiting List';
            else attendButton.textContent = 'Attend Event';

            const canJoinWaitlist = isFull && event.enable_waitlist && !isOnWaitlist && canJoinRes.reason === 'Event is full'; 
            
            const shouldDisable = !canAttend && !isAttending && !isOnWaitlist && !canJoinWaitlist;
            
            attendButton.disabled = shouldDisable;
            attendButton.style.opacity = shouldDisable ? '0.5' : '1';
            attendButton.style.cursor = shouldDisable ? 'not-allowed' : 'pointer';

            const newBtn = attendButton.cloneNode(true);
            attendButton.parentNode.replaceChild(newBtn, attendButton);

            newBtn.addEventListener('click', async () => {
                if (shouldDisable) return;
                
                if (isAttending) {
                    const activeAttendees = attendees.filter(u => u.is_attending === undefined || u.is_attending === 1);
                    if (isInstructor && coachCount === 1 && activeAttendees.length > 1) {
                        const confirmed = await showConfirmModal(
                            "Cancel Event?",
                            "You are the only instructor attending. If you leave, the event will be <strong>canceled</strong> and all other attendees will be notified. Are you sure?"
                        );
                        if (!confirmed) return;
                    }
                }

                try {
                    let url = `/api/event/${event.id}/attend`;
                    if (isAttending) url = `/api/event/${event.id}/leave`;
                    else if (isOnWaitlist) url = `/api/event/${event.id}/waitlist/leave`;
                    else if (isFull) url = `/api/event/${event.id}/waitlist/join`;

                    await ajaxPost(url, {});
                    BalanceChangedEvent.notify();
                    await fillAttendeesList(eventId);
                    await fillWaitlist(eventId);
                    await setupEventButtons(eventId, path, resolvedPath);
                } catch (error) {
                    displayNotification('Action Failed', error, 'error');
                }
            });
        }
    } catch (e) {
        console.error("Failed to setup event buttons", e);
    }
}

/**
 * Handle view switch to a specific event.
 * @param {object} params
 */
async function NavigationEventListner({ viewId, path, resolvedPath }) {
    if (viewId !== "event") return;

    const navContainer = document.getElementById('event-detail');
    if (!navContainer) return;

    try {
        const eventResponse = await ajaxGet("/api" + path);
        const { event } = eventResponse;

        const now = new Date();
        const refundCutOffPassed = event.upfront_refund_cutoff ? (now > new Date(event.upfront_refund_cutoff)) : false;
        const refundCutOffDateStr = event.upfront_refund_cutoff ? new Date(event.upfront_refund_cutoff).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A';
        const refundToolTip = `<span class="info-tooltip-wrapper">${INFO_SVG}<span class="tooltip-text">The upfront cost is non-refundable as it covers pre-booked expenses. Refunds are only possible if someone else takes your place after the cutoff.</span></span>`
        const tagsHtml = (event.tags || []).map(tag => `<span class="tag-badge" style="background-color: ${tag.color};">${tag.name}</span>`).join('');

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

        navContainer.innerHTML = /*html*/`
            <div id="event-warning-container"></div>
            <div class="form-info" id="event-info-container">
                <article class="form-box">
                    <div class="event-header">
                        <h2 class="event-title-large">${event.title}</h2>
                        <div class="event-title-tags">${tagsHtml}</div>
                    </div>
                    <div class="event-content-split">
                        <div class="event-details-section">
                            <p class="detail-field">
                                <span class="label">${CALENDAR_TODAY_SVG} <strong>Date:</strong></span>
                                <span class="value">${dateTimeStr}</span>
                            </p>
                            <p class="detail-field">
                                <span class="label">${AVG_PACE_SVG} <strong>Length:</strong></span>
                                <span class="value">${durationStr}</span>
                            </p>
                            <p class="detail-field">
                                <span class="label">${DESCRIPTION_SVG} <strong>Description:</strong></span>
                                <span class="value">${event.description || 'No description provided.'}</span>
                            </p>
                            <p class="detail-field">
                                <span class="label">${BOLT_SVG} <strong>Difficulty:</strong></span>
                                <span class="value">${event.difficulty_level}</span>
                            </p>
                            <p class="detail-field">
                                <span class="label">${GROUP_SVG} <strong>Max Attendees:</strong></span>
                                <span class="value">${event.max_attendees || 'Unlimited'}</span>
                            </p>
                            <p class="detail-field hidden" id="waitlist-summary-field">
                                <span class="label">${HOURGLASS_TOP_SVG} <strong>Waitlist:</strong></span>
                                <span class="value" id="waitlist-summary-value"></span>
                            </p>
                            ${event.upfront_cost ? `
                            <p class="detail-field">
                                <span class="label">${CURRENCY_POUND_SVG} <strong>Upfront Cost:</strong></span>
                                <span class="value">£${event.upfront_cost.toFixed(2)} ${event.upfront_cost > 0 && event.upfront_refund_cutoff ? (refundCutOffPassed ? `- no refunds ${refundToolTip}` : `- refunds available until ${refundCutOffDateStr} ${refundToolTip}`) : ''}</span>
                            </p>` : ''}
                            <div class="event-buttons">
                                <button id="attend-event-button" class="hidden">Attend Event</button>
                                <button id="edit-event-button" class="hidden">Edit Event</button>
                            </div>
                        </div>
                        <div class="event-attendees-section hidden">
                            <h3>${GROUP_SVG} Attendees</h3>
                            <ul class="attendees-list"></ul>
                        </div>
                        <div class="waitlist-admin-section event-attendees-section hidden">
                            <h3>${HOURGLASS_TOP_SVG} Waiting List (Admin)</h3>
                            <ol class="waitlist-admin-list waitlist-names-list"></ol>
                        </div>
                    </div>
                </article>
                <article class="form-box" id="event-attendees-container">
                    <h3>${GROUP_SVG} Attendees</h3>
                    <ul class="attendees-list"></ul>
                    <div class="waitlist-admin-section hidden">
                        <h3>${HOURGLASS_TOP_SVG} Waiting List (Admin)</h3>
                        <ol class="waitlist-admin-list waitlist-names-list"></ol>
                    </div>
                </article>
            </div>`;

        // Check manage perms
        ajaxGet(`/api/event/${event.id}/canManage`).then(res => {
            if (res.canManage) {
                const editBtn = document.getElementById('edit-event-button');
                editBtn?.classList.remove('hidden');
                editBtn.onclick = () => switchView(`/admin/event/${event.id}`);
            }
        }).catch(() => {});

        const eventId = event.id;
        await Promise.all([
            fillAttendeesList(eventId),
            setupEventButtons(eventId, path, resolvedPath)
        ]);

    } catch (error) {
        console.error("Failed to load event details", error);
        const loggedIn = await ajaxGet('/api/auth/status').then((data) => data.authenticated).catch(() => false);

        if (!loggedIn) {
            navContainer.innerHTML = /*html*/`
                <div class="event-error-state warning">
                    <div class="error-icon">${BRIGHTNESS_ALERT_SVG}</div>
                    <h2>Event Unavailable</h2>
                    <p>This event may not exist, or you may need to log in to view it.</p>
                    <div class="error-actions">
                        <button data-nav="/login">Login</button>
                        <button class="secondary" data-nav="/signup">Sign Up</button>
                    </div>
                </div>
            `;
        } else {
            navContainer.innerHTML = /*html*/`
                <div class="event-error-state denied">
                    <div class="error-icon">${CLOSE_SVG}</div>
                    <h2>Access Denied</h2>
                    <p>This event may not exist, or you may not have permission to view it.</p>
                    <div class="error-actions">
                        <button data-nav="/events">Back to Events</button>
                    </div>
                </div>
            `;
        }
    }
}

ViewChangedEvent.subscribe(NavigationEventListner);
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);