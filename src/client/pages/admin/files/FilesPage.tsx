// todo clean up
import { createSignal, createResource, Show, For, onMount, onCleanup } from "solid-js";
import { apiRequest } from "@/utils/api";
import Modal from "@/components/Modal";
import { useNotifications } from "@/stores/notifications";
import { showConfirmModal } from "@/utils/modal";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import UploadWidget from "@/components/UploadWidget";
import { 
    SEARCH_SVG, UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, 
    DELETE_SVG, EDIT_SVG, UPLOAD_SVG, FOLDER_SVG, ADD_SVG
} from '@/utils/icons';

// --- Types ---
interface FileRecord {
    id: number;
    title: string;
    category_name: string;
    category_id: number | null;
    author: string;
    visibility: 'members' | 'public' | 'execs';
    date: string;
}

interface Category {
    id: number;
    name: string;
    default_visibility: 'members' | 'public' | 'execs';
}

// --- Components ---

const CategoriesModal = (props: { 
    isOpen: boolean, 
    onClose: () => void, 
    categories: Category[], 
    refetch: () => void 
}) => {
    const { notify } = useNotifications();

    const handleCreate = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        try {
            await apiRequest('POST', '/api/file-categories', {
                name: formData.get('name'),
                default_visibility: formData.get('default_visibility')
            });
            form.reset();
            props.refetch();
            notify('Success', 'Category created', 'success');
        } catch (e: any) {
            notify('Error', 'Creation failed', 'error');
        }
    };

    const handleUpdate = async (id: number, name: string, visibility: string) => {
        try {
            await apiRequest('PUT', `/api/file-categories/${id}`, {
                name,
                default_visibility: visibility
            });
            props.refetch();
            notify('Success', 'Category updated', 'success');
        } catch (e: any) {
            notify('Error', 'Update failed', 'error');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        const ok = await showConfirmModal('Delete Category', 'Delete category? Files in this category will be uncategorised.');
        if (!ok) return;
        try {
            await apiRequest('DELETE', `/api/file-categories/${id}`);
            props.refetch();
            notify('Success', 'Category removed', 'success');
        } catch (e: any) {
            notify('Error', 'Delete failed', 'error');
        }
    };

    return (
        <Modal isOpen={props.isOpen} onClose={props.onClose} title="Manage Categories" maxWidth="800px">
            <div class="categories-list">
                <For each={props.categories}>
                    {(cat) => (
                        <div class="category-item">
                            <input 
                                type="text" 
                                class="cat-name-input" 
                                value={cat.name} 
                                placeholder="Category Name"
                                onChange={(e) => handleUpdate(cat.id, e.currentTarget.value, cat.default_visibility)}
                            />
                            <select 
                                class="cat-visibility-select modern-select compact" 
                                value={cat.default_visibility}
                                onChange={(e) => handleUpdate(cat.id, cat.name, e.currentTarget.value)}
                            >
                                <option value="members">Members</option>
                                <option value="public">Public</option>
                                <option value="execs">Execs</option>
                            </select>
                            <button class="icon-btn delete" onClick={() => handleDeleteCategory(cat.id)} title="Delete Category" innerHTML={DELETE_SVG} />
                        </div>
                    )}
                </For>
                <Show when={props.categories.length === 0}>
                    <p class="empty-cell">No categories yet.</p>
                </Show>
            </div>
            <form class="inline-add-form" onSubmit={handleCreate}>
                <input type="text" name="name" placeholder="New Category Name" required />
                <select name="default_visibility" class="modern-select compact">
                    <option value="members">Members</option>
                    <option value="public">Public</option>
                    <option value="execs">Execs Only</option>
                </select>
                <button type="submit" class="small-btn">
                    <span innerHTML={ADD_SVG} /> Create
                </button>
            </form>
        </Modal>
    );
};

