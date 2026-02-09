import { createSignal, createResource, For, Show, onMount } from "solid-js";
import { uploadFile, apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { UPLOAD_SVG, CLOSE_SVG, IMAGE_SVG, INFO_SVG } from "@/utils/icons";
import Modal from "@/components/Modal";

interface UploadWidgetProps {
    selectMode?: 'single' | 'multiple';
    autoUpload?: boolean;
    accept?: string;
    defaultPreview?: string | null;
    enableLibrary?: boolean;
    enableUrl?: boolean;
    enableRemove?: boolean;
    onUploadComplete?: (result: number | number[] | string) => void;
    onImageSelect?: (data: { url: string; id: number | null }) => void;
    onRemove?: () => boolean | Promise<boolean>;
}

export default function UploadWidget(props: UploadWidgetProps) {
    const { notify } = useNotifications();
    const [files, setFiles] = createSignal<File[]>([]);
    const [previewUrl, setPreviewUrl] = createSignal<string | null>(props.defaultPreview || null);
    const [isUploading, setIsUploading] = createSignal(false);
    const [progress, setProgress] = createSignal(0);
    const [showLibrary, setShowLibrary] = createSignal(false);
    const [showUrlInput, setShowUrlInput] = createSignal(false);
    const [urlValue, setUrlValue] = createSignal('');

    const [libraryFiles] = createResource(showLibrary, async (open) => {
        if (!open) return [];
        const res = await apiRequest('GET', '/api/files?limit=200');
        return res.data.files || [];
    });

    const handleFiles = (fileList: FileList | null) => {
        if (!fileList || isUploading()) return;
        const newFiles = Array.from(fileList);
        
        if (props.selectMode === 'single') {
            const file = newFiles[0];
            setFiles([file]);
            const reader = new FileReader();
            reader.onload = (e) => setPreviewUrl(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setFiles([...files(), ...newFiles]);
        }

        if (props.autoUpload) {
            uploadAll();
        }
    };

    const uploadAll = async () => {
        if (files().length === 0) return;
        setIsUploading(true);
        setProgress(0);

        const uploadedIds: number[] = [];
        try {
            for (const file of files()) {
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
        setPreviewUrl(null);
    };

    const selectFromLibrary = (file: any) => {
        const url = `/api/files/${file.id}/download?view=true`;
        setPreviewUrl(url);
        props.onImageSelect?.({ url, id: file.id });
        setShowLibrary(false);
    };

    return (
        <div class="upload-widget">
            <Show when={previewUrl() && props.selectMode === 'single'}>
                <div class="image-preview upload-preview-image" style={{ "--preview-url": `url(${previewUrl()})` }}>
                    <Show when={props.enableRemove !== false}>
                        <button class="remove-icon-btn" onClick={handleRemove} innerHTML={CLOSE_SVG} />
                    </Show>
                </div>
            </Show>

            <Show when={props.selectMode === 'multiple' && files().length > 0}>
                <div class="file-list">
                    <For each={files()}>
                        {(f, i) => (
                            <div class="file-item">
                                <span>{f.name}</span>
                                <button onClick={() => setFiles(files().filter((_, idx) => idx !== i()))} innerHTML={CLOSE_SVG} />
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <Show when={isUploading()}>
                <div class="progress-container">
                    <progress value={progress()} max="100" />
                    <span>{Math.round(progress())}%</span>
                </div>
            </Show>

            <div class="actions-row">
                <label class="upload-btn-label small-btn">
                    <span innerHTML={UPLOAD_SVG} /> {props.selectMode === 'single' ? 'Select File' : 'Select Files'}
                    <input 
                        type="file" 
                        multiple={props.selectMode === 'multiple'} 
                        accept={props.accept || 'image/*'} 
                        onChange={e => handleFiles(e.currentTarget.files)} 
                        style="display:none" 
                    />
                </label>

                <Show when={props.enableLibrary && props.selectMode === 'single'}>
                    <button class="small-btn outline" onClick={() => setShowLibrary(true)}>
                        <span innerHTML={IMAGE_SVG} /> Library
                    </button>
                </Show>

                <Show when={props.enableUrl && props.selectMode === 'single'}>
                    <button class="small-btn outline" onClick={() => setShowUrlInput(!showUrlInput())}>
                        <span innerHTML={INFO_SVG} /> URL
                    </button>
                </Show>
            </div>

            <Show when={showUrlInput()}>
                <div class="url-input-container">
                    <input type="text" value={urlValue()} onInput={e => setUrlValue(e.currentTarget.value)} placeholder="https://..." />
                    <button onClick={() => { setPreviewUrl(urlValue()); props.onImageSelect?.({ url: urlValue(), id: null }); setShowUrlInput(false); }}>Apply</button>
                </div>
            </Show>

            <Modal isOpen={showLibrary()} onClose={() => setShowLibrary(false)} title="Choose from Library">
                <div class="library-grid">
                    <For each={libraryFiles()}>
                        {file => (
                            <div class="library-item" onClick={() => selectFromLibrary(file)}>
                                <img src={`/api/files/${file.id}/download?view=true`} />
                                <span>{file.title}</span>
                            </div>
                        )}
                    </For>
                </div>
            </Modal>
        </div>
    );
}
