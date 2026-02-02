/**
 * details.js (Admin Event Tab)
 * 
 * Renders the "Details" tab for editing core event information.
 */

import { apiRequest } from '/js/utils/api.js';
import { notify } from '/js/components/notification.js';
import { switchView } from '/js/utils/view.js';
import { UploadWidget } from '/js/widgets/upload/UploadWidget.js';
import { Panel } from '/js/widgets/panel.js';
import { INFO_SVG, IMAGE_SVG } from '/images/icons/outline/icons.js';
import { showConfirmModal } from '/js/utils/modal.js';
import { setupNumberInput } from '/js/utils/utils.js';

export async function renderDetailsTab(container, event, allTags, isNew, globalDefaultUrl) {
    container.innerHTML = `
        <form id="event-form">
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
                    
                    <label>Location <input type="text" name="location" value="${event.location || ''}" placeholder="Where is it happening?"></label>
                    
                    <label>Description <textarea name="description" rows="5" placeholder="What's the plan?">${event.description || ''}</textarea></label>
                    
                    <div class="grid-2-col">
                        <label>Difficulty (1-5) <input type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></label>
                        <label>Cost (£) <input type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost || 0}"></label>
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
                                    <input type="number" name="max_attendees" value="${event.max_attendees || 0}" placeholder="0 = Unlimited">
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

                        <div class="trip-policy">
                            <label class="checkbox-label">
                                <input type="checkbox" name="is_offsite" ${event.is_offsite ? 'checked' : ''}> 
                                External Trip (Requires Transport)
                            </label>
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
            
            <div class="form-actions mt-6">
                <button type="submit" class="wide-btn primary">${isNew ? 'Create Event' : 'Save Changes'}</button>
            </div>
        </form>
    `;

    const imageIdInput = container.querySelector('#image_id_input');
    const form = container.querySelector('#event-form');

    form.querySelectorAll('input[type="number"]').forEach(setupNumberInput);

    const updateEffectiveImage = async () => {
        if (imageIdInput.value) {
            widget.setPreview(`/api/files/${imageIdInput.value}/download?view=true`);
            return;
        }
        const selectedTagIds = Array.from(form.querySelectorAll('input[name="tags"]:checked')).map(cb => parseInt(cb.value));
        try {
            const res = await apiRequest('POST', '/api/admin/events/calculate-fallback-image', { tagIds: selectedTagIds });
            widget.setPreview(res.url || globalDefaultUrl);
        } catch (e) { widget.setPreview(globalDefaultUrl); }
    };

    const widget = new UploadWidget(container.querySelector('#upload-widget-container'), {
        mode: 'inline',
        selectMode: 'single',
        autoUpload: true,
        defaultPreview: event.image_url || globalDefaultUrl,
        onImageSelect: async ({ id }) => {
            imageIdInput.value = id;
            await updateEffectiveImage();
        },
        onRemove: async () => {
            if (isNew) { imageIdInput.value = ''; await updateEffectiveImage(); return true; }
            if (!await showConfirmModal('Remove Image', 'Remove manual image and reset to default?')) return false;
            try {
                await apiRequest('POST', `/api/admin/event/${event.id}/reset-image`);
                notify('Success', 'Image reset to default', 'success');
                imageIdInput.value = ''; await updateEffectiveImage(); return false;
            } catch (err) { notify('Error', err.message, 'error'); return false; }
        }
    });

    form.querySelectorAll('input[name="tags"]').forEach(input => {
        input.addEventListener('change', () => {
            const span = input.nextElementSibling;
            if (input.checked) span.classList.add('selected');
            else span.classList.remove('selected');
            updateEffectiveImage();
        });
    });

    const refundToggle = form.querySelector('#allow-refunds');
    const cutoffWrapper = form.querySelector('#refund-cutoff-wrapper');
    refundToggle.onchange = () => {
        cutoffWrapper.classList.toggle('hidden', !refundToggle.checked);
        if (!refundToggle.checked) cutoffWrapper.querySelector('input').value = '';
    };

    const signupToggle = form.querySelector('#signup_required_toggle');
    const maxAttendeesWrapper = form.querySelector('#max-attendees-wrapper');
    signupToggle.onchange = () => {
        maxAttendeesWrapper.classList.toggle('hidden', !signupToggle.checked);
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.tags = Array.from(form.querySelectorAll('input[name="tags"]:checked')).map(cb => parseInt(cb.value));
        data.signup_required = signupToggle.checked;
        data.is_offsite = form.querySelector('input[name="is_offsite"]').checked;
        data.image_id = imageIdInput.value ? parseInt(imageIdInput.value) : null;
        if (!refundToggle.checked) data.upfront_refund_cutoff = null;

        try {
            if (isNew) {
                const res = await apiRequest('POST', '/api/admin/event', data);
                notify('Success', 'Event created', 'success');
                switchView(`/admin/event/${res.data.id}`);
            } else {
                await apiRequest('PUT', `/api/admin/event/${event.id}`, data);
                notify('Success', 'Event updated', 'success');
            }
        } catch (err) { notify('Error', err.message, 'error'); }
    };
}
