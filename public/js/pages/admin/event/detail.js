import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../common.js';
import { CALENDAR_TODAY_SVG, DESCRIPTION_SVG, BOLT_SVG, GROUP_SVG, CURRENCY_POUND_SVG, INFO_SVG, LOCATION_ON_SVG, ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG } from '../../../../images/icons/outline/icons.js';

/**
 * Admin event creation and editing form.
 * @module AdminEventDetail
 */

/**
 * Render event detail/editor form.
 * @param {string} id - Database ID or 'new'.
 */
export async function renderEventDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    const isNew = id === 'new';

    let event = { title: '', description: '', location: '', start: '', end: '', difficulty_level: 1, max_attendees: 0, upfront_cost: 0, upfront_refund_cutoff: '', tags: [] };
    let allTags = [];

    try {
        const eventData = !isNew ? await ajaxGet(`/api/admin/event/${id}`) : null;
        allTags = (await ajaxGet('/api/tags')).data || [];

        if (!isNew) {
            event = eventData;
            event.start = new Date(event.start).toISOString().slice(0, 16);
            event.end = new Date(event.end).toISOString().slice(0, 16);
            if (event.upfront_refund_cutoff) event.upfront_refund_cutoff = new Date(event.upfront_refund_cutoff).toISOString().slice(0, 16);
        }
    } catch (e) {
        return adminContent.innerHTML = '<p>Error loading data.</p>';
    }

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = ` <button onclick="switchView('/admin/events')">${ARROW_BACK_IOS_NEW_SVG} Back to Events</button> `;

    adminContent.innerHTML = `
        <form id="event-form" class="form-info">
            <article class="form-box">
                <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
                <input type="text" name="title" value="${event.title}" required class="event-title-input" placeholder="Event Title">
                <div class="event-content-split">
                    <div class="event-details-section">
                        <h3>${INFO_SVG} Event Details</h3>
                        <p>${CALENDAR_TODAY_SVG} <strong>Start:</strong> <input class="nomargin" type="datetime-local" name="start" value="${event.start}" required></p>
                        <p>${CALENDAR_TODAY_SVG} <strong>End:</strong> <input class="nomargin" type="datetime-local" name="end" value="${event.end}" required></p>
                        <p>${LOCATION_ON_SVG} <strong>Location:</strong> <input class="nomargin event-location-input" type="text" name="location" value="${event.location}"></p>
                        <p>${DESCRIPTION_SVG} <strong>Description:</strong> <textarea class="nomargin event-description-textarea" name="description" rows="5">${event.description}</textarea></p>
                        <p>${BOLT_SVG} <strong>Difficulty (1-5):</strong> <input class="nomargin" type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></p>
                        <p>${GROUP_SVG} <strong>Max Attendees:</strong> <input class="nomargin" type="number" name="max_attendees" value="${event.max_attendees}" placeholder="0 for unlimited"></p>
                        <p>${CURRENCY_POUND_SVG} <strong>Upfront Cost (£):</strong> <input class="nomargin" type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}"></p>
                        <p class="refund-cutoff-p">
                            ${DELETE_HISTORY_SVG} <strong>Refund Cutoff:</strong>
                            <label class="nomargin refund-cutoff-label"><input class="nomargin" type="checkbox" id="has-refund-cutoff" ${event.upfront_refund_cutoff ? 'checked' : ''}> Enable</label>
                            <div id="refund-cutoff-wrapper" style="display: ${event.upfront_refund_cutoff ? 'block' : 'none'};">
                                <input type="datetime-local" name="upfront_refund_cutoff" value="${event.upfront_refund_cutoff || ''}">
                            </div>
                        </p>
                        <h3>Tags</h3>
                        <div class="nomargin event-tags-list">
                            ${allTags.map(tag => `
                                <label class="event-tag-badge">
                                    <input type="checkbox" name="tags" value="${tag.id}" ${event.tags?.find(t => t.id === tag.id) ? 'checked' : ''}>
                                    <span class="event-tag-dot" style="background-color: ${tag.color};"></span> ${tag.name}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="event-detail-actions">
                    <button type="submit" class="primary-btn">${isNew ? 'Create Event' : 'Save Changes'}</button>
                    ${!isNew ? `<button type="button" id="delete-event-btn">Delete Event</button>` : ''}
                </div>
            </article>
        </form>`;

    const cutoffCheckbox = document.getElementById('has-refund-cutoff');
    const cutoffWrapper = document.getElementById('refund-cutoff-wrapper');
    cutoffCheckbox.onchange = () => {
        cutoffWrapper.style.display = cutoffCheckbox.checked ? 'block' : 'none';
        if (!cutoffCheckbox.checked) cutoffWrapper.querySelector('input').value = '';
    };

    document.getElementById('event-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.tags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(cb => parseInt(cb.value));

        try {
            if (isNew) {
                await ajaxPost('/api/admin/event', data);
                notify('Success', 'Event created', 'success');
                switchView('/admin/events');
            } else {
                await fetch(`/api/admin/event/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                notify('Success', 'Event updated', 'success');
            }
        } catch (err) {
            notify('Error', 'Save failed', 'error');
        }
    };

    if (!isNew) {
        document.getElementById('delete-event-btn').onclick = async () => {
            if (!confirm('Delete event?')) return;
            await fetch(`/api/admin/event/${id}`, { method: 'DELETE' });
            notify('Success', 'Event deleted', 'success');
            switchView('/admin/events');
        };
    }
}