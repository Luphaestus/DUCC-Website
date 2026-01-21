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
    if (actionsEl) actionsEl.innerHTML = ` <button data-nav="/admin/events" class="icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Events</button> `;

    adminContent.innerHTML = /*html*/`
        <form id="event-form" class="form-info">
            <article class="form-box admin-card">
                <header class="card-header-flex">
                    <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
                    ${!isNew ? `<button type="button" id="delete-event-btn" class="delete-icon-btn outline" title="Delete">${DELETE_HISTORY_SVG}</button>` : ''}
                </header>
                
                <div class="modern-form-group">
                    <label class="form-label-top">Title
                        <input type="text" name="title" value="${event.title}" required class="full-width-input title-input" placeholder="Event Title">
                    </label>
                </div>

                <div class="event-content-split">
                    <div class="event-details-section">
                        <h3>${INFO_SVG} Basic Details</h3>
                        <div class="grid-2-col">
                            <label>Start Time <input type="datetime-local" name="start" value="${event.start}" required></label>
                            <label>End Time <input type="datetime-local" name="end" value="${event.end}" required></label>
                        </div>
                        
                        <label>Location <input type="text" name="location" value="${event.location}" placeholder="Where is it happening?"></label>
                        
                        <label>Description <textarea name="description" rows="5" placeholder="What's the plan?">${event.description}</textarea></label>
                        
                        <div class="grid-3-col">
                            <label>Difficulty (1-5) <input type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></label>
                            <label>Max Attendees <input type="number" name="max_attendees" value="${event.max_attendees}" placeholder="0 = Unlimited"></label>
                            <label>Cost (£) <input type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}"></label>
                        </div>

                        <div class="form-divider"></div>

                        <div class="refund-section">
                            <label class="checkbox-label">
                                <input type="checkbox" id="has-refund-cutoff" ${event.upfront_refund_cutoff ? 'checked' : ''}> 
                                Enable Refund Cutoff Date
                            </label>
                            <div id="refund-cutoff-wrapper" class="conditional-input ${event.upfront_refund_cutoff ? '' : 'hidden'}">
                                <input type="datetime-local" name="upfront_refund_cutoff" value="${event.upfront_refund_cutoff || ''}">
                            </div>
                        </div>

                        <h3>Tags</h3>
                        <div class="tags-selection-grid">
                            ${allTags.map(tag => `
                                <label class="tag-checkbox">
                                    <input type="checkbox" name="tags" value="${tag.id}" ${event.tags?.find(t => t.id === tag.id) ? 'checked' : ''}>
                                    <span class="tag-badge" style="background-color: ${tag.color};">${tag.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="form-actions-footer">
                    <button type="submit" class="primary-btn wide-btn">${isNew ? 'Create Event' : 'Save Changes'}</button>
                </div>
            </article>
        </form>`;

    const cutoffCheckbox = document.getElementById('has-refund-cutoff');
    const cutoffWrapper = document.getElementById('refund-cutoff-wrapper');
    cutoffCheckbox.onchange = () => {
        if (cutoffCheckbox.checked) {
            cutoffWrapper.classList.remove('hidden');
        } else {
            cutoffWrapper.classList.add('hidden');
            cutoffWrapper.querySelector('input').value = '';
        }
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