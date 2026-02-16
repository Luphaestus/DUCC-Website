import { createSignal, Show, For, createEffect } from "solid-js";
import { uploadFile, apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { ImUpload2, ImImage } from 'solid-icons/im'
import { FaSolidClose, FaSolidInfo, FaSolidCrop } from "solid-icons/fa";
import Modal from "@/components/Modal";
import Library from "./Library";

interface UploadWidgetProps {
    mode?: 'inline' | 'modal' | 'hidden';
    selectMode?: 'single' | 'multiple';
    autoUpload?: boolean;
    accept?: string;
    value?: string | null;
    defaultPreview?: string | null;
    isDefault?: boolean;
    enableLibrary?: boolean;
    enableUrl?: boolean;
    enableRemove?: boolean;
    enableCrop?: boolean;
    cropOptions?: any;
    ref?: (el: { click: () => void }) => void;
    onUploadComplete?: (result: number | number[] | string) => void;
    onImageSelect?: (data: { url: string; id: number | null }) => void;
    onFileSelect?: (files: File[]) => void;
    onRemove?: () => boolean | Promise<boolean>;
}

declare const Cropper: any;

export default function UploadWidget(props: UploadWidgetProps) {
    const { notify } = useNotifications();
    const [files, setFiles] = createSignal<File[]>([]);
    const [internalPreviewUrl, setInternalPreviewUrl] = createSignal<string | null>(null);
    const [isUploading, setIsUploading] = createSignal(false);
    const [isDragOver, setIsDragOver] = createSignal(false);
    const [progress, setProgress] = createSignal(0);
    const [showLibrary, setShowLibrary] = createSignal(false);
    const [showUrlInput, setShowUrlInput] = createSignal(false);
    const [urlValue, setUrlValue] = createSignal('');
    
    // Crop state
    const [showCrop, setShowCrop] = createSignal(false);
    const [cropImageSrc, setCropImageSrc] = createSignal<string | null>(null);
    const [currentFile, setCurrentFile] = createSignal<File | null>(null);
    let cropperInstance: any = null;
    let cropImgRef: HTMLImageElement | undefined;

    let fileInputRef: HTMLInputElement | undefined;

    if (props.ref) {
        props.ref({
            click: () => fileInputRef?.click()
        });
    }

    const previewUrl = () => props.value || internalPreviewUrl() || props.defaultPreview;

    createEffect(() => {
        if (props.value || props.isDefault) {
            setInternalPreviewUrl(null);
        }
    });

    const handleFiles = (fileList: FileList | null) => {
        if (!fileList || isUploading()) return;
        const newFiles = Array.from(fileList);

        if (props.selectMode === 'single') {
            const file = newFiles[0];
            
            if (props.enableCrop && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    setCropImageSrc(e.target?.result as string);
                    setCurrentFile(file);
                    setShowCrop(true);
                };
                reader.readAsDataURL(file);
                return;
            }

            setFiles([file]);
            const reader = new FileReader();
            reader.onload = (e) => setInternalPreviewUrl(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setFiles([...files(), ...newFiles]);
        }

        if (props.onFileSelect) {
            props.onFileSelect(files());
        }

        if (props.autoUpload) {
            uploadAll();
        }
    };

    const uploadAll = async (targetFiles?: File[]) => {
        const filesToUpload = targetFiles || files();
        if (filesToUpload.length === 0) return;
        
        setIsUploading(true);
        setProgress(0);

        const uploadedIds: number[] = [];
        try {
            for (const file of filesToUpload) {
                const id = await uploadFile(file, {
                    onProgress: (pct) => setProgress(pct)
                });
                if (id) uploadedIds.push(id);
            }
            const result = props.selectMode === 'single' ? uploadedIds[0] : uploadedIds;
            props.onUploadComplete?.(result);

            if (props.selectMode === 'single' && uploadedIds.length > 0) {
                const id = uploadedIds[0];
                const url = `/api/files/${id}/download?view=true`;
                props.onImageSelect?.({ url, id });
            }

            setFiles([]);
            notify('Success', 'Upload complete', 'success');
        } catch (e: any) {
            notify('Error', e.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = async () => {
        if (props.onRemove) {
            const ok = await props.onRemove();
            if (!ok) return;
        }
        setFiles([]);
        setInternalPreviewUrl(null);
    };

    const onLibrarySelect = (data: { url: string; id: number }) => {
        setInternalPreviewUrl(data.url);
        props.onImageSelect?.({ url: data.url, id: data.id });
        setShowLibrary(false);
    };

    const handleCropConfirm = () => {
        if (!cropperInstance) return;

        const canvas = cropperInstance.getCroppedCanvas({
            width: 512,
            height: 512,
        });

        if (!canvas) return;

        canvas.toBlob((blob: Blob | null) => {
            if (!blob || !currentFile()) return;
            const file = new File([blob], currentFile()!.name, { type: 'image/jpeg' });
            
            setInternalPreviewUrl(canvas.toDataURL('image/jpeg'));
            setFiles([file]);
            
            if (props.onFileSelect) props.onFileSelect([file]);
            if (props.autoUpload) uploadAll([file]);
            
            setShowCrop(false);
        }, 'image/jpeg');
    };

    createEffect(() => {
        if (showCrop() && cropImgRef && typeof Cropper !== 'undefined') {
            cropperInstance = new Cropper(cropImgRef, {
                aspectRatio: 1,
                viewMode: 1,
                ...props.cropOptions
            });
        } else if (!showCrop() && cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
    });

    return (
        <Show when={props.mode !== 'hidden'} fallback={
            <input
                type="file"
                ref={fileInputRef}
                multiple={props.selectMode === 'multiple'}
                accept={props.accept || 'image/*'}
                onChange={e => handleFiles(e.currentTarget.files)}
                style="display:none"
            />
        }>
            <div
                class="upload-widget"
                classList={{ 'drag-over': isDragOver() }}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files); }}
            >
                <Show when={previewUrl() && props.selectMode === 'single'}>
                    <div
                        class="image-preview"
                        classList={{ 'default-image-mode': props.isDefault }}
                        style={{ "background-image": `url(${previewUrl()})` }}
                    >
                        <Show when={props.enableRemove !== false && !props.isDefault}>
                            <button class="remove-icon-btn" onClick={handleRemove} title="Remove Image"><FaSolidClose /></button>
                        </Show>
                    </div>
                </Show>

                <Show when={props.selectMode === 'multiple' && files().length > 0}>
                    <div class="file-list">
                        <For each={files()}>
                            {(f, i) => (
                                <div class="file-item">
                                    <span>{f.name}</span>
                                    <button onClick={() => setFiles(files().filter((_, idx) => idx !== i()))}><FaSolidClose /></button>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>

                <Show when={isUploading()}>
                    <div class="progress-container">
                        <progress value={progress()} max="100" />
                        <span>Uploading... {Math.round(progress())}%</span>
                    </div>
                </Show>

                <div class="actions-row">
                    <label class="upload-btn-label">
                        <ImUpload2 />
                        <span>{props.selectMode === 'single' ? 'Select File' : 'Select Files'}</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple={props.selectMode === 'multiple'}
                            accept={props.accept || 'image/*'}
                            onChange={e => handleFiles(e.currentTarget.files)}
                            style="display:none"
                        />
                    </label>

                    <Show when={props.enableLibrary && props.selectMode === 'single'}>
                        <button class="small-btn outline" onClick={() => setShowLibrary(true)}>
                            <ImImage /> Library
                        </button>
                    </Show>

                    <Show when={props.enableUrl && props.selectMode === 'single'}>
                        <button class="small-btn outline" onClick={() => setShowUrlInput(!showUrlInput())}>
                            <FaSolidInfo /> URL
                        </button>
                    </Show>
                </div>

                <Show when={showUrlInput()}>
                    <div class="url-input-container">
                        <div class="url-input-group">
                            <input
                                type="text"
                                value={urlValue()}
                                onInput={e => setUrlValue(e.currentTarget.value)}
                                placeholder="https://..."
                                autofocus
                            />
                            <button class="small-btn" onClick={() => { setInternalPreviewUrl(urlValue()); props.onImageSelect?.({ url: urlValue(), id: null }); setShowUrlInput(false); }}>Apply</button>
                        </div>
                    </div>
                </Show>

                <Modal isOpen={showLibrary()} onClose={() => setShowLibrary(false)} title="Choose from Library" maxWidth="900px">
                    <Library onSelect={onLibrarySelect} />
                </Modal>

                <Modal isOpen={showCrop()} onClose={() => setShowCrop(false)} title="Crop Image">
                    <div class="crop-container" style="max-height: 70vh; overflow: hidden;">
                        <img ref={cropImgRef} src={cropImageSrc() || ''} style="max-width: 100%; display: block;" />
                    </div>
                    <div class="modal-actions" style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 1rem;">
                        <button class="secondary" onClick={() => setShowCrop(false)}>Cancel</button>
                        <button class="primary" onClick={handleCropConfirm}><FaSolidCrop /> Crop & Upload</button>
                    </div>
                </Modal>
            </div>
        </Show>
    );
}
