import { createSignal, createResource, Show, For, onMount, onCleanup } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import UploadWidget from "@/components/UploadWidget";
import { 
    SEARCH_SVG, UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, 
    DELETE_SVG, EDIT_SVG, UPLOAD_SVG, FOLDER_SVG 
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

    const handleDelete = async (id: number) => {
        if (!confirm('Delete category? Files in this category will be uncategorised.')) return;
        try {
            await apiRequest('DELETE', `/api/file-categories/${id}`);
            props.refetch();
            notify('Success', 'Category removed', 'success');
        } catch (e: any) {
            notify('Error', 'Delete failed', 'error');
        }
    };

    return (
        <Modal isOpen={props.isOpen} onClose={props.onClose} title="Manage Categories">
            <div class="categories-list">
                <For each={props.categories}>
                    {(cat) => (
                        <div class="category-item">
                            <input 
                                type="text" 
                                class="cat-name-input compact-input" 
                                value={cat.name} 
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
                            <button class="icon-btn delete" onClick={() => handleDelete(cat.id)} title="Delete" innerHTML={DELETE_SVG} />
                        </div>
                    )}
                </For>
            </div>
            <form class="inline-add-form" onSubmit={handleCreate}>
                <input type="text" name="name" placeholder="New Category Name" required class="flex-grow" />
                <select name="default_visibility" class="modern-select compact">
                    <option value="members">Members</option>
                    <option value="public">Public</option>
                    <option value="execs">Execs</option>
                </select>
                <button type="submit" class="icon-btn" innerHTML={UPLOAD_SVG} />
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
    
    // We can use a ref or derived state. Since modal mounts/unmounts or stays open, 
    // it's better to key it or use effects.
    
    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!props.file) return;
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        
        try {
            await apiRequest('PUT', `/api/files/${props.file.id}`, {
                title: formData.get('title'),
                author: formData.get('author'),
                date: formData.get('date'),
                categoryId: formData.get('categoryId'),
                visibility: formData.get('visibility')
            });
            props.onSave();
            notify('Success', 'File updated', 'success');
            props.onClose();
        } catch (e: any) {
            notify('Error', 'Update failed', 'error');
        }
    };

    return (
        <Modal isOpen={props.isOpen} onClose={props.onClose} title="Edit File">
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
                    <footer>
                        <button type="submit" class="wide-btn">Save Changes</button>
                    </footer>
                </form>
            </Show>
        </Modal>
    );
};

// --- Main Page ---

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
    const [filesData, { refetch: refetchFiles }] = createResource(
        () => ({ page: page(), search: search(), categoryId: categoryId(), sort: sort(), order: order() }),
        async (params, { value }) => {
            if (value && params.categoryId === (filesData() as any)?.categoryId) {
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

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this file?')) return;
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
                        <tr>
                            <td data-label="Title" class="primary-text"><strong>{file.title}</strong></td>
                            <td data-label="Category"><span class="badge neutral">{file.category_name || 'Uncategorised'}</span></td>
                            <td data-label="Author">{file.author}</td>
                            <td data-label="Visibility"><span class={`tag-badge ${file.visibility}`}>{file.visibility}</span></td>
                            <td data-label="Date">
                                <span class="full-date">{new Date(file.date).toLocaleDateString('en-GB')}</span>
                            </td>
                            <td data-label="Actions">
                                <div class="row-actions">
                                    <button class="icon-btn edit-file" onClick={() => setEditingFile(file)} title="Edit" innerHTML={EDIT_SVG} />
                                    <button class="icon-btn delete-file delete" onClick={() => handleDelete(file.id)} title="Delete" innerHTML={DELETE_SVG} />
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
                    </div>
                    <div class="toolbar-right">
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
                        <button class="small-btn outline secondary" onClick={() => setShowCats(true)}>
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

            <Modal isOpen={showUpload()} onClose={() => setShowUpload(false)} title="Upload Files">
                <form class="modern-form" onSubmit={handleUploadSubmit}>
                    <UploadWidget 
                        selectMode="multiple" 
                        autoUpload={false} 
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
