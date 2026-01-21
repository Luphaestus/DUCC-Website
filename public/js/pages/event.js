import { ViewChangedEvent, switchView, addRoute } from "/js/utils/view.js";
import { ajaxGet, ajaxPost } from "/js/utils/ajax.js";
import { notify } from '/js/components/notification.js';
import { BalanceChangedEvent } from '/js/utils/globals.js';
import { showConfirmModal } from '/js/utils/modal.js';
import { hasHistory } from '/js/utils/history.js';
import { BRIGHTNESS_ALERT_SVG, DESCRIPTION_SVG, BOLT_SVG, GROUP_SVG, HOURGLASS_TOP_SVG, CURRENCY_POUND_SVG, INFO_SVG, CLOSE_SVG, CHECK_INDETERMINATE_SMALL_SVG, AVG_PACE_SVG, CALENDAR_MONTH_SVG, LOCATION_ON_SVG, ALL_INCLUSIVE_SVG, WALLET_SVG, SCHEDULE_SVG } from '../../images/icons/outline/icons.js';

/**
 * View details for a single event and manage sign-ups.
 * @module EventDetail
 */

addRoute('/event/:id', 'event', { isOverlay: true });

const HTML_TEMPLATE = /*html*/`
<div id="event-view" class="view hidden event-modal-overlay">
    <div class="event-modal-content glass-panel">
        <button class="modal-close-btn" id="event-modal-close">${CLOSE_SVG}</button>
        <div id="event-detail">
            <p aria-busy="true">Loading event...</p>
        </div>
    </div>
</div>`;

let notification = null;

/** Show notification for this view. */
function displayNotification(title, message, type) {
    if (notification) notification();
    notification = notify(title, message, type);
}

/**
 * Fill the attendees list in the UI.
 * @param {number} eventId 
 * @param {boolean} canManage
 */
async function fillAttendeesList(eventId, canManage) {
    try {
        const response = await ajaxGet(`/api/event/${eventId}/attendees`);
        const attendees = response.attendees || [];

        const attendeesListHtml = attendees.length > 0 ? attendees.map(u => {
            const initials = `${u.first_name[0]}${u.last_name[0]}`;
            const fullName = `${u.first_name} ${u.last_name}`;
            const isLeft = u.is_attending === 0;

            return `<div class="attendee-bubble ${isLeft ? 'left' : ''}" title="${fullName}" data-name="${fullName}" ${canManage ? `data-user-id="${u.id}"` : ''}>
                ${initials}
            </div>`;
        }).join('') : '<p class="no-attendees">No attendees yet.</p>';

        const container = document.getElementById('attendees-list-container');
        if (container) container.innerHTML = attendeesListHtml;

        document.querySelectorAll('.attendee-bubble').forEach(bubble => {
            bubble.onclick = (e) => {
                if (window.innerWidth <= 768 && !bubble.dataset.userId) {
                    alert(bubble.dataset.name);
                }
            };
        });
    } catch (e) {
        console.error("Failed to fill attendees list", e);
    }
}

/**
 * Fill the waiting list information in the UI.
 * @param {number} eventId 
 * @param {boolean} isFull
 * @param {boolean} canManage
 */
async function fillWaitlist(eventId, isFull, canManage) {
    try {
        const data = await ajaxGet(`/api/event/${eventId}/waitlist`);
        const summaryField = document.getElementById('waitlist-summary-container');

        if (summaryField) {
            if (isFull && (data.count > 0 || data.position)) {
                summaryField.classList.remove('hidden');
                let html = '';
                if (data.position) {
                    html = `<p>${HOURGLASS_TOP_SVG} <strong>Waitlist:</strong> <span class="highlight-text">${data.position - 1}</span> people in front of you</p>`;
                } else {
                    html = `<p>${HOURGLASS_TOP_SVG} <strong>Waitlist:</strong> <span class="highlight-text">${data.count || 0}</span> people waiting</p>`;
                }

                if (canManage && data.waitlist && data.waitlist.length > 0) {
                    const bubblesHtml = data.waitlist.map(u => {
                        const initials = `${u.first_name[0]}${u.last_name[0]}`;
                        const fullName = `${u.first_name} ${u.last_name}`;
                        return `<div class="attendee-bubble" title="${fullName}" data-name="${fullName}" data-user-id="${u.id}">${initials}</div>`;
                    }).join('');
                    html += `<div class="attendee-bubbles waitlist-members mt-2">${bubblesHtml}</div>`;
                }
                summaryField.innerHTML = html;
            } else {
                summaryField.classList.add('hidden');
            }
        }
    } catch (e) {
        console.error("Failed to fill waitlist", e);
    }
}

