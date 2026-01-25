/**
 * slides.js
 * 
 * Logic for managing homepage slideshow images.
 * Allows admins to view current slides, add new ones (upload or library), and delete them.
 * 
 * Registered Route: /admin/slides
 */

import { apiRequest } from '/js/utils/api.js';
import { UploadWidget } from '/js/widgets/upload/UploadWidget.js';
import { adminContentID, renderAdminNavBar } from './admin.js';
import { notify, NotificationTypes } from '/js/components/notification.js';
import { Panel } from '/js/widgets/panel.js';
import { IMAGE_SVG, DELETE_SVG, ADD_SVG, CLOSE_SVG } from '../../../images/icons/outline/icons.js';
import { Modal } from '/js/widgets/Modal.js';

let slideModal = null;

/**
 * Main rendering function for the slides management dashboard.
 */
export async function renderManageSlides() {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    // Create modal instance if not already created (or recreate to ensure fresh state)
    slideModal = new Modal({
        id: 'slide-upload-modal',
        title: 'Add Slide',
        content: `
            <p>Upload a new image or select from the library.</p>
            <div id="slide-upload-widget"></div>
        `,
        contentClasses: 'glass-panel'
    });

    adminContent.innerHTML = `
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('slides')}
            </div>
            
            ${Panel({
                title: 'Manage Slideshow',
                icon: IMAGE_SVG,
                action: `<button id="add-slide-btn" class="primary-btn small-btn">${ADD_SVG} Add Slide</button>`,
                content: `
                    <div id="slides-grid" class="image-grid mt-2">
                        <p class="loading-cell">Loading slides...</p>
                    </div>
                `
            })}
        </div>

        ${slideModal.getHTML()}
    `;

    setupModal();
    await fetchAndRenderSlides();
}

/**
 * Initializes the upload modal and widget.
 */
function setupModal() {
    if (!slideModal) return;

    slideModal.attachListeners();

    const addBtn = document.getElementById('add-slide-btn');
    if (addBtn) {
        addBtn.onclick = () => slideModal.show();
    }

    // Initialize Widget once
    new UploadWidget('slide-upload-widget', {
        mode: 'inline',
        selectMode: 'single',
        autoUpload: true,
        enableLibrary: true,
        accept: 'image/*',
        onImageSelect: async ({ url, id }) => {
            slideModal.close();

            if (id) {
                // Imported from Library or Uploaded to FilesAPI
                try {
                    await apiRequest('POST', '/api/slides/import', { fileId: id });
                    notify('Success', 'Slide added', NotificationTypes.SUCCESS);
                    fetchAndRenderSlides();
                } catch (e) {
                    notify('Error', 'Failed to add slide', NotificationTypes.ERROR);
                }
            } else {
                notify('Info', 'That image is already a slide (or URL only)', NotificationTypes.INFO);
            }
        },
        onUploadError: (err) => {
            notify('Error', err.message, NotificationTypes.ERROR);
        }
    });
}

/**
 * Fetches current slides and renders them in a grid.
 */
async function fetchAndRenderSlides() {
    const grid = document.getElementById('slides-grid');
    if (!grid) return;

    try {
        const data = await apiRequest('GET', '/api/slides/images');
        const images = data.images || [];

        if (images.length === 0) {
            grid.innerHTML = '<p class="empty-cell">No slides found.</p>';
            return;
        }

        grid.innerHTML = images.map(url => {
            const filename = url.split('/').pop();
            return `
            <div class="image-item slide-item" style="background-image: url('${url}')">
                <div class="slide-actions">
                    <button class="delete-slide-btn delete-icon-btn" data-filename="${filename}" title="Delete Slide">
                        ${DELETE_SVG}
                    </button>
                </div>
            </div>
        `}).join('');

        // Attach delete listeners
        grid.querySelectorAll('.delete-slide-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.stopPropagation(); // Prevent clicking the image background if we add logic there
                if (!confirm('Delete this slide?')) return;

                const filename = btn.dataset.filename;
                try {
                    // Send JSON body for DELETE
                    await fetch('/api/slides', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ filename })
                    }).then(res => {
                        if (!res.ok) throw new Error('Delete failed');
                        return res.json();
                    });

                    notify('Success', 'Slide deleted', NotificationTypes.SUCCESS);
                    fetchAndRenderSlides();
                } catch (e) {
                    notify('Error', 'Failed to delete slide', NotificationTypes.ERROR);
                }
            };
        });

    } catch (e) {
        grid.innerHTML = '<p class="error-cell">Failed to load slides.</p>';
    }
}
