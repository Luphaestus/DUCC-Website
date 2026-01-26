/**
 * detail.js
 * 
 * Logic for the Event Creator and Editor form.
 * 
 * Registered Routes: /admin/event/new, /admin/event/:id
 */

import { apiRequest } from '/js/utils/api.js';
import { notify } from '/js/components/notification.js';
import { switchView } from '/js/utils/view.js';
import { UploadWidget } from '/js/widgets/upload/UploadWidget.js';
import { adminContentID } from '../admin.js';
import { Panel } from '/js/widgets/panel.js';
import { CLOSE_SVG, INFO_SVG, ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG, IMAGE_SVG } from '../../../../images/icons/outline/icons.js';
import { showConfirmModal } from '/js/utils/modal.js';
import { debounce } from '/js/utils/utils.js';

/**
 * Main rendering function for the event editor form.
 * 
 * @param {string} id - The ID of the event to edit, or 'new' for creation.
 */
export async function renderEventDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    const isNew = id === 'new';

    let event = { title: '', description: '', location: '', start: '', end: '', difficulty_level: 1, max_attendees: 0, upfront_cost: 0, upfront_refund_cutoff: '', signup_required: 1, image_url: '', image_id: null, tags: [] };
    let allTags = [];

    try {
        const [eventData, rawEventData] = !isNew 
            ? await Promise.all([
                apiRequest('GET', `/api/admin/event/${id}`),
                apiRequest('GET', `/api/admin/event/${id}/raw`)
            ])
            : [null, null];
        
        allTags = (await apiRequest('GET', '/api/tags')).data || [];

        if (!isNew) {
            event = eventData;
            event.image_id = rawEventData.image_id;
            event.end = new Date(event.end).toISOString().slice(0, 16);
            if (event.upfront_refund_cutoff) {
                event.upfront_refund_cutoff = new Date(event.upfront_refund_cutoff).toISOString().slice(0, 16);
            }
        }
    } catch (e) {
        return adminContent.innerHTML = '<p>Error loading data.</p>';
    }

    const globalDefaultRes = await apiRequest('GET', '/api/globals/DefaultEventImage');
    const globalDefaultUrl = globalDefaultRes.res?.DefaultEventImage?.data || '/images/misc/ducc.png';

    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = ` <button id="back-to-events-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Events</button> `;
    document.getElementById('back-to-events-btn').onclick = () => switchView('/admin/events');

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <form id="event-form">
                ${Panel({
        title: isNew ? 'Create Event' : 'Edit Event',
        content: /*html*/`
                        <div class="modern-form-group">
                            <label class="form-label-top">Event Title
                                <input type="text" name="title" value="${event.title}" required class="full-width-input title-input" placeholder="e.g. Weekly Training">
                            </label>
                        </div>

                        <div class="event-content-split">
                            <div class="event-details-section">
                                <h3 class="section-header-modern">
                                    ${INFO_SVG} Basic Details
                                </h3>
                                
                                <div class="grid-2-col">
                                    <label>Start Time <input type="datetime-local" name="start" value="${event.start}" required></label>
                                    <label>End Time <input type="datetime-local" name="end" value="${event.end}" required></label>
                                </div>
                                
                                <label>Location <input type="text" name="location" value="${event.location}" placeholder="Where is it happening?"></label>
                                
                                <label>Description <textarea name="description" rows="5" placeholder="What's the plan?"></textarea></label>
                                
                                <div class="grid-2-col">
                                    <label>Difficulty (1-5) <input type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></label>
                                    <label>Cost (£) <input type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}"></label>
                                </div>

                                <div class="form-divider"></div>

                                <div class="settings-group">
                                    <div class="signup-policy">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="signup_required_toggle" name="signup_required" ${event.signup_required ? 'checked' : ''}> 
                                            Signup Required
                                        </label>
                                        <div id="max-attendees-wrapper" class="conditional-input ${event.signup_required ? '' : 'hidden'}">
                                            <label>Max Attendees
                                                <input type="number" name="max_attendees" value="${event.max_attendees}" placeholder="0 = Unlimited">
                                            </label>
                                        </div>
                                    </div>

                                    <div class="refund-policy">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="allow-refunds" ${event.upfront_refund_cutoff ? 'checked' : ''}> 
                                            Allow Refunds
                                        </label>
                                        <div id="refund-cutoff-wrapper" class="conditional-input ${event.upfront_refund_cutoff ? '' : 'hidden'}">
                                            <label>Refund Cutoff Date
                                                <input type="datetime-local" name="upfront_refund_cutoff" value="${event.upfront_refund_cutoff || ''}">
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <h3>Tags</h3>
                                <div class="tags-selection-grid">
                                    ${allTags.map(tag => `
                                        <label class="tag-checkbox">
                                            <input type="checkbox" name="tags" value="${tag.id}" ${event.tags?.find(t => t.id === tag.id) ? 'checked' : ''} style="display:none;">
                                            <span class="tag-badge ${event.tags?.find(t => t.id === tag.id) ? 'selected' : ''}" style="--tag-colour: ${tag.color}; background-color: var(--tag-colour);">${tag.name}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>

                            <div class="event-image-section">
                                <h3 class="section-header-modern">
                                    ${IMAGE_SVG} Event Image
                                </h3>
                                <div id="upload-widget-container"></div>
                                <input type="hidden" name="image_id" id="image_id_input" value="${event.image_id || ''}">
                            </div>
                        </div>
                        
                        <div class="form-actions-footer">
                            <div class="destructive-actions">
                                ${!isNew ? `
                                    <button type="button" id="cancel-event-btn" class="small-btn warning outline">${CLOSE_SVG} Cancel Event</button>
                                    <button type="button" id="delete-event-btn" class="small-btn delete outline">${DELETE_HISTORY_SVG} Delete</button>
                                ` : ''}
                            </div>
                            <button type="submit" class="wide-btn">${isNew ? 'Create Event' : 'Save Changes'}</button>
                        </div>
                    `
    })}
            </form>
        </div>
    `;

    document.querySelector('textarea[name="description"]').value = event.description;

    // --- Interactive Logic Hooks ---

    const updateEffectiveImage = async () => {
        if (imageIdInput.value) {
            widget.setPreview(`/api/files/${imageIdInput.value}/download?view=true`);
            return;
        }

        const selectedTagIds = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(cb => parseInt(cb.value));
        
        try {
            const res = await apiRequest('POST', '/api/admin/events/calculate-fallback-image', { tagIds: selectedTagIds });
            widget.setPreview(res.url || globalDefaultUrl);
        } catch (e) {
            widget.setPreview(globalDefaultUrl);
        }
    };

    // --- Image Upload Widget ---
    const imageIdInput = document.getElementById('image_id_input');

    const getFormData = () => {
        const formData = new FormData(document.getElementById('event-form'));
        const data = Object.fromEntries(formData.entries());

        data.tags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(cb => parseInt(cb.value));
        data.signup_required = formData.get('signup_required') === 'on';
        data.upfront_cost = parseFloat(data.upfront_cost) || 0;
        data.max_attendees = parseInt(data.max_attendees) || 0;
        data.difficulty_level = parseInt(data.difficulty_level) || 1;
        data.image_id = imageIdInput.value ? parseInt(imageIdInput.value) : null;

        if (!document.getElementById('allow-refunds').checked) {
            data.upfront_refund_cutoff = null;
        }
        return data;
    };

    const autoSave = async () => {
        if (isNew) return;
        const data = getFormData();
        try {
            await apiRequest('PUT', `/api/admin/event/${id}`, data);
        } catch (err) {
            notify('Auto-save failed', err.message, 'error');
        }
    };

    const debouncedAutoSave = debounce(autoSave, 1000);

    const widget = new UploadWidget('upload-widget-container', {
        mode: 'inline',
        selectMode: 'single',
        autoUpload: true,
        defaultPreview: event.image_url || globalDefaultUrl,
        onImageSelect: async ({ id }) => {
            imageIdInput.value = id;
            await updateEffectiveImage();
            if (!isNew) autoSave();
        },
        onRemove: async () => {
            imageIdInput.value = '';
            await updateEffectiveImage();
            
            if (isNew) return true;

            if (!await showConfirmModal('Remove Image', 'Remove manual image and reset to default?')) {
                return false; 
            }

            try {
                await apiRequest('POST', `/api/admin/event/${id}/reset-image`);

                notify('Success', 'Image reset to default', 'success');
                imageIdInput.value = '';
                await updateEffectiveImage();
                autoSave();
                return false;
            } catch (err) {
                notify('Error', err.message, 'error');
                return false;
            }
        },
        onUploadError: (err) => {
            notify('Error', err.message || 'Upload failed', 'error');
        },
    });

    adminContent.querySelectorAll('input[name="tags"]').forEach(input => {
        const updateSpan = async (el) => {
            const span = el.nextElementSibling;
            if (el.checked) span.classList.add('selected');
            else span.classList.remove('selected');
            await updateEffectiveImage();
        };
        input.addEventListener('change', (e) => updateSpan(e.target));
        updateSpan(input);
    });

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

    const signupToggle = document.getElementById('signup_required_toggle');
    const maxAttendeesInput = document.querySelector('input[name="max_attendees"]');
    const maxAttendeesWrapper = document.getElementById('max-attendees-wrapper');
    const updateMaxAttendeesState = () => {
        if (signupToggle.checked) {
            maxAttendeesWrapper.classList.remove('hidden');
            maxAttendeesInput.disabled = false;
        } else {
            maxAttendeesWrapper.classList.add('hidden');
            maxAttendeesInput.disabled = true;
            maxAttendeesInput.value = 0;
        }
    };
    signupToggle.onchange = updateMaxAttendeesState;
    updateMaxAttendeesState();

    updateEffectiveImage();

    // --- Form Submission ---
    document.getElementById('event-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = getFormData();

        try {
            if (isNew) {
                await apiRequest('POST', '/api/admin/event', data);
                notify('Success', 'Event created', 'success');
                switchView('/admin/events');
            } else {
                await apiRequest('PUT', `/api/admin/event/${id}`, data);
                notify('Success', 'Event updated', 'success');
            }
        } catch (err) {
            notify('Error', 'Save failed', 'error');
        }
    };

    // --- Destructive Action Handlers ---
    if (!isNew) {
        document.getElementById('delete-event-btn').onclick = async () => {
            if (!await showConfirmModal('Delete Event', 'Delete event permanently? This cannot be undone.')) return;
            try {
                await apiRequest('DELETE', `/api/admin/event/${id}`);
                notify('Success', 'Event deleted', 'success');
                switchView('/admin/events');
            } catch (err) {
                notify('Error', 'Failed to delete event', 'error');
            }
        };

        const cancelBtn = document.getElementById('cancel-event-btn');
        if (cancelBtn) {
            cancelBtn.onclick = async () => {
                if (!await showConfirmModal('Cancel Event', 'Cancel this event? This will notify attendees and process any refunds.')) return;
                try {
                    await apiRequest('POST', `/api/admin/event/${id}/cancel`);
                    notify('Success', 'Event canceled', 'success');
                    switchView('/admin/events');
                } catch (e) {
                    notify('Error', 'Failed to cancel event', 'error');
                }
            };
        }
    }
}