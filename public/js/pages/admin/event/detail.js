import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { switchView } from '/js/utils/view.js';
import { adminContentID } from '../common.js';
import { CALENDAR_TODAY_SVG, DESCRIPTION_SVG, BOLT_SVG, GROUP_SVG, CLOSE_SVG, INFO_SVG, LOCATION_ON_SVG, ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG, UPLOAD_SVG, IMAGE_SVG } from '../../../../images/icons/outline/icons.js';

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

    let event = { title: '', description: '', location: '', start: '', end: '', difficulty_level: 1, max_attendees: 0, upfront_cost: 0, upfront_refund_cutoff: '', signup_required: 1, image_url: '', tags: [] };
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
    if (actionsEl) actionsEl.innerHTML = ` <button id="back-to-events-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Events</button> `;
    document.getElementById('back-to-events-btn').onclick = () => switchView('/admin/events');

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <form id="event-form" class="glass-panel">
                <header class="card-header-flex" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
                </header>
                
                <div class="modern-form-group" style="margin-bottom: 2rem;">
                    <label class="form-label-top" style="font-size: 1.1rem; color: var(--pico-muted-color);">Event Title
                        <input type="text" name="title" value="${event.title}" required class="full-width-input title-input" placeholder="e.g. Weekly Training" style="font-size: 1.5rem; font-weight: bold; margin-top: 0.5rem;">
                    </label>
                </div>

                <div class="event-content-split" style="display:grid; grid-template-columns: 1.5fr 1fr; gap:2rem;">
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
                        
                        <div class="grid-3-col" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:1.5rem; margin-bottom:1.5rem;">
                            <label>Difficulty (1-5) <input type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></label>
                            <label>Max Attendees <input type="number" name="max_attendees" value="${event.max_attendees}" placeholder="0 = Unlimited"></label>
                            <label>Cost (£) <input type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}"></label>
                        </div>

                        <div class="form-divider" style="height:1px; background:rgba(128,128,128,0.2); margin: 2rem 0;"></div>

                        <div class="settings-group" style="display:flex; flex-direction:column; gap:1.5rem; margin-bottom:2rem;">
                            <label class="checkbox-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                                <input type="checkbox" name="signup_required" ${event.signup_required ? 'checked' : ''} style="margin:0;"> 
                                Signup Required
                            </label>

                            <div class="refund-policy">
                                <label class="checkbox-label" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                                    <input type="checkbox" id="allow-refunds" ${event.upfront_refund_cutoff ? 'checked' : ''} style="margin:0;"> 
                                    Allow Refunds
                                </label>
                                <div id="refund-cutoff-wrapper" class="conditional-input ${event.upfront_refund_cutoff ? '' : 'hidden'}" style="margin-top:1rem; padding-left:1.8rem;">
                                    <label>Refund Cutoff Date
                                        <input type="datetime-local" name="upfront_refund_cutoff" value="${event.upfront_refund_cutoff || ''}">
                                    </label>
                                </div>
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

                    <div class="event-image-section">
                        <h3 style="display:flex; align-items:center; gap:0.5rem; color:var(--pico-primary); border-bottom:1px solid rgba(128,128,128,0.2); padding-bottom:0.5rem; margin-bottom:1.5rem;">
                            ${IMAGE_SVG} Event Image
                        </h3>
                        <div class="image-upload-container glass-panel" style="padding:1.5rem; text-align:center; border: 2px dashed rgba(128,128,128,0.3);">
                            <div id="image-preview" class="image-preview" style="width:100%; height:200px; background-size:cover; background-position:center; margin-bottom:1.5rem; border-radius:8px; background-image: url('${event.image_url || '/images/misc/ducc.png'}'); display: ${event.image_url || true ? 'block' : 'none'};"></div>
                            <input type="hidden" name="image_url" id="image_url_input" value="${event.image_url || ''}">
                            <label class="file-upload-btn small-btn primary" style="cursor:pointer; display:inline-flex; align-items:center; gap:0.5rem;">
                                ${UPLOAD_SVG} Upload Image
                                <input type="file" id="event-image-file" accept="image/*" style="display:none;">
                            </label>
                            <p class="small-text" style="margin-top:0.5rem; opacity:0.7;">Recommended: 1200x600px</p>
                        </div>
                    </div>
                </div>
                
                <div class="form-actions-footer" style="margin-top:3rem; padding-top:2rem; border-top:1px solid rgba(128,128,128,0.2); display:flex; justify-content:space-between; align-items:center;">
                    <div class="destructive-actions">
                        ${!isNew ? `
                            <button type="button" id="cancel-event-btn" class="small-btn warning outline" style="margin-right:0.5rem;">${CLOSE_SVG} Cancel Event</button>
                            <button type="button" id="delete-event-btn" class="small-btn delete outline">${DELETE_HISTORY_SVG} Delete</button>
                        ` : ''}
                    </div>
                    <button type="submit" class="primary-btn wide-btn" style="min-width:200px;">${isNew ? 'Create Event' : 'Save Changes'}</button>
                </div>
            </form>
        </div>`;
    
    // Tag Selection Visuals
    adminContent.querySelectorAll('input[name="tags"]').forEach(input => {
        const updateSpan = (el) => {
            const span = el.nextElementSibling;
            if (el.checked) {
                span.style.opacity = '1';
                span.style.transform = 'scale(1.05)';
                span.style.boxShadow = '0 0 0 2px white, 0 0 0 4px var(--pico-primary)';
            } else {
                span.style.opacity = '0.6';
                span.style.transform = 'scale(1)';
                span.style.boxShadow = 'none';
            }
        };
        input.addEventListener('change', (e) => updateSpan(e.target));
        updateSpan(input);
    });

    // Refund Cutoff Toggle
    const refundToggle = document.getElementById('allow-refunds');
    const cutoffWrapper = document.getElementById('refund-cutoff-wrapper');
    refundToggle.onchange = () => {
        if (refundToggle.checked) {
            cutoffWrapper.classList.remove('hidden');
        } else {
            cutoffWrapper.classList.add('hidden');
            cutoffWrapper.querySelector('input').value = '';
        }
    };

    // Image Upload Handling
    const fileInput = document.getElementById('event-image-file');
    const imagePreview = document.getElementById('image-preview');
    const imageUrlInput = document.getElementById('image_url_input');

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('files', file);
        formData.append('visibility', 'public');
        formData.append('title', `Event Image - ${Date.now()}`);

        try {
            notify('Info', 'Uploading image...', 'info');
            const res = await fetch('/api/files', { method: 'POST', body: formData });
            const result = await res.json();
            
            if (result.success && result.ids.length > 0) {
                const fileId = result.ids[0];
                const newUrl = `/api/files/${fileId}/download?view=true`;
                imageUrlInput.value = newUrl;
                imagePreview.style.backgroundImage = `url('${newUrl}')`;
                notify('Success', 'Image uploaded', 'success');
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            notify('Error', 'Failed to upload image', 'error');
        }
    };

    // Form Submission
    document.getElementById('event-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        data.tags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(cb => parseInt(cb.value));
        data.signup_required = formData.get('signup_required') === 'on';
        data.upfront_cost = parseFloat(data.upfront_cost) || 0;
        data.max_attendees = parseInt(data.max_attendees) || 0;
        data.difficulty_level = parseInt(data.difficulty_level) || 1;

        if (!refundToggle.checked) {
            data.upfront_refund_cutoff = null;
        }

        try {
            if (isNew) {
                await ajaxPost('/api/admin/event', data);
                notify('Success', 'Event created', 'success');
                switchView('/admin/events');
            } else {
                const res = await fetch(`/api/admin/event/${id}`, { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(data) 
                });
                if (!res.ok) throw new Error('Save failed');
                notify('Success', 'Event updated', 'success');
            }
        } catch (err) {
            notify('Error', 'Save failed', 'error');
        }
    };

    // Delete/Cancel Buttons
    if (!isNew) {
        document.getElementById('delete-event-btn').onclick = async () => {
            if (!confirm('Delete event permanently? This cannot be undone.')) return;
            try {
                const res = await fetch(`/api/admin/event/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Delete failed');
                notify('Success', 'Event deleted', 'success');
                switchView('/admin/events');
            } catch (err) {
                notify('Error', 'Failed to delete event', 'error');
            }
        };

        const cancelBtn = document.getElementById('cancel-event-btn');
        if (cancelBtn) {
            cancelBtn.onclick = async () => {
                if (!confirm('Cancel this event? This will notify attendees and process any refunds.')) return;
                try {
                    const res = await fetch(`/api/admin/event/${id}/cancel`, { method: 'POST' });
                    if (!res.ok) throw new Error('Cancel failed');
                    notify('Success', 'Event canceled', 'success');
                    switchView('/admin/events');
                } catch (e) {
                    notify('Error', 'Failed to cancel event', 'error');
                }
            };
        }
    }
}