/**
 * slides.js
 * 
 * Logic for managing homepage slideshow images.
 * 
 * Registered Route: /admin/slides
 */

import { apiRequest } from '@/utils/api';
import { UploadWidget } from '@/widgets/upload/UploadWidget';
import { adminContentID, renderAdminNavBar } from './admin.js';
import { notify, NotificationTypes } from '@/components/notification';
import { Panel } from '@/widgets/panel';
import { IMAGE_SVG, DELETE_SVG, ADD_SVG, CLOSE_SVG } from '@/utils/icons';
import { Modal } from '@/widgets/Modal';
import { showConfirmModal } from '@/utils/modal';

let slideModal: Modal | null = null;
let slideUploadWidget: UploadWidget | null = null;

/**
 * Main rendering function for the slides management dashboard.
 */
export async function renderManageSlides(): Promise<void> {
    const adminContent = document.getElementById(adminContentID);
    if (!adminContent) return;

    slideModal = new Modal({
        id: 'slide-upload-modal',
        title: 'Add Slide',
        content: `<div id="slide-upload-widget"></div>`,
        contentClasses: 'glass-panel modal-lg'
    });

    adminContent.innerHTML = `
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await renderAdminNavBar('slides')}
            </div>
            
            ${Panel({
        title: 'Manage Slideshow',
        icon: IMAGE_SVG,
        action: `<button id="add-slide-btn" class="main-btn small-btn">${ADD_SVG} Add Slide</button>`,
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
 * Initialises the upload modal and widget.
 */
function setupModal(): void {
    if (!slideModal) return;

    slideModal.attachListeners();

    const addBtn = document.getElementById('add-slide-btn');
    if (addBtn) {
        addBtn.onclick = () => { if (slideModal) slideModal.show(); };
    }

    slideUploadWidget = new UploadWidget('slide-upload-widget', {
        mode: 'inline',
        selectMode: 'single',
        autoUpload: true,
        enableLibrary: false,
        inlineLibrary: true,
        accept: 'image/*',
        onImageSelect: async ({ url, id }) => {
            await handleSlideChoice(url, id);
        },
        onUploadError: (err: any) => {
            notify('Error', err.message, NotificationTypes.ERROR);
        }
    });
}

/**
 * Common handler for adding a slide from upload or library.
 * 
 * @param {string} url 
 * @param {string | number | null} id 
 */
async function handleSlideChoice(url: string, id: string | number | null): Promise<void> {
    if (slideModal) slideModal.close();

    try {
        if (id) {
            await apiRequest('POST', '/api/slides/import', { fileId: id });
        } else if (url) {
            notify('Info', 'Direct URL slides are not supported via import. Please upload files.', NotificationTypes.INFO);
            return;
        }

        notify('Success', 'Slide added', NotificationTypes.SUCCESS);
        await fetchAndRenderSlides();
        setTimeout(async () => await fetchAndRenderSlides(), 500); //todo fix this. For some reason it doesn't show up immediately
    } catch (e) {
        notify('Error', 'Failed to add slide', NotificationTypes.ERROR);
    }
}

/**
 * Fetches current slides and renders them in a grid.
 */
async function fetchAndRenderSlides(): Promise<void> {
    const grid = document.getElementById('slides-grid');
    if (!grid) return;

    try {
        grid.innerHTML = '<p class="loading-cell">Loading slides...</p>';
        const data = await apiRequest('GET', '/api/slides/images');
        const slides: any[] = data.slides || [];

        if (slides.length === 0) {
            grid.innerHTML = '<p class="empty-cell">No slides found.</p>';
            return;
        }

        grid.innerHTML = slides.map(slide => {
            return `
            <div class="image-item slide-item" style="background-image: url('${slide.url}')">
                <div class="slide-actions">
                    <button class="delete-slide-btn delete-icon-btn" data-file-id="${slide.id}" title="Delete Slide">
                        ${DELETE_SVG}
                    </button>
                </div>
            </div>
        `}).join('');

        grid.querySelectorAll('.delete-slide-btn').forEach(btn => {
            (btn as HTMLElement).onclick = async (e: MouseEvent) => {
                e.stopPropagation();
                if (!await showConfirmModal('Delete Slide', 'Are you sure you want to delete this slide?')) return;

                const fileId = (btn as HTMLElement).dataset.fileId;
                try {
                    await apiRequest('DELETE', '/api/slides', { fileId });

                    notify('Success', 'Slide deleted', NotificationTypes.SUCCESS);
                    await fetchAndRenderSlides();
                } catch (e) {
                    notify('Error', 'Failed to delete slide', NotificationTypes.ERROR);
                }
            };
        });

        if (slideUploadWidget) {
            slideUploadWidget.options.exclude = slides.map(s => s.url);
        }

    } catch (e) {
        grid.innerHTML = '<p class="error-cell">Failed to load slides.</p>';
    }
}
