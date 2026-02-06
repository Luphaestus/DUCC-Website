import { createSignal, createResource, onMount, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { CLOUD_DOWNLOAD_SVG, SEARCH_SVG, UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG } from '@/utils/icons';
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import { useNavigate } from "@solidjs/router";
import LiquidContainer from "@/components/LiquidContainer";

interface FileCategory {
    id: string;
    name: string;
}

interface FileEntry {
    id: string;
    filename: string;
    title: string;
    category_name: string;
    author: string;
    date: string;
    size: number;
}

export default function FilesPage() {
    const navigate = useNavigate();
    const [search, setSearch] = createSignal("");
    const [categoryId, setCategoryId] = createSignal("");
    const [page, setPage] = createSignal(1);
    const [sort, setSort] = createSignal("date");
    const [order, setOrder] = createSignal("desc");
    const [canManage, setCanManage] = createSignal(false);
    const [categories, setCategories] = createSignal<FileCategory[]>([]);
    const [oldFilesData, setOldFilesData] = createSignal<any>(null);

    const [filesData] = createResource(() => ({ 
        page: page(), 
        search: search(), 
        categoryId: categoryId(),
        sort: sort(),
        order: order()
    }), async (params, { value }) => {
        if (value && params.search === (filesData() as any)?.search && params.categoryId === (filesData() as any)?.categoryId) {
            setOldFilesData(value);
        } else {
            setOldFilesData(null);
        }
        const query = new URLSearchParams({
            page: String(params.page),
            limit: '15',
            search: params.search,
            sort: params.sort,
            order: params.order,
            categoryId: params.categoryId
        });
        const res = await apiRequest('GET', `/api/files?${query.toString()}`);
        return { ...res.data, search: params.search, categoryId: params.categoryId } as { files: FileEntry[]; totalPages: number, search: string, categoryId: string };
    });

    onMount(async () => {
        try {
            const userData = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({}));
            const perms = userData.permissions || [];
            setCanManage(perms.includes('file.write') || perms.includes('file.edit') || false);
            
            const catsRes = await apiRequest('GET', '/api/file-categories');
            setCategories(catsRes.data || []);
        } catch (e) {}
    });

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const toggleSort = (field: string) => {
        if (sort() === field) {
            setOrder(order() === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(field);
            setOrder('asc');
        }
    };

    const FileTable = (props: { data: any }) => (
        <table class="files-table">
            <thead>
                <tr>
                    <For each={[
                        { key: 'title', label: 'Title', sort: 'title' },
                        { key: 'author', label: 'Author', sort: 'author' },
                        { key: 'date', label: 'Date', sort: 'date' },
                        { key: 'size', label: 'Size', sort: 'size' }
                    ]}>
                        {(c) => (
                            <th class="sortable" onClick={() => toggleSort(c.sort)}>
                                {c.label} 
                                <span innerHTML={sort() === c.sort ? (order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG) : UNFOLD_MORE_SVG} />
                            </th>
                        )}
                    </For>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <Show when={props.data && props.data.files.length === 0}>
                    <tr><td colspan="5" class="text-centre">No files found.</td></tr>
                </Show>
                <For each={props.data?.files}>
                    {(file) => {
                        const ext = file.filename.split('.').pop()?.toLowerCase() || '';
                        const viewable = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'txt', 'mp4', 'webm', 'mp3'].includes(ext);
                        return (
                            <tr>
                                <td data-label="Title">
                                    <div class="file-title">
                                        <strong>{file.title}</strong>
                                        <span class="file-category">{file.category_name || 'Uncategorised'}</span>
                                    </div>
                                </td>
                                <td data-label="Author">{file.author}</td>
                                <td data-label="Date">
                                    <span class="full-date">{new Date(file.date).toLocaleDateString('en-GB')}</span>
                                </td>
                                <td data-label="Size">{formatSize(file.size)}</td>
                                <td data-label="Action">
                                    <a href={`/api/files/${file.id}/download${viewable ? '?view=true' : ''}`} class="download-btn" title={viewable ? 'View' : 'Download'} target={viewable ? '_blank' : undefined}>
                                        <span innerHTML={CLOUD_DOWNLOAD_SVG} />
                                    </a>
                                </td>
                            </tr>
                        );
                    }}
                </For>
            </tbody>
        </table>
    );

    return (
        <div id="files-view" class="view small-container">
            <div class="files-header">
                <div class="files-title-row">
                    <h1>Files</h1>
                </div>
                <div class="files-controls">
                    <Show when={canManage()}>
                        <button class="secondary" onClick={() => navigate('/admin/files')}>Manage Files</button>
                    </Show>
                    <div class="search-box">
                        <span class="icon" innerHTML={SEARCH_SVG} />
                        <input 
                            type="text" 
                            placeholder="Search title, content or filename:" 
                            value={search()}
                            onInput={(e) => {
                                setSearch(e.currentTarget.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <select value={categoryId()} onChange={(e) => {
                        setCategoryId(e.currentTarget.value);
                        setPage(1);
                    }}>
                        <option value="">All Categories</option>
                        <For each={categories()}>
                            {(c) => <option value={c.id}>{c.name}</option>}
                        </For>
                    </select>
                </div>
            </div>

            <LiquidContainer class="files-table-wrapper" padding="0">
                <Show when={filesData.loading && !filesData() && !oldFilesData()}>
                    <p class="text-centre">Loading...</p>
                </Show>

                <PaginationSlider 
                    currentPage={page()} 
                    oldContent={<FileTable data={oldFilesData()} />}
                >
                    <FileTable data={filesData()} />
                </PaginationSlider>
            </LiquidContainer>

            <Pagination 
                currentPage={page()} 
                totalPages={filesData()?.totalPages || 0} 
                onPageChange={setPage} 
            />
        </div>
    );
}
