import { createSignal, createResource, For, Show, createEffect } from "solid-js";
import { uploadFile, apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { UPLOAD_SVG, CLOSE_SVG, IMAGE_SVG, INFO_SVG, SEARCH_SVG, FILTER_LIST_SVG } from "@/utils/icons";
import Modal from "@/components/Modal";

interface UploadWidgetProps {
    selectMode?: 'single' | 'multiple';
    autoUpload?: boolean;
    accept?: string;
    value?: string | null;
    defaultPreview?: string | null;
    isDefault?: boolean;
    enableLibrary?: boolean;
    enableUrl?: boolean;
    enableRemove?: boolean;
    onUploadComplete?: (result: number | number[] | string) => void;
    onImageSelect?: (data: { url: string; id: number | null }) => void;
    onFileSelect?: (files: File[]) => void;
    onRemove?: () => boolean | Promise<boolean>;
}

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
    const [librarySearch, setLibrarySearch] = createSignal('');
    const [libraryCategory, setLibraryCategory] = createSignal('');

    const previewUrl = () => props.value || internalPreviewUrl() || props.defaultPreview;

    createEffect(() => {
        // Clear internal preview if props.value is set or if we are in default mode
        if (props.value || props.isDefault) {
            setInternalPreviewUrl(null);
        }
    });

    const [categories] = createResource(async () => {
        const res = await apiRequest('GET', '/api/file-categories');
        return res.data || [];
    });

    const [libraryFiles] = createResource(() => ({
        open: showLibrary(),
        search: librarySearch(),
        categoryId: libraryCategory()
    }), async (params) => {
        if (!params.open) return [];
        const query = new URLSearchParams({
            limit: '50',
            search: params.search,
            categoryId: params.categoryId,
            includeUsed: 'true'
        });
        const res = await apiRequest('GET', `/api/files?${query.toString()}`);
        return res.data?.files || [];
    });

    const handleFiles = (fileList: FileList | null) => {
        if (!fileList || isUploading()) return;
        const newFiles = Array.from(fileList);

        if (props.selectMode === 'single') {
            const file = newFiles[0];
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
        setInternalPreviewUrl(null);
    };

    const selectFromLibrary = (file: any) => {
        const url = `/api/files/${file.id}/download?view=true`;
        setInternalPreviewUrl(url);
        props.onImageSelect?.({ url, id: file.id });
        setShowLibrary(false);
    };

    const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const onDragLeave = () => {
        setIsDragOver(false);
    };

    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer?.files) {
            handleFiles(e.dataTransfer.files);
        }
    };

    return (
        <div
            class="upload-widget"
            classList={{ 'drag-over': isDragOver() }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <Show when={previewUrl() && props.selectMode === 'single'}>
                <div
                    class="image-preview"
                    classList={{ 'default-image-mode': props.isDefault }}
                    style={{ "background-image": `url(${previewUrl()})` }}
                >
                    <Show when={props.enableRemove !== false && !props.isDefault}>
                        <button class="remove-icon-btn" onClick={handleRemove} innerHTML={CLOSE_SVG} title="Remove Image" />
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
                    <span>Uploading... {Math.round(progress())}%</span>
                </div>
            </Show>

            <div class="actions-row">
                <label class="upload-btn-label">
                    <span innerHTML={UPLOAD_SVG} />
                    <span>{props.selectMode === 'single' ? 'Select File' : 'Select Files'}</span>
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
                <div class="library-modal-content">
                    <div class="library-controls">
                        <div class="glass-input-group liquid-container search-box">
                            <span class="icon" innerHTML={SEARCH_SVG} />
                            <input
                                type="text"
                                placeholder="Search images..."
                                value={librarySearch()}
                                onInput={e => setLibrarySearch(e.currentTarget.value)}
                            />
                        </div>
                        <div class="glass-input-group liquid-container category-filter">
                            <span class="icon" innerHTML={FILTER_LIST_SVG} />
                            <select value={libraryCategory()} onChange={e => setLibraryCategory(e.currentTarget.value)}>
                                <option value="">All Categories</option>
                                <For each={categories()}>
                                    {cat => <option value={cat.id}>{cat.name}</option>}
                                </For>
                            </select>
                        </div>
                    </div>

                    <div class="library-grid">
                        <Show when={libraryFiles.loading}>
                            <div class="loading-cell text-centre" style="grid-column: 1/-1; padding: 3rem;">Loading Library...</div>
                        </Show>
                        <Show when={!libraryFiles.loading && libraryFiles()?.length === 0}>
                            <div class="empty-cell text-centre" style="grid-column: 1/-1; padding: 3rem;">No images found.</div>
                        </Show>
                        <For each={libraryFiles()}>
                            {file => (
                                <div class="library-item" onClick={() => selectFromLibrary(file)}>
                                    <div class="lib-img-wrapper">
                                        <img src={`/api/files/${file.id}/download?view=true`} />
                                    </div>
                                    <span>{file.title}</span>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
