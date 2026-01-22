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
                <header class="card-header-flex">
                    <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
                </header>
                
                <div class="modern-form-group mb-2">
                    <label class="form-label-top">Event Title
                        <input type="text" name="title" value="${event.title}" required class="full-width-input title-input" placeholder="e.g. Weekly Training">
                    </label>
                </div>

                <div class="event-content-split">
                    <div class="event-details-section">
                        <h3 class="section-header-modern">
                            ${INFO_SVG} Basic Details
                        </h3>
                        
                        <div class="grid-2-col mb-1-5">
                            <label>Start Time <input type="datetime-local" name="start" value="${event.start}" required></label>
                            <label>End Time <input type="datetime-local" name="end" value="${event.end}" required></label>
                        </div>
                        
                        <label class="mb-1-5 block">Location <input type="text" name="location" value="${event.location}" placeholder="Where is it happening?"></label>
                        
                        <label class="mb-1-5 block">Description <textarea name="description" rows="5" placeholder="What's the plan?"></textarea></label>
                        
                        <div class="grid-2-col mb-1-5">
                            <label>Difficulty (1-5) <input type="number" name="difficulty_level" min="1" max="5" value="${event.difficulty_level}" required></label>
                            <label>Cost (£) <input type="number" step="0.01" name="upfront_cost" value="${event.upfront_cost}"></label>
                        </div>

                        <div class="form-divider"></div>

                        <div class="settings-group mb-2">
                            <div class="signup-policy">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="signup_required_toggle" name="signup_required" ${event.signup_required ? 'checked' : ''}> 
                                    Signup Required
                                </label>
                                <div id="max-attendees-wrapper" class="conditional-input pl-1-8 ${event.signup_required ? '' : 'hidden'}">
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
                                <div id="refund-cutoff-wrapper" class="conditional-input pl-1-8 ${event.upfront_refund_cutoff ? '' : 'hidden'}">
                                    <label>Refund Cutoff Date
                                        <input type="datetime-local" name="upfront_refund_cutoff" value="${event.upfront_refund_cutoff || ''}">
                                    </label>
                                </div>
                            </div>
                        </div>

                        <h3 class="mb-1">Tags</h3>
                        <div class="tags-selection-grid">
                            ${allTags.map(tag => `
                                <label class="tag-checkbox">
                                    <input type="checkbox" name="tags" value="${tag.id}" ${event.tags?.find(t => t.id === tag.id) ? 'checked' : ''} style="display:none;">
                                    <span class="tag-badge ${event.tags?.find(t => t.id === tag.id) ? 'selected' : ''}" style="--tag-color: ${tag.color}; background-color: var(--tag-color);">${tag.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="event-image-section">
                        <h3 class="section-header-modern">
                            ${IMAGE_SVG} Event Image
                        </h3>
                        <div class="image-upload-container glass-panel" id="drop-zone">
                            <div id="image-preview" class="image-preview" style="--event-image-url: url('${event.image_url || '/images/misc/ducc.png'}');"></div>
                            <div id="upload-progress-container" class="hidden">
                                <progress id="upload-progress" value="0" max="100"></progress>
                                <span id="progress-text">0%</span>
                            </div>
                            <input type="hidden" name="image_url" id="image_url_input" value="${event.image_url || ''}">
                            <label class="file-upload-btn small-btn primary">
                                ${UPLOAD_SVG} <span>Choose or Drop Image</span>
                                <input type="file" id="event-image-file" accept="image/*" style="display:none;">
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="form-actions-footer mt-3 pt-2">
                    <div class="destructive-actions">
                        ${!isNew ? `
                            <button type="button" id="cancel-event-btn" class="small-btn warning outline mr-0-5">${CLOSE_SVG} Cancel Event</button>
                            <button type="button" id="delete-event-btn" class="small-btn delete outline">${DELETE_HISTORY_SVG} Delete</button>
                        ` : ''}
                    </div>
                    <button type="submit" class="primary-btn wide-btn min-w-200">${isNew ? 'Create Event' : 'Save Changes'}</button>
                </div>
            </form>
        </div>`;
    
    // Set description value separately to avoid template string literal issues if it contains backticks or weird chars
    document.querySelector('textarea[name="description"]').value = event.description;

    // Tag Selection Visuals
    adminContent.querySelectorAll('input[name="tags"]').forEach(input => {
        const updateSpan = (el) => {
            const span = el.nextElementSibling;
            if (el.checked) {
                span.classList.add('selected');
            } else {
                span.classList.remove('selected');
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

    // Signup Required Toggle
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

    // Image Upload Handling
    const fileInput = document.getElementById('event-image-file');
    const imagePreview = document.getElementById('image-preview');
    const imageUrlInput = document.getElementById('image_url_input');
    const dropZone = document.getElementById('drop-zone');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');

    const uploadFile = async (file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('files', file);
        formData.append('visibility', 'events');
        formData.append('title', `Event Image - ${Date.now()}`);

        try {
            progressContainer.classList.remove('hidden');
            progressBar.value = 0;
            progressText.textContent = '0%';

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/files', true);

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressBar.value = percent;
                    progressText.textContent = `${percent}%`;
                }
            };

            xhr.onload = () => {
                setTimeout(() => progressContainer.classList.add('hidden'), 500);
                if (xhr.status === 201) {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success && result.ids.length > 0) {
                        const fileId = result.ids[0];
                        const newUrl = `/api/files/${fileId}/download?view=true`;
                        imageUrlInput.value = newUrl;
                        imagePreview.style.setProperty('--event-image-url', `url('${newUrl}')`);
                        notify('Success', 'Image uploaded', 'success');
                    } else {
                        notify('Error', 'Upload succeeded but no ID returned', 'error');
                    }
                } else {
                    notify('Error', 'Upload failed: ' + xhr.status, 'error');
                }
            };

            xhr.onerror = () => {
                progressContainer.classList.add('hidden');
                notify('Error', 'Network error during upload', 'error');
            };

            xhr.send(formData);
        } catch (err) {
            progressContainer.classList.add('hidden');
            notify('Error', 'Failed to upload image', 'error');
        }
    };

    fileInput.onchange = (e) => uploadFile(e.target.files[0]);

    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    };

    dropZone.ondragleave = () => {
        dropZone.classList.remove('drag-over');
    };

    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            uploadFile(e.dataTransfer.files[0]);
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