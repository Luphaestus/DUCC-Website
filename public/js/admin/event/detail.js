import { ajaxGet, ajaxPost } from '../../misc/ajax.js';
import { notify } from '../../misc/notification.js';
import { switchView } from '../../misc/view.js';
import { adminContentID } from '../common.js';

/**
 * Event Detail Editor Module (Admin).
 * Provides a comprehensive form for creating new events or modifying existing ones.
 * Handles:
 * - Datetime input formatting for compatibility with native HTML5 controls.
 * - Multi-select tag management.
 * - Dynamic refund cutoff enabling/disabling.
 * - Create, Read, Update, and Delete (CRUD) operations for events.
 */

// --- Icons ---

const CALENDAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`;
const DESCRIPTION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>`;
const DIFFICULTY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;
const ATTENDEES_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2c0-.656-.126-1.283-.356-1.857M9 20H7a4 4 0 01-4-4v-2.75a4 4 0 014-4h2.5M9 20v-2.75a4 4 0 00-4-4M9 20h2.5a4 4 0 004-4v-2.75M9 6V5a2 2 0 012-2h2a2 2 0 012 2v1m-3 14H9" /></svg>`;
const COST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
const INFO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
const LOCATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`;

// --- Main Render Function ---

/**
 * Renders the full event editing form.
 * @param {string} id - The database ID of the event, or 'new' for creation mode.
 */
export async function renderEventDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    const isNew = id === 'new';

    // Default object for a new event
    let event = {
        title: '', description: '', location: '',
        start: '', end: '', difficulty_level: 1,
        max_attendees: 0, upfront_cost: 0, upfront_refund_cutoff: '', tags: []
    };

    let allTags = [];

    try {
        // Fetch existing data and all available tags
        const eventData = !isNew ? await ajaxGet(`/api/admin/event/${id}`) : null;
        const tagsData = (await ajaxGet('/api/tags')).data || [];

        if (!isNew) {
            event = eventData;
            // Format ISO dates to datetime-local friendly strings (YYYY-MM-DDTHH:MM)
            event.start = new Date(event.start).toISOString().slice(0, 16);
            event.end = new Date(event.end).toISOString().slice(0, 16);
            if (event.upfront_refund_cutoff) {
                event.upfront_refund_cutoff = new Date(event.upfront_refund_cutoff).toISOString().slice(0, 16);
            }
        }
        allTags = tagsData;

    } catch (e) {
        console.error(e);
        return adminContent.innerHTML = '<p>Error loading event or tags.</p>';
    }

    // Update breadcrumbs/navigation actions
    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) {
        actionsEl.innerHTML = ` <button onclick="switchView('/admin/events')">&larr; Back to Events</button> `;
    }

    // Render the form
    adminContent.innerHTML = `
        <form id="event-form" class="form-info">
            <article class="form-box">
                <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
                
                <input type="text" name="title" value="${event.title}" required class="event-title-input" placeholder="Event Title">

                <div class="event-content-split">
                    <div class="event-details-section">
                        <h3>${INFO_SVG} Event Details</h3>
                        
                        <p>
                            ${CALENDAR_SVG} <strong>Start:</strong>
                            <input class="nomargin" type="datetime-local" name="start" value="${event.start}" required>
                        </p>
                        <p>
                            ${CALENDAR_SVG} <strong>End:</strong>
                            <input class="nomargin" type="datetime-local" name="end" value="${event.end}" required>
                        </p>
                        
                        <p>
                            ${LOCATION_SVG} <strong>Location:</strong>
                            <input class="nomargin event-location-input" type="text" name="location" value="${event.location}">
                        </p>

                        <p>
                            ${DESCRIPTION_SVG} <strong>Description:</strong>
                            <textarea class="nomargin event-description-textarea" name="description" rows="5">${event.description}</textarea>
                        </p>

                        <p>
                            ${DIFFICULTY_SVG} <strong>Difficulty (1-5):</strong>
                            <input class="nomargin" type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required>
                        </p>

                        <p>
                            ${ATTENDEES_SVG} <strong>Max Attendees:</strong>
                            <input class="nomargin" type="number" name="max_attendees" value="${event.max_attendees}" placeholder="0 for unlimited">
                        </p>

                        <p>
                            ${COST_SVG} <strong>Upfront Cost (£):</strong>
                            <input class="nomargin" type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}">
                        </p>

                        <p class="refund-cutoff-p">
                            ${COST_SVG} <strong>Refund Cutoff:</strong>
                                <label class="nomargin refund-cutoff-label">
                                    <input class="nomargin" type="checkbox" id="has-refund-cutoff" ${event.upfront_refund_cutoff ? 'checked' : ''}>
                                    Enable Refund Cutoff
                                </label>
                            <div id="refund-cutoff-wrapper" style="display: ${event.upfront_refund_cutoff ? 'block' : 'none'};">
                                <input type="datetime-local" name="upfront_refund_cutoff" value="${event.upfront_refund_cutoff || ''}">
                            </div>
                        </p>
                        
                        <h3>Tags</h3>
                        <div class="nomargin event-tags-list">
                            ${allTags.map(tag => `
                                <label class="event-tag-badge">
                                    <input type="checkbox" name="tags" value="${tag.id}" ${event.tags && event.tags.find(t => t.id === tag.id) ? 'checked' : ''}>
                                    <span class="event-tag-dot" style="background-color: ${tag.color};"></span>
                                    ${tag.name}
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
        </form>
    `;

    // Setup interactive elements: toggle cutoff input visibility
    const cutoffCheckbox = document.getElementById('has-refund-cutoff');
    const cutoffWrapper = document.getElementById('refund-cutoff-wrapper');
    const cutoffInput = cutoffWrapper.querySelector('input');

    cutoffCheckbox.onchange = () => {
        if (cutoffCheckbox.checked) {
            cutoffWrapper.style.display = 'block';
        } else {
            cutoffWrapper.style.display = 'none';
            cutoffInput.value = '';
        }
    };

    // Form submission handler
    document.getElementById('event-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Explicitly extract selected tags (FormData helper doesn't support arrays of values well)
        const selectedTags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(cb => parseInt(cb.value));
        data.tags = selectedTags;

        try {
            if (isNew) {
                await ajaxPost('/api/admin/event', data);
                notify('Success', 'Event created', 'success');
                switchView('/admin/events');
            } else {
                // Use standard fetch for PUT until ajax.js is updated to support it fully if needed
                await fetch(`/api/admin/event/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                notify('Success', 'Event updated', 'success');
            }
        } catch (err) {
            notify('Error', 'Failed to save event', 'error');
        }
    };

    // Deletion handler
    if (!isNew) {
        document.getElementById('delete-event-btn').onclick = async () => {
            await fetch(`/api/admin/event/${id}`, { method: 'DELETE' });
            notify('Success', 'Event deleted', 'success');
            switchView('/admin/events');
        };
    }
}