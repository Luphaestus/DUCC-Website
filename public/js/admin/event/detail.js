import { ajaxGet, ajaxPost } from '../../misc/ajax.js';
import { notify } from '../../misc/notification.js';
import { switchView } from '../../misc/view.js';
import { adminContentID } from '../common.js';

/**
 * Admin event creation and editing form.
 * @module AdminEventDetail
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
const LOCATION_SVG = `<svg
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
  <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
  <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
</svg>`;
const ARROW_LEFT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l14 0" /><path d="M5 12l6 6" /><path d="M5 12l6 -6" /></svg>`;

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
    if (actionsEl) actionsEl.innerHTML = ` <button onclick="switchView('/admin/events')">${ARROW_LEFT_SVG} Back to Events</button> `;

    adminContent.innerHTML = `
        <form id="event-form" class="form-info">
            <article class="form-box">
                <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
                <input type="text" name="title" value="${event.title}" required class="event-title-input" placeholder="Event Title">
                <div class="event-content-split">
                    <div class="event-details-section">
                        <h3>${INFO_SVG} Event Details</h3>
                        <p>${CALENDAR_SVG} <strong>Start:</strong> <input class="nomargin" type="datetime-local" name="start" value="${event.start}" required></p>
                        <p>${CALENDAR_SVG} <strong>End:</strong> <input class="nomargin" type="datetime-local" name="end" value="${event.end}" required></p>
                        <p>${LOCATION_SVG} <strong>Location:</strong> <input class="nomargin event-location-input" type="text" name="location" value="${event.location}"></p>
                        <p>${DESCRIPTION_SVG} <strong>Description:</strong> <textarea class="nomargin event-description-textarea" name="description" rows="5">${event.description}</textarea></p>
                        <p>${DIFFICULTY_SVG} <strong>Difficulty (1-5):</strong> <input class="nomargin" type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></p>
                        <p>${ATTENDEES_SVG} <strong>Max Attendees:</strong> <input class="nomargin" type="number" name="max_attendees" value="${event.max_attendees}" placeholder="0 for unlimited"></p>
                        <p>${COST_SVG} <strong>Upfront Cost (£):</strong> <input class="nomargin" type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}"></p>
                        <p class="refund-cutoff-p">
                            ${COST_SVG} <strong>Refund Cutoff:</strong>
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