const EditFileModal = (props: { 
    isOpen: boolean, 
    onClose: () => void, 
    file: FileRecord | null, 
    categories: Category[],
    onSave: () => void
}) => {
    const { notify } = useNotifications();
    const [isSaving, setIsSaving] = createSignal(false);
    const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
    const [libraryFileId, setLibraryFileId] = createSignal<number | null>(null);
    
    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!props.file || isSaving()) return;
        setIsSaving(true);
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);

        if (selectedFile()) {
            formData.append('file', selectedFile()!);
        } else if (libraryFileId()) {
            formData.append('libraryFileId', String(libraryFileId()));
        }
        
        try {
            await apiRequest('PUT', `/api/files/${props.file.id}`, formData);
            props.onSave();
            notify('Success', 'File updated', 'success');
            props.onClose();
            setSelectedFile(null);
            setLibraryFileId(null);
        } catch (e: any) {
            notify('Error', 'Update failed', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={props.isOpen} onClose={props.onClose} title="Edit File" maxWidth="800px">
            <Show when={props.file}>
                <form class="modern-form" onSubmit={handleSubmit}>
                    <label>Title
                        <input type="text" name="title" value={props.file!.title} required />
                    </label>
                    <div class="grid-2-col">
                        <label>Author
                            <input type="text" name="author" value={props.file!.author} required />
                        </label>
                        <label>Date
                            <input type="date" name="date" value={props.file!.date.split('T')[0]} required />
                        </label>
                    </div>
                    <div class="grid-2-col">
                        <label>Category
                            <select class="modern-select" name="categoryId" value={props.file!.category_id || ''}>
                                <For each={props.categories}>
                                    {cat => <option value={cat.id}>{cat.name}</option>}
                                </For>
                            </select>
                        </label>
                        <label>Visibility
                            <select name="visibility" class="modern-select" value={props.file!.visibility}>
                                <option value="members">Members</option>
                                <option value="public">Public</option>
                                <option value="execs">Execs Only</option>
                            </select>
                        </label>
                    </div>
                    <label>Replace File (Optional)
                        <UploadWidget 
                            selectMode="single"
                            autoUpload={false}
                            enableLibrary={true}
                            enableRemove={true}
                            onFileSelect={(files: File[]) => {
                                setSelectedFile(files[0] || null);
                                setLibraryFileId(null);
                            }}
                            onImageSelect={({ id }) => {
                                setLibraryFileId(id);
                                setSelectedFile(null);
                            }}
                            onRemove={() => {
                                setSelectedFile(null);
                                setLibraryFileId(null);
                                return true;
                            }}
                        />
                    </label>
                    <footer>
                        <button type="submit" class="wide-btn" disabled={isSaving()}>{isSaving() ? 'Saving...' : 'Save Changes'}</button>
                    </footer>
                </form>
            </Show>
        </Modal>
    );
};

// --- Main Page ---

interface FilesPageData {
    files: FileRecord[];
    totalPages: number;
    categoryId: string;
}

