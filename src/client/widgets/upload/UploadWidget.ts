/**
 * UploadWidget.js
 * 
 * Reusable component for file uploads with inline/modal modes and single/multi-selection.
 */

import { uploadFile } from '@/utils/api';
import { renderLibrary, refreshLibrary } from './Library.js';
import { UPLOAD_SVG, CLOSE_SVG, IMAGE_SVG, INFO_SVG } from '@/utils/icons';
import { Modal } from '@/widgets/Modal';
import { notify } from '@/components/notification';

declare const Cropper: any;

interface UploadWidgetOptions {
    mode?: 'inline' | 'modal' | 'hidden';
    selectMode?: 'single' | 'multiple';
    autoUpload?: boolean;
    accept?: string;
    defaultPreview?: string | null;
    enableLibrary?: boolean;
    inlineLibrary?: boolean;
    exclude?: string[];
    enableUrl?: boolean;
    enableRemove?: boolean;
    showActions?: boolean;
    showPreview?: boolean;
    enableCrop?: boolean;
    cropOptions?: any;
    onUploadComplete?: (result: number | number[] | string) => void | Promise<void>;
    onUploadError?: (error: any) => void;
    onFileSelect?: (files: File[]) => void;
    onRemove?: () => boolean | Promise<boolean>;
    onImageSelect?: (data: { url: string; id: number | null }) => void | Promise<void>;
}

export class UploadWidget {
    container: HTMLElement;
    options: UploadWidgetOptions;
    files: File[];
    isUploading: boolean;
    libraryModal: Modal | null;
    cropper: any | null;
    widgetEl!: HTMLElement;
    previewContainer!: HTMLElement | null;
    previewEl!: HTMLElement | null;
    fileListEl!: HTMLElement | null;
    progressContainer!: HTMLElement;
    progressBar!: HTMLProgressElement | null;
    progressText!: HTMLElement | null;
    inputEl!: HTMLInputElement;
    actionsRowEl!: HTMLElement | null;
    libraryBtn!: HTMLElement | null;
    urlBtn!: HTMLElement | null;
    removeBtn!: HTMLElement | null;
    urlInputContainer!: HTMLElement;
    urlInputField!: HTMLInputElement;
    applyUrlBtn!: HTMLElement | null;
    libContainer!: HTMLElement | null;
    modalContentArea!: HTMLElement | null;

    constructor(container: HTMLElement | string, options: UploadWidgetOptions = {}) {
        const el = typeof container === 'string' ? document.getElementById(container) : container;
        if (!el) throw new Error('UploadWidget container not found');
        this.container = el;

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
                    <label class="upload-btn-label">
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
                    <div class="url-input-group">
                        <input type="text" placeholder="https://example.com/image.jpg" class="url-input-field">
                        <button type="button" class="small-btn apply-url-btn">Apply</button>
                    </div>
                </div>

                ${this.options.inlineLibrary ? `<div class="inline-library-container"></div>` : ''}
            </div>
        `;

        this.widgetEl = this.container.querySelector('.upload-widget') as HTMLElement;
        this.previewContainer = this.widgetEl.querySelector('.preview-container');
        this.previewEl = this.widgetEl.querySelector('.image-preview');
        this.fileListEl = this.widgetEl.querySelector('.file-list');
        this.progressContainer = this.widgetEl.querySelector('.progress-container') as HTMLElement;
        this.progressBar = this.widgetEl.querySelector('progress');
        this.progressText = this.widgetEl.querySelector('.progress-text');
        this.inputEl = this.widgetEl.querySelector('.upload-widget-input') as HTMLInputElement;
        this.actionsRowEl = this.widgetEl.querySelector('.actions-row');
        this.libraryBtn = this.widgetEl.querySelector('.library-btn');
        this.urlBtn = this.widgetEl.querySelector('.url-btn');
        this.removeBtn = this.widgetEl.querySelector('.remove-icon-btn');
        this.urlInputContainer = this.widgetEl.querySelector('.url-input-container') as HTMLElement;
        this.urlInputField = this.widgetEl.querySelector('.url-input-field') as HTMLInputElement;
        this.applyUrlBtn = this.widgetEl.querySelector('.apply-url-btn');

        if (this.options.defaultPreview && this.options.selectMode === 'single') {
            this.removeBtn?.classList.remove('hidden');
        }
    }

    renderInlineLibrary() {
        this.libContainer = this.widgetEl.querySelector('.inline-library-container');
        if (!this.libContainer) return;

        renderLibrary(this.libContainer, async (url: string, id: number | null) => {
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
            const files = dt ? dt.files : null;
            if (files) this.handleFiles(files);
        });

        this.inputEl.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files) this.handleFiles(target.files);
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
                if (e.key === 'Enter') this.applyUrlBtn!.click();
            });
        }

        if (this.removeBtn) {
            this.removeBtn.addEventListener('click', () => this.handleRemove());
        }
    }

    setPreview(url: string) {
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

        if (this.modalContentArea) {
            renderLibrary(this.modalContentArea, async (url: string, id: number | null) => {
                if (this.options.showPreview) this.setPreview(url);

                if (this.options.onImageSelect) {
                    await this.options.onImageSelect({ url, id });
                } else if (id && this.options.onUploadComplete) {
                    await this.options.onUploadComplete(id);
                } else if (url && this.options.onUploadComplete) {
                    await this.options.onUploadComplete(url);
                }

                this.libraryModal!.close();
            }, { exclude: this.options.exclude });
        }

        this.libraryModal.show();
    }

    handleFiles(fileList: FileList) {
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
                    if (this.options.showPreview && e.target) this.setPreview(e.target.result as string);
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

    openCropModal(file: File) {
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
                    <img id="crop-image" src="${e.target?.result}" style="max-width: 100%; display: block;">
                </div>
                <div class="crop-actions">
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

            const confirmBtn = document.getElementById('confirm-crop-btn');
            if (confirmBtn) {
                confirmBtn.onclick = () => {
                    if (!this.cropper) return;

                    const canvas = this.cropper.getCroppedCanvas({
                        width: 512,
                        height: 512,
                    });

                    if (!canvas) {
                        console.error('Failed to get cropped canvas');
                        return;
                    }

                    canvas.toBlob((blob: Blob | null) => {
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
            }
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
                const target = e.currentTarget as HTMLElement;
                const index = parseInt(target.dataset.index!);
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

        const uploadedIds: number[] = [];
        const uploadedUrls: string[] = [];

        try {
            for (const file of this.files) {
                const id = await uploadFile(file, {
                    ...extraOptions,
                    onProgress: (pct) => this.updateProgress(pct)
                });
                if (id !== null) {
                    uploadedIds.push(id);
                    uploadedUrls.push(`/api/files/${id}/download?view=true`);
                }
            }

            this.updateProgress(100);
            if (this.progressText) this.progressText.textContent = 'Upload Complete!';
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

        } catch (error: any) {
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

    async manualUpload(extraOptions = {}) {
        return this.uploadFiles(extraOptions);
    }

    updateProgress(percent: number) {
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