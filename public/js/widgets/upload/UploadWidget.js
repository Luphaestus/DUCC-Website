//todo refine

/**
 * UploadWidget.js
 * 
 * Reusable component for file uploads with inline/modal modes and single/multi-selection.
 */

import { uploadFile } from '/js/utils/api.js';
import { renderLibrary } from './Library.js';
import { UPLOAD_SVG, CLOSE_SVG, IMAGE_SVG } from '/images/icons/outline/icons.js';
import { Modal } from '/js/widgets/Modal.js';

export class UploadWidget {
    /**
     * @param {HTMLElement|string} container - The DOM element or ID to render into.
     * @param {object} options
     * @param {string} [options.mode='inline'] - 'inline' (compact) or 'modal' (large area).
     * @param {string} [options.selectMode='single'] - 'single' or 'multiple'.
     * @param {boolean} [options.autoUpload=true] - If true, uploads immediately upon selection.
     * @param {string} [options.accept='image/*'] - File accept attribute.
     * @param {string} [options.defaultPreview=null] - URL for initial preview (single mode only).
     * @param {boolean} [options.enableLibrary=true] - Show library button.
     * @param {Function} [options.onUploadComplete] - Callback(result) where result is file ID (single) or array of IDs (multi).
     * @param {Function} [options.onUploadError] - Callback(error).
     * @param {Function} [options.onFileSelect] - Callback(files) when files are selected (useful if autoUpload=false).
     * @param {Function} [options.onRemove] - Callback() when image is removed (single mode).
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
            ...options
        };

        this.files = [];
        this.isUploading = false;
        this.libraryModal = null;

        this.init();
    }

    init() {
        this.render();
        this.bindEvents();

        if (this.options.defaultPreview && this.options.selectMode === 'single') {
            this.setPreview(this.options.defaultPreview);
        }
    }

    render() {
        this.container.innerHTML = /*html*/`
            <div class="upload-widget ${this.options.mode}-mode" id="upload-widget-${Date.now()}">
                <div class="preview-container ${!this.options.defaultPreview ? 'hidden' : ''}">
                    ${this.options.selectMode === 'single'
                ? `<div class="image-preview"></div>`
                : `<div class="file-list"></div>`
            }
                </div>

                <div class="progress-container hidden">
                    <progress value="0" max="100"></progress>
                    <span class="progress-text">Uploading... 0%</span>
                </div>

                <div class="actions-row">
                    <label class="upload-btn-label">
                        ${UPLOAD_SVG} <span>${this.options.selectMode === 'single' ? 'Select File' : 'Select Files'}</span>
                        <input type="file" 
                            ${this.options.selectMode === 'multiple' ? 'multiple' : ''} 
                            accept="${this.options.accept}" 
                            style="display:none;">
                    </label>
                    
                    ${this.options.enableLibrary && this.options.selectMode === 'single' ? `
                        <button type="button" class="small-btn outline library-btn" title="Choose from Library">
                            ${IMAGE_SVG} Library
                        </button>
                    ` : ''}

                    ${this.options.selectMode === 'single' ? `
                         <button type="button" class="small-btn delete outline remove-btn hidden" title="Remove">
                            ${CLOSE_SVG} Remove
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        this.widgetEl = this.container.querySelector('.upload-widget');
        this.previewContainer = this.widgetEl.querySelector('.preview-container');
        this.previewEl = this.widgetEl.querySelector('.image-preview');
        this.fileListEl = this.widgetEl.querySelector('.file-list');
        this.progressContainer = this.widgetEl.querySelector('.progress-container');
        this.progressBar = this.widgetEl.querySelector('progress');
        this.progressText = this.widgetEl.querySelector('.progress-text');
        this.inputEl = this.widgetEl.querySelector('input[type="file"]');
        this.libraryBtn = this.widgetEl.querySelector('.library-btn');
        this.removeBtn = this.widgetEl.querySelector('.remove-btn');

        if (this.options.defaultPreview && this.options.selectMode === 'single') {
            this.removeBtn?.classList.remove('hidden');
        }
    }

    bindEvents() {
        // Drag and Drop
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

        // Input Change
        this.inputEl.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Library Button
        if (this.libraryBtn) {
            this.libraryBtn.addEventListener('click', () => this.openLibraryModal());
        }

        // Remove Button
        if (this.removeBtn) {
            this.removeBtn.addEventListener('click', () => this.handleRemove());
        }
    }

    setPreview(url) {
        if (this.previewEl) {
            this.previewEl.style.backgroundImage = `url('${url}')`;
            this.previewContainer.classList.remove('hidden');
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

        // The content area ID is autogenerated by Modal as {id}-content
        const contentArea = document.getElementById('upload-widget-library-modal-content');

        renderLibrary(contentArea, (url, id) => {
            this.setPreview(url);

            if (this.options.onImageSelect) {
                this.options.onImageSelect({ url, id });
            } else if (id && this.options.onUploadComplete) {
                this.options.onUploadComplete(id);
            } else if (url && this.options.onUploadComplete) {
                this.options.onUploadComplete(url);
            }

            this.libraryModal.close();
        });

        this.libraryModal.show();
    }

    handleFiles(fileList) {
        if (this.isUploading) return;

        const newFiles = Array.from(fileList);
        if (newFiles.length === 0) return;

        if (this.options.selectMode === 'single') {
            this.files = [newFiles[0]];
            if (this.files[0].type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => this.setPreview(e.target.result);
                reader.readAsDataURL(this.files[0]);
            }
        } else {
            this.files = [...this.files, ...newFiles];
            this.updateFileList();
        }

        if (this.options.onFileSelect) {
            this.options.onFileSelect(this.files);
        }

        if (this.options.autoUpload) {
            this.uploadFiles();
        }
    }

    updateFileList() {
        if (!this.fileListEl) return;
        this.previewContainer.classList.remove('hidden');
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
            if (this.options.selectMode === 'multiple') {
                for (const file of this.files) {
                    const id = await uploadFile(file, {
                        ...extraOptions,
                        onProgress: (pct) => this.updateProgress(pct)
                    });
                    uploadedIds.push(id);
                    uploadedUrls.push(`/api/files/${id}/download?view=true`);
                }
            } else {
                for (const file of this.files) {
                    const id = await uploadFile(file, {
                        ...extraOptions,
                        onProgress: (pct) => this.updateProgress(pct)
                    });
                    uploadedIds.push(id);
                    uploadedUrls.push(`/api/files/${id}/download?view=true`);
                }
            }

            this.updateProgress(100);
            this.progressText.textContent = 'Upload Complete!';
            setTimeout(() => this.progressContainer.classList.add('hidden'), 2000);

            // Trigger callbacks
            if (this.options.onImageSelect && this.options.selectMode === 'single') {
                this.options.onImageSelect({ url: uploadedUrls[0], id: uploadedIds[0] });
            } else if (this.options.onUploadComplete) {
                this.options.onUploadComplete(this.options.selectMode === 'single' ? uploadedIds[0] : uploadedIds);
            }

            this.files = [];
            if (this.options.selectMode === 'multiple') this.updateFileList();

        } catch (error) {
            console.error(error);
            this.progressContainer.classList.add('hidden');
            if (this.options.onUploadError) {
                this.options.onUploadError(error);
            } else {
                alert('Upload Failed: ' + error.message);
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
            this.previewEl.style.backgroundImage = '';
            this.previewContainer.classList.add('hidden');
            this.removeBtn?.classList.add('hidden');
        } else {
            this.updateFileList();
        }
        this.progressContainer.classList.add('hidden');
        this.isUploading = false;
    }
}