/**
 * Setup and update the attend/leave/waitlist button.
 * @param {number} eventId
 * @param {string} path
 * @param {string} resolvedPath
 * @param {boolean} canManage
 */
async function setupEventButtons(eventId, path, resolvedPath, canManage) {
    try {
        const loggedInRes = await ajaxGet('/api/auth/status').catch(() => ({ authenticated: false }));
        const loggedIn = loggedInRes.authenticated;
        const attendButton = document.getElementById('attend-event-button');
        const warningContainer = document.getElementById('event-warning-container');

        if (!loggedIn) {
            if (attendButton) {
                attendButton.textContent = 'Login to Join';
                attendButton.onclick = () => switchView('/login');
                attendButton.classList.remove('hidden');
            }
            if (warningContainer) {
                warningContainer.innerHTML = '';
                warningContainer.classList.add('hidden');
            }
            return;
        }

        const [isAttendingRes, isOnWaitlistRes, attendeesResponse, eventResponse, canJoinRes, coachCountRes] = await Promise.all([
            ajaxGet(`/api/event/${eventId}/isAttending`),
            ajaxGet(`/api/event/${eventId}/isOnWaitlist`).catch(() => ({ isOnWaitlist: false })),
            ajaxGet(`/api/event/${eventId}/attendees`).catch(() => ({ attendees: [] })),
            ajaxGet(`/api/event/${eventId}`),
            ajaxGet(`/api/event/${eventId}/canJoin`).catch(e => ({ canJoin: false, reason: e.message || 'Error' })),
            ajaxGet(`/api/event/${eventId}/coachCount`).catch(() => ({ count: 0 }))
        ]);

        const { event } = eventResponse;
        const coachCount = coachCountRes.count;

        if (!event.signup_required) {
            if (attendButton) {
                attendButton.textContent = 'No Sign-up Required';
                attendButton.disabled = true;
                attendButton.classList.remove('hidden');
            }
            if (warningContainer) {
                warningContainer.innerHTML = '';
                warningContainer.classList.add('hidden');
            }
            return;
        }

        const isAttending = isAttendingRes?.isAttending || false;
        const isOnWaitlist = isOnWaitlistRes?.isOnWaitlist || false;

        const attendees = attendeesResponse?.attendees || [];
        const activeAttendees = attendees.filter(u => u.is_attending === undefined || u.is_attending === 1);
        const attendeeCount = activeAttendees.length;
        const isFull = event.max_attendees > 0 && attendeeCount >= event.max_attendees;

        if (event.enable_waitlist) {
            await fillWaitlist(eventId, isFull, canManage);
        }

        let warningHtml = '';
        let buttonText = 'Attend Event';
        let buttonAction = null;
        let isDisabled = false;
        let isDeleteStyle = false;

        if (event.status === 'canceled') {
            buttonText = 'Event Canceled';
            isDisabled = true;
        } else if (isAttending) {
            buttonText = 'Leave Event';
            isDeleteStyle = true;
            buttonAction = 'leave';

            const now = new Date();
            const cutoff = event.upfront_refund_cutoff ? new Date(event.upfront_refund_cutoff) : null;
            if (event.upfront_cost > 0 && cutoff && now > cutoff) {
                warningHtml = `<div class="glass-warning">${SCHEDULE_SVG} Refund period has passed. Leaving now will not trigger a refund.</div>`;
            }
        } else if (isOnWaitlist) {
            buttonText = 'Leave Waiting List';
            isDeleteStyle = true;
            buttonAction = 'waitlist_leave';
        } else if (!canJoinRes.canJoin) {
            isDisabled = false; 
            if (canJoinRes.reason.includes('Legal info')) {
                buttonText = 'Complete Legal Form';
                warningHtml = `<div class="glass-warning">${INFO_SVG} You must fill out the legal form before joining.</div>`;
                buttonAction = () => switchView('/legal');
            } else if (canJoinRes.reason.includes('free sessions')) {
                buttonText = 'Join Club';
                warningHtml = `<div class="glass-warning">${INFO_SVG} You have used all your free sessions. Please join the club to continue.</div>`;
                buttonAction = () => switchView('/profile');
            } else if (canJoinRes.reason.includes('debts')) {
                buttonText = 'View Balance';
                warningHtml = `<div class="glass-warning">${INFO_SVG} You have outstanding debts. Please clear them before joining.</div>`;
                buttonAction = () => switchView('/transactions');
            } else if (isFull && event.enable_waitlist && canJoinRes.reason === 'Event is full') {
                buttonText = 'Join Waiting List';
                warningHtml = `<div class="glass-warning">${INFO_SVG} This event is full. You can join the waiting list.</div>`;
                buttonAction = 'waitlist_join';
            } else {
                buttonText = 'Cannot Join';
                warningHtml = `<div class="glass-warning">${CLOSE_SVG} ${canJoinRes.reason}</div>`;
                isDisabled = true;
            }
        } else if (isFull && event.enable_waitlist) {
            buttonText = 'Join Waiting List';
            buttonAction = 'waitlist_join';
        }

        if (warningContainer) {
            warningContainer.innerHTML = warningHtml;
            if (warningHtml) warningContainer.classList.remove('hidden');
            else warningContainer.classList.add('hidden');
        }

        if (attendButton) {
            attendButton.textContent = buttonText;
            attendButton.disabled = isDisabled;
            attendButton.classList.remove('hidden');
            if (isDeleteStyle) attendButton.classList.add('delete');
            else attendButton.classList.remove('delete');

            const newBtn = attendButton.cloneNode(true);
            attendButton.parentNode.replaceChild(newBtn, attendButton);

            newBtn.addEventListener('click', async () => {
                if (isDisabled) return;

                if (typeof buttonAction === 'function') {
                    buttonAction();
                    return;
                }

                if (isAttending) {
                    const activeAttendees = attendees.filter(u => u.is_attending === undefined || u.is_attending === 1);
                    try {
                        const userRes = await ajaxGet('/api/user/elements/is_instructor');
                        if (userRes.is_instructor && coachCount === 1 && activeAttendees.length > 1) {
                            const confirmed = await showConfirmModal(
                                "Cancel Event?",
                                "You are the only instructor attending. If you leave, the event will be <strong>canceled</strong> and all other attendees will be notified. Are you sure?"
                            );
                            if (!confirmed) return;
                        }
                    } catch (e) { }
                }

                try {
                    let url = `/api/event/${event.id}/attend`;
                    if (buttonAction === 'leave') url = `/api/event/${event.id}/leave`;
                    else if (buttonAction === 'waitlist_leave') url = `/api/event/${event.id}/waitlist/leave`;
                    else if (buttonAction === 'waitlist_join') url = `/api/event/${event.id}/waitlist/join`;

                    await ajaxPost(url, {});
                    BalanceChangedEvent.notify();
                    await fillAttendeesList(eventId, canManage);
                    await setupEventButtons(eventId, path, resolvedPath, canManage);
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
    if (viewId !== "event") {
        document.getElementById('event-view').classList.add('hidden');
        return;
    }

    const navContainer = document.getElementById('event-detail');
    if (!navContainer) return;

    try {
        const eventResponse = await ajaxGet("/api" + path);
        const { event } = eventResponse;

        const tagsHtml = (event.tags || []).map(tag => `<span class="tag-badge" style="background-color: ${tag.color}65;">${tag.name}</span>`).join('');

        const durationMs = new Date(event.end) - new Date(event.start);
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const durationParts = [];
        if (hours > 0) durationParts.push(`${hours}h`);
        if (minutes > 0) durationParts.push(`${minutes}m`);
        const durationStr = durationParts.length > 0 ? durationParts.join(' ') : '0m';

        const start = new Date(event.start);
        const dateStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        let difficultyBars = '';
        const level = event.difficulty_level || 1;
        for (let i = 1; i <= 5; i++) {
            difficultyBars += `<div class="difficulty-bar ${i <= level ? 'active' : ''}"></div>`;
        }

        const imageUrl = event.image_url || '/images/misc/ducc.png';

        let priceBoxHtml = '';
        if (event.upfront_cost > 0) {
            const now = new Date();
            const cutoff = event.upfront_refund_cutoff ? new Date(event.upfront_refund_cutoff) : null;
            const hasPassed = cutoff ? now > cutoff : false;
            const formatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
            const cutoffStr = cutoff ? cutoff.toLocaleString('en-UK', formatOptions).replace(',', '.') : '';

            let refundMsg = '';
            if (cutoff) {
                if (hasPassed) {
                    refundMsg = `<p class="price-detail expired">${cutoffStr ? 'Refund period ended on ' + cutoffStr : 'No refunds available'}</p>`;
                } else {
                    refundMsg = `<p class="price-detail">Full refund available until ${cutoffStr}</p>`;
                }
            }

            priceBoxHtml = `
                <div class="event-price-box">
                    <div class="price-header">
                        <div class="price-title-group">
                            <div class="pound-icon-box">${CURRENCY_POUND_SVG}</div>
                            <span class="price-label">Event Price</span>
                        </div>
                        <span class="price-value">£${event.upfront_cost.toFixed(2)}</span>
                    </div>
                    <div class="price-body">
                        <div class="price-detail-row">
                            <span class="detail-icon">${WALLET_SVG}</span>
                            <p class="price-detail">Payment required upon joining</p>
                        </div>
                        ${refundMsg ? `
                        <div class="price-detail-row">
                            ${hasPassed ? `<span class="detail-icon expired">${BRIGHTNESS_ALERT_SVG}</span>` : `<span class="detail-icon">${INFO_SVG}</span>`}
                            ${refundMsg}
                        </div>` : ''}
                    </div>
                </div>
            `;
        }

        const isPast = new Date(event.end) < new Date();

        navContainer.innerHTML = /*html*/`
            <div class="event-modal-header ${isPast ? 'past-event' : ''}" style="background-image: url('${imageUrl}');">
                <div class="header-content">
                    <div class="event-tags">${tagsHtml}</div>
                    <h2 class="event-title">${event.title}</h2>
                    <p class="event-location">${LOCATION_ON_SVG} ${event.location || 'Location TBD'}</p>
                </div>
            </div>
            
            <div class="event-modal-body">
                <div class="event-info-boxes">
                    <div class="info-box">
                        <span class="box-title">${CALENDAR_MONTH_SVG} DATE</span>
                        <span class="box-value">${dateStr}</span>
                    </div>
                    <div class="info-box">
                        <span class="box-title">${AVG_PACE_SVG} DURATION</span>
                        <span class="box-value">${durationStr}</span>
                    </div>
                    <div class="info-box">
                        <span class="box-title">${BOLT_SVG} DIFFICULTY</span>
                        <div class="difficulty-container">
                            ${difficultyBars}
                        </div>
                    </div>
                    <div class="info-box">
                        <span class="box-title">${GROUP_SVG} CAPACITY</span>
                        <span class="box-value">${event.attendee_count || 0}/${event.max_attendees || '∞'}</span>
                    </div>
                </div>

                ${priceBoxHtml}

                <div class="glass-panel event-details-content">
                    <div class="description-section">
                        <h3 class="section-title">Description</h3>
                        <p class="description-text">${event.description || 'No description provided.'}</p>
                    </div>

                    <div class="attendees-section">
                        <h3 class="section-title">Attendees</h3>
                        <div id="attendees-list-container" class="attendee-bubbles"></div>
                        <div id="waitlist-summary-container" class="waitlist-info hidden"></div>
                    </div>
                </div>

                <div id="event-warning-container" class="hidden"></div>

                <div class="event-actions">
                    <button id="attend-event-button" class="join-btn hidden">Attend Event</button>
                    <button id="edit-event-button" class="hidden secondary">Edit Event</button>
                </div>
            </div>`;

        const manageRes = await ajaxGet(`/api/event/${event.id}/canManage`).catch(() => ({ canManage: false }));
        const canManage = manageRes.canManage;

        if (canManage) {
            const editBtn = document.getElementById('edit-event-button');
            editBtn?.classList.remove('hidden');
            editBtn.onclick = () => switchView(`/admin/event/${event.id}`);
        }

        const eventId = event.id;
        await Promise.all([
            fillAttendeesList(eventId, canManage),
            setupEventButtons(eventId, path, resolvedPath, canManage)
        ]);

    } catch (error) {
        console.error("Failed to load event details", error);
        navContainer.innerHTML = `<p class="error-text">Failed to load event details. Please try again.</p>`;
    }
}

ViewChangedEvent.subscribe(NavigationEventListner);
document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);

/** Handle modal close: go back or default to /events */
function handleClose() {
    if (hasHistory()) {
        window.history.back();
    } else {
        switchView('/events');
    }
}

document.getElementById('event-view').onclick = (e) => {
    if (e.target.id === 'event-view') {
        handleClose();
    }
};

document.getElementById('event-modal-close').onclick = () => {
    handleClose();
};

document.querySelector('main').addEventListener('click', (e) => {
    const target = e.target.closest('.attendee-bubble[data-user-id]');
    if (target && document.getElementById('event-view').contains(target)) {
        const userId = target.dataset.userId;
        if (userId) switchView(`/admin/user/${userId}`);
    }
});