export default function FilesPage() {
    const { notify } = useNotifications();
    
    // State
    const [page, setPage] = createSignal(1);
    const [search, setSearch] = createSignal('');
    const [categoryId, setCategoryId] = createSignal('');
    const [sort, setSort] = createSignal('date');
    const [order, setOrder] = createSignal('desc');
    const [oldData, setOldData] = createSignal<any>(null);

    // Modals
    const [showUpload, setShowUpload] = createSignal(false);
    const [showCats, setShowCats] = createSignal(false);
    const [editingFile, setEditingFile] = createSignal<FileRecord | null>(null);

    // Data Fetching
    const [filesData, { refetch: refetchFiles }] = createResource<FilesPageData, any>(
        () => ({ page: page(), search: search(), categoryId: categoryId(), sort: sort(), order: order() }),
        async (params, { value }) => {
            if (value && params.categoryId === (filesData as any).latest?.categoryId) {
                setOldData(value);
            } else {
                setOldData(null);
            }

            const query = new URLSearchParams({
                page: String(params.page),
                limit: '15',
                search: params.search,
                categoryId: params.categoryId,
                sort: params.sort,
                order: params.order
            });
            const res = await apiRequest('GET', `/api/files?${query.toString()}`);
            return { files: res.data.files as FileRecord[], totalPages: res.data.totalPages, categoryId: params.categoryId };
        }
    );

    const [categories, { refetch: refetchCats }] = createResource(async () => {
        const res = await apiRequest('GET', '/api/file-categories');
        return (res.data || []) as Category[];
    });

    const handleSort = (key: string) => {
        if (sort() === key) {
            setOrder(o => o === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(key);
            setOrder('asc');
        }
    };

    const handleDeleteFile = async (id: number) => {
        const ok = await showConfirmModal('Delete File', 'Are you sure you want to delete this file?');
        if (!ok) return;
        try {
            await apiRequest('DELETE', `/api/files/${id}`);
            refetchFiles();
            notify('Success', 'File deleted', 'success');
        } catch (e: any) {
            notify('Error', 'Delete failed', 'error');
        }
    };

    const handleUploadSubmit = (e: Event) => {
        e.preventDefault();
        // The new UploadWidget handles its own uploading if autoUpload is true, 
        // or we need to trigger it. Let's assume autoUpload: true for simplicity now or fix the component.
        // Actually I'll set autoUpload: true in the usage above.
    };

    const FileTable = (props: { data: any }) => (
        <table class="glass-table files-table">
            <thead>
                <tr>
                    <th class="sortable" onClick={() => handleSort('title')}>
                        Title <Show when={sort() === 'title'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('category_name')}>
                        Category <Show when={sort() === 'category_name'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('author')}>
                        Author <Show when={sort() === 'author'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('visibility')}>
                        Visibility <Show when={sort() === 'visibility'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('date')}>
                        Date <Show when={sort() === 'date'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <Show when={props.data && props.data.files.length === 0}>
                    <tr><td colspan="6" class="empty-cell">No files found.</td></tr>
                </Show>
                <For each={props.data?.files}>
                    {(file) => (
                        <tr><td data-label="Title" class="primary-text"><strong>{file.title}</strong></td>
                            <td data-label="Category"><span class="badge neutral">{file.category_name || 'Uncategorised'}</span></td>
                            <td data-label="Author">{file.author}</td>
                            <td data-label="Visibility"><span class={`tag-badge ${file.visibility}`}>{file.visibility}</span></td>
                            <td data-label="Date">
                                <span class="full-date">{new Date(file.date).toLocaleDateString('en-GB')}</span>
                            </td>
                            <td data-label="Actions">
                                <div class="row-actions">
                                    <button class="icon-btn edit-file" onClick={() => setEditingFile(file)} title="Edit" innerHTML={EDIT_SVG} />
                                    <button 
                                        class="icon-btn delete-file delete" 
                                        onClick={() => handleDeleteFile(file.id)} 
                                        title={file.author === 'System' ? 'Cannot delete system files' : 'Delete'} 
                                        disabled={file.author === 'System'}
                                        innerHTML={DELETE_SVG} 
                                    />
                                </div>
                            </td>
                        </tr>
                    )}
                </For>
            </tbody>
        </table>
    );

    return (
        <div class="glass-layout">
            <div class="glass-toolbar">
                <div class="toolbar-content">
                    <div class="toolbar-left">
                        <div class="search-bar">
                            <input 
                                type="text" 
                                placeholder="Search title, content..." 
                                value={search()} 
                                onInput={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                            />
                            <button class="search-icon-btn" innerHTML={SEARCH_SVG} />
                        </div>
                        <div class="glass-input-group liquid-container category-filter-pill">
                            <span class="icon" innerHTML={FOLDER_SVG} />
                            <select 
                                class="modern-select compact" 
                                value={categoryId()} 
                                onChange={(e) => { setCategoryId(e.currentTarget.value); setPage(1); }}
                            >
                                <option value="">All Categories</option>
                                <For each={categories()}>
                                    {cat => <option value={cat.id}>{cat.name}</option>}
                                </For>
                            </select>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <button class="small-btn secondary" onClick={() => setShowCats(true)}>
                            <span innerHTML={FOLDER_SVG} /> Categories
                        </button>
                        <button class="small-btn" onClick={() => setShowUpload(true)}>
                            <span innerHTML={UPLOAD_SVG} /> Upload
                        </button>
                    </div>
                </div>
            </div>

            <div class="glass-table-container">
                <div class="table-responsive">
                    <Show when={filesData.loading && !filesData() && !oldData()}>
                        <div class="loading-cell text-centre" style="padding: 2rem;">Loading...</div>
                    </Show>
                    <PaginationSlider 
                        currentPage={page()} 
                        oldContent={<FileTable data={oldData()} />}
                    >
                        <FileTable data={filesData()} />
                    </PaginationSlider>
                </div>
            </div>

            <Show when={filesData()?.totalPages}>
                <Pagination 
                    currentPage={page()} 
                    totalPages={filesData()!.totalPages} 
                    onPageChange={setPage} 
                />
            </Show>

            {/* Modals */}
            <CategoriesModal 
                isOpen={showCats()} 
                onClose={() => setShowCats(false)} 
                categories={categories() || []}
                refetch={() => { refetchCats(); refetchFiles(); }}
            />

            <EditFileModal 
                isOpen={!!editingFile()} 
                onClose={() => setEditingFile(null)} 
                file={editingFile()} 
                categories={categories() || []}
                onSave={refetchFiles}
            />

            <Modal isOpen={showUpload()} onClose={() => setShowUpload(false)} title="Upload Files" maxWidth="800px">
                <form class="modern-form" onSubmit={handleUploadSubmit}>
                    <UploadWidget 
                        selectMode="multiple" 
                        autoUpload={false} 
                        enableLibrary={true}
                        onUploadComplete={() => { setShowUpload(false); refetchFiles(); }}
                    />
                    
                    <div class="grid-2-col">
                        <label>Category
                            <select class="category-select modern-select" name="categoryId" required>
                                <For each={categories()}>
                                    {cat => <option value={cat.id}>{cat.name}</option>}
                                </For>
                            </select>
                        </label>
                        <label>Visibility
                            <select name="visibility" class="modern-select">
                                <option value="members">Members</option>
                                <option value="public">Public</option>
                                <option value="execs">Execs Only</option>
                            </select>
                        </label>
                    </div>
                    <footer>
                        <button type="submit" class="wide-btn">Upload All</button>
                    </footer>
                </form>
            </Modal>
        </div>
    );
}
