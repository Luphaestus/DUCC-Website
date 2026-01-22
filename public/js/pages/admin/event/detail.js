import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../common.js';
import { CALENDAR_TODAY_SVG, DESCRIPTION_SVG, BOLT_SVG, GROUP_SVG, CLOSE_SVG, INFO_SVG, LOCATION_ON_SVG, ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG } from '../../../../images/icons/outline/icons.js';

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
    if (actionsEl) actionsEl.innerHTML = ` <button data-nav="/admin/events" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Events</button> `;

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <form id="event-form" class="glass-panel">
                <header class="card-header-flex" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
                    <div style="display:flex; gap:0.5rem;">
                        ${!isNew ? `<button type="button" id="cancel-event-btn" class="small-btn warning outline" title="Cancel Event">${CLOSE_SVG} Cancel Event</button>` : ''}
                        ${!isNew ? `<button type="button" id="delete-event-btn" class="small-btn delete outline" title="Delete">${DELETE_HISTORY_SVG} Delete</button>` : ''}
                    </div>
                </header>
                
                <div class="modern-form-group" style="margin-bottom: 2rem;">
                    <label class="form-label-top" style="font-size: 1.1rem; color: var(--pico-muted-color);">Event Title
                        <input type="text" name="title" value="${event.title}" required class="full-width-input title-input" placeholder="e.g. Weekly Training" style="font-size: 1.5rem; font-weight: bold; margin-top: 0.5rem;">
                    </label>
                </div>

                <div class="event-content-split">
                    <div class="event-details-section">
                        <h3 style="display:flex; align-items:center; gap:0.5rem; color:var(--pico-primary); border-bottom:1px solid rgba(128,128,128,0.2); padding-bottom:0.5rem; margin-bottom:1.5rem;">
                            ${INFO_SVG} Basic Details
                        </h3>
                        
                        <div class="grid-2-col" style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
                            <label>Start Time <input type="datetime-local" name="start" value="${event.start}" required></label>
                            <label>End Time <input type="datetime-local" name="end" value="${event.end}" required></label>
                        </div>
                        
                        <label style="margin-bottom:1.5rem; display:block;">Location <input type="text" name="location" value="${event.location}" placeholder="Where is it happening?"></label>
                        
                        <label style="margin-bottom:1.5rem; display:block;">Description <textarea name="description" rows="5" placeholder="What's the plan?" style="resize:vertical;">${event.description}</textarea></label>
                        
                        <div class="grid-3-col" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:1.5rem; margin-bottom:1.5rem;">
                            <label>Difficulty (1-5) <input type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></label>
                            <label>Max Attendees <input type="number" name="max_attendees" value="${event.max_attendees}" placeholder="0 = Unlimited"></label>
                            <label>Cost (£) <input type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}"></label>
                        </div>

                        <div class="form-divider" style="height:1px; background:rgba(128,128,128,0.2); margin: 2rem 0;"></div>

                        <div class="refund-section" style="margin-bottom:2rem;">
                            <label class="checkbox-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                                <input type="checkbox" id="has-refund-cutoff" ${event.upfront_refund_cutoff ? 'checked' : ''} style="margin:0;"> 
                                Enable Refund Cutoff Date
                            </label>
                            <div id="refund-cutoff-wrapper" class="conditional-input ${event.upfront_refund_cutoff ? '' : 'hidden'}" style="margin-top:1rem; padding-left:1.8rem;">
                                <input type="datetime-local" name="upfront_refund_cutoff" value="${event.upfront_refund_cutoff || ''}">
                            </div>
                        </div>

                        <h3 style="margin-bottom:1rem;">Tags</h3>
                        <div class="tags-selection-grid" style="display:flex; flex-wrap:wrap; gap:0.75rem;">
                            ${allTags.map(tag => `
                                <label class="tag-checkbox" style="cursor:pointer; display:flex; align-items:center;">
                                    <input type="checkbox" name="tags" value="${tag.id}" ${event.tags?.find(t => t.id === tag.id) ? 'checked' : ''} style="display:none;">
                                    <span class="tag-badge ${event.tags?.find(t => t.id === tag.id) ? 'selected' : ''}" style="background-color: ${tag.color}; opacity: 0.6; transition: all 0.2s; border: 2px solid transparent;">${tag.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="form-actions-footer" style="margin-top:2rem; text-align:right;">
                    <button type="submit" class="primary-btn wide-btn">${isNew ? 'Create Event' : 'Save Changes'}</button>
                </div>
            </form>
        </div>`;
    
    // Add logic to highlight selected tags visually if needed
    adminContent.querySelectorAll('input[name="tags"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const span = e.target.nextElementSibling;
            if (e.target.checked) {
                span.style.opacity = '1';
                span.style.transform = 'scale(1.05)';
                span.style.boxShadow = '0 0 0 2px white, 0 0 0 4px var(--pico-primary)';
            } else {
                span.style.opacity = '0.6';
                span.style.transform = 'scale(1)';
                span.style.boxShadow = 'none';
            }
            // Trigger initial state
        });
        // Set initial state
        const span = input.nextElementSibling;
        if (input.checked) {
             span.style.opacity = '1';
             span.style.boxShadow = '0 0 0 2px white, 0 0 0 4px var(--pico-primary)';
        }
    });

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

        const cancelBtn = document.getElementById('cancel-event-btn');
        if (cancelBtn) {
            cancelBtn.onclick = async () => {
                if (!confirm('Cancel this event? This will notify attendees.')) return;
                try {
                    await fetch(`/api/admin/event/${id}/cancel`, { method: 'POST' });
                    notify('Success', 'Event canceled', 'success');
                    switchView('/admin/events');
                } catch (e) {
                    notify('Error', 'Failed to cancel event', 'error');
                }
            };
        }
    }
}