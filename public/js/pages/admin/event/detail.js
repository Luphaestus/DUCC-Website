/**
 * detail.js
 * 
 * Logic for the Event Creator and Editor form.
 * Handles extensive event metadata including times, location, difficulty,
 * cost, and sign-up policies. Supports image uploading and tag assignment.
 * 
 * Registered Routes: /admin/event/new, /admin/event/:id
 */

import { ajaxGet, ajaxPost } from '/js/utils/ajax.js';
import { notify } from '/js/components/notification.js';
import { switchView } from '/js/utils/view.js';
import { uploadFile } from '/js/utils/upload.js';
import { library, loadLibrary } from '../util/library.js';
import { adminContentID } from '../common.js';
import { CALENDAR_TODAY_SVG, DESCRIPTION_SVG, BOLT_SVG, GROUP_SVG, CLOSE_SVG, INFO_SVG, LOCATION_ON_SVG, ARROW_BACK_IOS_NEW_SVG, DELETE_HISTORY_SVG, UPLOAD_SVG, IMAGE_SVG } from '../../../../images/icons/outline/icons.js';

/**
 * Main rendering function for the event editor form.
 * 
 * @param {string} id - The ID of the event to edit, or 'new' for creation.
 */
export async function renderEventDetail(id) {
    const adminContent = document.getElementById(adminContentID);
    const isNew = id === 'new';

    // Initial state
    let event = { title: '', description: '', location: '', start: '', end: '', difficulty_level: 1, max_attendees: 0, upfront_cost: 0, upfront_refund_cutoff: '', signup_required: 1, image_url: '', tags: [] };
    let allTags = [];

    try {
        const eventData = !isNew ? await ajaxGet(`/api/admin/event/${id}`) : null;
        allTags = (await ajaxGet('/api/tags')).data || [];

        if (!isNew) {
            event = eventData;
            // Format dates for datetime-local input fields
            event.start = new Date(event.start).toISOString().slice(0, 16);
            event.end = new Date(event.end).toISOString().slice(0, 16);
            if (event.upfront_refund_cutoff) {
                event.upfront_refund_cutoff = new Date(event.upfront_refund_cutoff).toISOString().slice(0, 16);
            }
        }
    } catch (e) {
        return adminContent.innerHTML = '<p>Error loading data.</p>';
    }

    // Set up toolbar action
    const actionsEl = document.getElementById('admin-header-actions');
    if (actionsEl) actionsEl.innerHTML = ` <button id="back-to-events-btn" class="small-btn outline secondary icon-text-btn">${ARROW_BACK_IOS_NEW_SVG} Back to Events</button> `;
    document.getElementById('back-to-events-btn').onclick = () => switchView('/admin/events');

    adminContent.innerHTML = /*html*/`
        <div class="glass-layout">
            <form id="event-form" class="glass-panel">
                <header class="card-header-flex">
                    <h2>${isNew ? 'Create Event' : 'Edit Event'}</h2>
                </header>
                
                <!-- Title Field -->
                <div class="modern-form-group mb-2">
                    <label class="form-label-top">Event Title
                        <input type="text" name="title" value="${event.title}" required class="full-width-input title-input" placeholder="e.g. Weekly Training">
                    </label>
                </div>

                <div class="event-content-split">
                    <!-- Left Section: Basic Info & Logic -->
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

                        <!-- Policy Settings -->
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

                        <!-- Tag Selection -->
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

                    <!-- Right Section: Media -->
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
                            <div class="image-actions-row">
                                <label class="file-upload-btn small-btn primary flex-grow">
                                    ${UPLOAD_SVG} <span>Choose or Drop Image</span>
                                    <input type="file" id="event-image-file" accept="image/*" style="display:none;">
                                </label>
                                <button type="button" id="open-library-btn" class="small-btn primary" title="Choose from Library">${IMAGE_SVG} Library</button>
                                ${!isNew ? `<button type="button" id="remove-image-btn" class="small-btn delete outline" title="Reset to Default">${CLOSE_SVG} Remove</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Form Footer Actions -->
                <div class="form-actions-footer mt-3 pt-2">
                    <div class="destructive-actions mb-1">
                        ${!isNew ? `
                            <button type="button" id="cancel-event-btn" class="small-btn warning outline no-margin" style="flex: 1;">${CLOSE_SVG} Cancel Event</button>
                            <button type="button" id="delete-event-btn" class="small-btn delete outline no-margin" style="flex: 1;">${DELETE_HISTORY_SVG} Delete</button>
                        ` : ''}
                    </div>
                    <button type="submit" class="primary-btn wide-btn min-w-200">${isNew ? 'Create Event' : 'Save Changes'}</button>
                </div>
            </form>
        </div>

        <dialog id="image-picker-modal" class="modern-modal">
            <article class="modal-content glass-panel max-w-800">
                <button class="modal-close-btn" id="close-image-modal">${CLOSE_SVG}</button>
                <header>
                    <h3>Choose Image</h3>
                </header>
                <div class="image-picker-content">
                    ${library()}
                </div>
            </article>
        </dialog>
    `;
    
    // Set description separately to handle special characters safely
    document.querySelector('textarea[name="description"]').value = event.description;

    // --- Interactive Logic Hooks ---

    // Tag Checkbox Selection Visuals
    adminContent.querySelectorAll('input[name="tags"]').forEach(input => {
        const updateSpan = (el) => {
            const span = el.nextElementSibling;
            if (el.checked) span.classList.add('selected');
            else span.classList.remove('selected');
        };
        input.addEventListener('change', (e) => updateSpan(e.target));
        updateSpan(input);
    });

    // Refund Cutoff Visibility Toggle
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

    // Signup Required Logic
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

    // --- Image Upload Logic ---
    const fileInput = document.getElementById('event-image-file');
    const imagePreview = document.getElementById('image-preview');
    const imageUrlInput = document.getElementById('image_url_input');
    const dropZone = document.getElementById('drop-zone');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');

    /**
     * Helper to handle file upload using the central utility
     */
    const handleUpload = async (file) => {
        if (!file) return;
        try {
            progressContainer.classList.remove('hidden');
            const fileId = await uploadFile(file, {
                visibility: 'events',
                title: `Event Image - ${Date.now()}`,
                onProgress: (percent) => {
                    progressBar.value = percent;
                    progressText.textContent = `${percent}%`;
                }
            });
            setTimeout(() => progressContainer.classList.add('hidden'), 500);
            
            const newUrl = `/api/files/${fileId}/download?view=true`;
            imageUrlInput.value = newUrl;
            imagePreview.style.setProperty('--event-image-url', `url('${newUrl}')`);
            notify('Success', 'Image uploaded', 'success');
        } catch (err) {
            progressContainer.classList.add('hidden');
            notify('Error', err.message || 'Upload failed', 'error');
        }
    };

    fileInput.onchange = (e) => handleUpload(e.target.files[0]);

    // Drag-and-drop listeners
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
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    // --- Library Selection Logic ---
    const modal = document.getElementById('image-picker-modal');
    const closeBtn = document.getElementById('close-image-modal');

    const selectImage = (url) => {
        imageUrlInput.value = url;
        imagePreview.style.setProperty('--event-image-url', `url('${url}')`);
        modal.close();
    };

    document.getElementById('open-library-btn').onclick = () => {
        modal.showModal();
        loadLibrary(selectImage);
    };

    closeBtn.onclick = () => modal.close();
    modal.onclick = (e) => { if (e.target === modal) modal.close(); };

    // --- Form Submission ---
    document.getElementById('event-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        // Parse complex fields
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

    // --- Image Action Handlers ---
    if (!isNew) {
        const removeImgBtn = document.getElementById('remove-image-btn');
        if (removeImgBtn) {
            removeImgBtn.onclick = async () => {
                if (!confirm('Remove manual image and reset to default?')) return;
                try {
                    const res = await fetch(`/api/admin/event/${id}/reset-image`, { method: 'POST' });
                    if (!res.ok) throw new Error('Failed to reset image');
                    
                    notify('Success', 'Image reset to default', 'success');
                    
                    // Update UI state
                    imageUrlInput.value = '';
                    
                    // Fetch updated event to see what the new default is
                    const updatedEvent = await ajaxGet(`/api/admin/event/${id}`);
                    imagePreview.style.setProperty('--event-image-url', `url('${updatedEvent.image_url || '/images/misc/ducc.png'}')`);
                } catch (err) {
                    notify('Error', err.message, 'error');
                }
            };
        }
    }

    // --- Destructive Action Handlers ---
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