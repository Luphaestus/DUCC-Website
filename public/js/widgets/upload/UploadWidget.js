/**
 * UploadWidget.js
 * 
 * Reusable component for file uploads with inline/modal modes and single/multi-selection.
 */

import { uploadFile } from '/js/utils/api.js';
import { renderLibrary, refreshLibrary } from './Library.js';
import { UPLOAD_SVG, CLOSE_SVG, IMAGE_SVG, INFO_SVG } from '/images/icons/outline/icons.js';
import { Modal } from '/js/widgets/Modal.js';
import { notify } from '/js/components/notification.js';

export class UploadWidget {
    /**
     * @param {HTMLElement|string} container - The DOM element or ID to render into.
     * @param {object} options
     * @param {string} [options.mode='inline'] - 'inline' (compact) or 'modal' (large area).
     * @param {string} [options.selectMode='single'] - 'single' or 'multiple'.
     * @param {boolean} [options.autoUpload=true] - If true, uploads immediately upon selection.
     * @param {string} [options.accept='image/*'] - File accept attribute.
     * @param {string} [options.defaultPreview=null] - URL for initial preview (single mode only).
     * @param {boolean} [options.enableLibrary=true] - Show library button (opens modal).
     * @param {boolean} [options.inlineLibrary=false] - If true, renders library grid directly below widget.
     * @param {string[]} [options.exclude=[]] - List of URLs or IDs to exclude from the library.
     * @param {boolean} [options.enableUrl=true] - Show URL input button.
     * @param {boolean} [options.enableRemove=true] - Show remove button.
     * @param {Function} [options.onUploadComplete] - Callback(result) where result is file ID (single) or array of IDs (multi).
     * @param {Function} [options.onUploadError] - Callback(error).
     * @param {Function} [options.onFileSelect] - Callback(files) when files are selected (useful if autoUpload=false).
     * @param {Function} [options.onRemove] - Callback() when image is removed (single mode).
     * @param {Function} [options.onImageSelect] - Callback({url, id}) when an image is chosen.
     * @param {boolean} [options.enableCrop=false] - If true, opens a cropping modal for images.
     * @param {object} [options.cropOptions={}] - Cropper.js options.
     */
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) throw new Error('UploadWidget container not found');

        this.options = {
            mode: 'inline',
            selectMode: 'single',
            autoUpload: true,
            accept: 'image/*',
            defaultPreview: null,
            enableLibrary: true,
            inlineLibrary: false,
            exclude: [],
            enableUrl: true,
            enableRemove: true,
            showActions: true,
            showPreview: true,
            enableCrop: false,
            cropOptions: {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: false,
                center: false,
                highlight: false,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false,
            },
            ...options
        };

        this.files = [];
        this.isUploading = false;
        this.libraryModal = null;
        this.cropper = null;

        this.init();
    }

    init() {
        this.render();
        this.bindEvents();

        if (this.options.defaultPreview && this.options.selectMode === 'single') {
            this.setPreview(this.options.defaultPreview);
        }

        if (this.options.inlineLibrary) {
            this.renderInlineLibrary();
        }
    }

    render() {
        const noActionsClass = !this.options.showActions ? 'no-actions' : '';
        this.container.innerHTML = /*html*/`
            <div class="upload-widget ${this.options.mode}-mode ${noActionsClass}" id="upload-widget-${Date.now()}">
                ${this.options.showPreview ? `
                <div class="preview-container ${!this.options.defaultPreview ? 'hidden' : ''}">
                    ${this.options.selectMode === 'single'
                        ? `<div class="image-preview">
                                ${this.options.enableRemove ? `<button type="button" class="remove-icon-btn hidden" title="Remove">${CLOSE_SVG}</button>` : ''}
                        </div>`
                        : `<div class="file-list"></div>`
                    }
                </div>
                ` : ''}

                <div class="progress-container hidden">
                    <progress value="0" max="100"></progress>
                    <span class="progress-text">Uploading... 0%</span>
                </div>

                ${this.options.showActions ? `
                <div class="actions-row">
                    <label class="upload-btn-label small-btn">
                        ${UPLOAD_SVG} <span>${this.options.selectMode === 'single' ? 'Select File' : 'Select Files'}</span>
                        <input type="file" 
                            ${this.options.selectMode === 'multiple' ? 'multiple' : ''} 
                            accept="${this.options.accept}" 
                            class="upload-widget-input"
                            style="display:none;">
                    </label>
                    
                    ${this.options.enableLibrary && !this.options.inlineLibrary && this.options.selectMode === 'single' ? `
                        <button type="button" class="small-btn outline library-btn" title="Choose from Library">
                            ${IMAGE_SVG} Library
                        </button>
                    ` : ''}

                    ${this.options.enableUrl && this.options.selectMode === 'single' ? `
                        <button type="button" class="small-btn outline url-btn" title="Provide Image URL">
                            ${INFO_SVG} URL
                        </button>
                    ` : ''}
                </div>
                ` : `<input type="file" accept="${this.options.accept}" class="upload-widget-input" style="display:none;">`}

                <div class="url-input-container hidden">
                    <div class="glass-input-group">
                        <input type="text" placeholder="https://example.com/image.jpg" class="modern-input url-input-field">
                        <button type="button" class="small-btn apply-url-btn">Apply</button>
                    </div>
                </div>

                ${this.options.inlineLibrary ? `<div class="inline-library-container"></div>` : ''}
            </div>
        `;

        this.widgetEl = this.container.querySelector('.upload-widget');
        this.previewContainer = this.widgetEl.querySelector('.preview-container');
        this.previewEl = this.widgetEl.querySelector('.image-preview');
        this.fileListEl = this.widgetEl.querySelector('.file-list');
        this.progressContainer = this.widgetEl.querySelector('.progress-container');
        this.progressBar = this.widgetEl.querySelector('progress');
        this.progressText = this.widgetEl.querySelector('.progress-text');
        this.inputEl = this.widgetEl.querySelector('.upload-widget-input');
        this.actionsRowEl = this.widgetEl.querySelector('.actions-row');
        this.libraryBtn = this.widgetEl.querySelector('.library-btn');
        this.urlBtn = this.widgetEl.querySelector('.url-btn');
        this.removeBtn = this.widgetEl.querySelector('.remove-icon-btn');
        this.urlInputContainer = this.widgetEl.querySelector('.url-input-container');
        this.urlInputField = this.widgetEl.querySelector('.url-input-field');
        this.applyUrlBtn = this.widgetEl.querySelector('.apply-url-btn');

        if (this.options.defaultPreview && this.options.selectMode === 'single') {
            this.removeBtn?.classList.remove('hidden');
        }
    }

    renderInlineLibrary() {
        this.libContainer = this.widgetEl.querySelector('.inline-library-container');
        if (!this.libContainer) return;

        renderLibrary(this.libContainer, async (url, id) => {
            this.setPreview(url);

            if (this.options.onImageSelect) {
                await this.options.onImageSelect({ url, id });
            } else if (id && this.options.onUploadComplete) {
                await this.options.onUploadComplete(id);
            } else if (url && this.options.onUploadComplete) {
                await this.options.onUploadComplete(url);
            }
        }, { exclude: this.options.exclude });
    }

    bindEvents() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.widgetEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        this.widgetEl.addEventListener('dragenter', () => this.widgetEl.classList.add('drag-over'));
        this.widgetEl.addEventListener('dragover', () => this.widgetEl.classList.add('drag-over'));
        this.widgetEl.addEventListener('dragleave', () => this.widgetEl.classList.remove('drag-over'));
        this.widgetEl.addEventListener('drop', (e) => {
            this.widgetEl.classList.remove('drag-over');
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleFiles(files);
        });

        this.inputEl.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        if (this.libraryBtn) {
            this.libraryBtn.addEventListener('click', () => this.openLibraryModal());
        }

        if (this.urlBtn) {
            this.urlBtn.addEventListener('click', () => {
                this.urlInputContainer.classList.toggle('hidden');
                if (!this.urlInputContainer.classList.contains('hidden')) {
                    this.urlInputField.focus();
                }
            });
        }

        if (this.applyUrlBtn) {
            this.applyUrlBtn.addEventListener('click', async () => {
                const url = this.urlInputField.value.trim();
                if (url) {
                    this.setPreview(url);
                    if (this.options.onImageSelect) {
                        await this.options.onImageSelect({ url, id: null });
                    } else if (this.options.onUploadComplete) {
                        await this.options.onUploadComplete(url);
                    }
                    this.urlInputContainer.classList.add('hidden');
                }
            });
            this.urlInputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.applyUrlBtn.click();
            });
        }

        if (this.removeBtn) {
            this.removeBtn.addEventListener('click', () => this.handleRemove());
        }
    }

    setPreview(url) {
        if (this.options.showPreview && this.previewEl) {
            this.previewEl.style.backgroundImage = `url('${url}')`;
            this.previewContainer?.classList.remove('hidden');
            this.actionsRowEl?.classList.add('hidden');
            this.removeBtn?.classList.remove('hidden');
        }
    }

    async handleRemove() {
        if (this.options.onRemove) {
            const result = await this.options.onRemove();
            if (result === false) return;
        }
        this.reset();
    }

    openLibraryModal() {
        if (!this.libraryModal) {
            this.libraryModal = new Modal({
                id: 'upload-widget-library-modal',
                title: 'Choose Image',
                content: '',
                contentClasses: 'glass-panel'
            });
            document.body.insertAdjacentHTML('beforeend', this.libraryModal.getHTML());
            this.libraryModal.attachListeners();
        }

        this.modalContentArea = document.getElementById('upload-widget-library-modal-content');

        renderLibrary(this.modalContentArea, async (url, id) => {
            if (this.options.showPreview) this.setPreview(url);

            if (this.options.onImageSelect) {
                await this.options.onImageSelect({ url, id });
            } else if (id && this.options.onUploadComplete) {
                await this.options.onUploadComplete(id);
            } else if (url && this.options.onUploadComplete) {
                await this.options.onUploadComplete(url);
            }

            this.libraryModal.close();
        }, { exclude: this.options.exclude });

        this.libraryModal.show();
    }

    handleFiles(fileList) {
        if (this.isUploading) return;

        const newFiles = Array.from(fileList);
        if (newFiles.length === 0) return;

        if (this.options.selectMode === 'single') {
            const file = newFiles[0];
            if (this.options.enableCrop && file.type.startsWith('image/')) {
                this.openCropModal(file);
                return;
            }

            this.files = [file];
            if (this.files[0].type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (this.options.showPreview) this.setPreview(e.target.result);
                };
                reader.readAsDataURL(this.files[0]);
            }
        } else {
            this.files = [...this.files, ...newFiles];
            if (this.options.showPreview) this.updateFileList();
        }

        if (this.options.onFileSelect) {
            this.options.onFileSelect(this.files);
        }

        if (this.options.autoUpload) {
            this.uploadFiles();
        }
    }

    openCropModal(file) {
        if (typeof Cropper === 'undefined') {
            console.error('Cropper.js not loaded');
            this.files = [file];
            this.uploadFiles();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const modalId = 'crop-modal';
            const modalContent = `
                <div class="crop-container">
                    <img id="crop-image" src="${e.target.result}" style="max-width: 100%; display: block;">
                </div>
                <div class="crop-actions mt-4">
                    <button type="button" class="primary full-width" id="confirm-crop-btn">Crop & Upload</button>
                </div>
            `;

            const modal = new Modal({
                id: modalId,
                title: 'Crop Image',
                content: modalContent,
                contentClasses: 'glass-panel',
                onClose: () => {
                    if (this.cropper) {
                        this.cropper.destroy();
                        this.cropper = null;
                    }
                    const el = document.getElementById(modalId);
                    if (el) el.remove();
                }
            });

            document.body.insertAdjacentHTML('beforeend', modal.getHTML());
            modal.attachListeners();
            modal.show();

            const image = document.getElementById('crop-image');
            if (!image) {
                console.error('Crop image element not found');
                return;
            }

            this.cropper = new Cropper(image, this.options.cropOptions);

            document.getElementById('confirm-crop-btn').onclick = () => {
                if (!this.cropper) return;

                const canvas = this.cropper.getCroppedCanvas({
                    width: 512,
                    height: 512,
                });

                if (!canvas) {
                    console.error('Failed to get cropped canvas');
                    return;
                }

                canvas.toBlob((blob) => {
                    if (!blob) {
                        console.error('Failed to create blob from canvas');
                        return;
                    }
                    const croppedFile = new File([blob], file.name, { type: 'image/jpeg' });
                    this.files = [croppedFile];
                    
                    if (this.options.showPreview) this.setPreview(canvas.toDataURL('image/jpeg'));
                    
                    if (this.options.onFileSelect) {
                        this.options.onFileSelect(this.files);
                    }

                    if (this.options.autoUpload) {
                        this.uploadFiles();
                    }

                    modal.close();
                }, 'image/jpeg');
            };
        };
        reader.readAsDataURL(file);
    }

    updateFileList() {
        if (!this.fileListEl) return;
        this.previewContainer?.classList.remove('hidden');
        this.actionsRowEl?.classList.add('hidden');
        this.fileListEl.innerHTML = this.files.map((f, i) => `
            <div class="file-item">
                <span class="file-name" title="${f.name}">${f.name}</span>
                <span class="file-remove" data-index="${i}">${CLOSE_SVG}</span>
            </div>
        `).join('');

        this.fileListEl.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.files.splice(index, 1);
                this.updateFileList();
            });
        });
    }

    async uploadFiles(extraOptions = {}) {
        if (this.files.length === 0) return;
        this.isUploading = true;
        this.progressContainer.classList.remove('hidden');
        this.updateProgress(0);

        const uploadedIds = [];
        const uploadedUrls = [];

        try {
            for (const file of this.files) {
                const id = await uploadFile(file, {
                    ...extraOptions,
                    onProgress: (pct) => this.updateProgress(pct)
                });
                uploadedIds.push(id);
                uploadedUrls.push(`/api/files/${id}/download?view=true`);
            }

            this.updateProgress(100);
            this.progressText.textContent = 'Upload Complete!';
            setTimeout(() => this.progressContainer.classList.add('hidden'), 2000);

            if (this.libContainer) refreshLibrary(this.libContainer);
            if (this.modalContentArea) refreshLibrary(this.modalContentArea);

            if (this.options.onImageSelect && this.options.selectMode === 'single') {
                await this.options.onImageSelect({ url: uploadedUrls[0], id: uploadedIds[0] });
            } else if (this.options.onUploadComplete) {
                await this.options.onUploadComplete(this.options.selectMode === 'single' ? uploadedIds[0] : uploadedIds);
            }

            this.files = [];
            if (this.options.selectMode === 'multiple' && this.options.showPreview) this.updateFileList();

        } catch (error) {
            console.error(error);
            this.progressContainer.classList.add('hidden');
            if (this.options.onUploadError) {
                this.options.onUploadError(error);
            } else {
                notify('Upload Failed', error.message, 'error');
            }
        } finally {
            this.isUploading = false;
        }
    }

    updateProgress(percent) {
        if (this.progressBar) this.progressBar.value = percent;
        if (this.progressText) this.progressText.textContent = `Uploading... ${Math.round(percent)}%`;
    }

    reset() {
        this.files = [];
        this.inputEl.value = '';
        if (this.options.selectMode === 'single') {
            if (this.previewEl) this.previewEl.style.backgroundImage = '';
            this.previewContainer?.classList.add('hidden');
            this.removeBtn?.classList.add('hidden');
        } else {
            if (this.options.showPreview) this.updateFileList();
        }
        this.actionsRowEl?.classList.remove('hidden');
        this.progressContainer.classList.add('hidden');
        this.isUploading = false;
    }
}