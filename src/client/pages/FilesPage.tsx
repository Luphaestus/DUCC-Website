import { createSignal, createResource, onMount, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { FaSolidCloudArrowDown, FaSolidMagnifyingGlass, FaSolidFilter, FaSolidArrowUp, FaSolidArrowDown, FaSolidArrowsUpDown } from 'solid-icons/fa';
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import { useNavigate, useSearchParams } from "@solidjs/router";

interface FileCategory {
    id: string;
    name: string;
}

interface FileData {
    id: number;
    title: string;
    author: string;
    date: string;
    filename: string;
    category_name: string;
    size: number;
}

interface FilesResponse {
    files: FileData[];
    total: number;
    totalPages: number;
}

export default function FilesPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const page = () => parseInt(searchParams.page || '1');
    const search = () => searchParams.search || '';
    const categoryId = () => searchParams.categoryId || '';
    const sort = () => searchParams.sort || 'date';
    const order = () => searchParams.order || 'desc';

    const [canManage, setCanManage] = createSignal(false);
    const [oldFilesData, setOldFilesData] = createSignal<FilesResponse | null>(null);

    const [filesData] = createResource(
        () => ({ page: page(), search: search(), categoryId: categoryId(), sort: sort(), order: order() }),
        async (params, { value }) => {
            if (value) setOldFilesData(value as FilesResponse);
            const query = new URLSearchParams({
                page: params.page.toString(),
                search: params.search,
                categoryId: params.categoryId,
                sort: params.sort,
                order: params.order,
                limit: '15'
            }).toString();
            
            const res = await apiRequest('GET', `/api/files?${query}`);
            return res as FilesResponse;
        }
    );

    const [categories] = createResource<FileCategory[]>(async () => {
        const res = await apiRequest('GET', '/api/files/categories');
        return res as FileCategory[];
    });

    onMount(async () => {
        try {
            const userRes = await apiRequest('GET', '/api/user/elements/permissions', null, true);
            setCanManage(userRes.permissions?.includes('files.manage') || false);
        } catch (e) { }
    });

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const toggleSort = (newSort: string) => {
        const newOrder = (sort() === newSort && order() === 'asc') ? 'desc' : 'asc';
        setSearchParams({ sort: newSort, order: newOrder, page: 1 });
    };

    const FileTable = (props: { data: FilesResponse | null }) => (
        <table class="files-table">
            <thead>
                <tr>
                    <th data-label="Title" class="sortable" onClick={() => toggleSort('title')}>
                        Title <Show when={sort() === 'title'} fallback={<FaSolidArrowsUpDown />}><Show when={order() === 'asc'} fallback={<FaSolidArrowDown />}><FaSolidArrowUp /></Show></Show>
                    </th>
                    <th data-label="Author" class="sortable" onClick={() => toggleSort('author')}>
                        Author <Show when={sort() === 'author'} fallback={<FaSolidArrowsUpDown />}><Show when={order() === 'asc'} fallback={<FaSolidArrowDown />}><FaSolidArrowUp /></Show></Show>
                    </th>
                    <th data-label="Date" class="sortable" onClick={() => toggleSort('date')}>
                        Date <Show when={sort() === 'date'} fallback={<FaSolidArrowsUpDown />}><Show when={order() === 'asc'} fallback={<FaSolidArrowDown />}><FaSolidArrowUp /></Show></Show>
                    </th>
                    <th data-label="Size" class="sortable" onClick={() => toggleSort('size')}>
                        Size <Show when={sort() === 'size'} fallback={<FaSolidArrowsUpDown />}><Show when={order() === 'asc'} fallback={<FaSolidArrowDown />}><FaSolidArrowUp /></Show></Show>
                    </th>
                    <th data-label="Action">Action</th>
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
                            <tr><td data-label="Title">
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
                                        <FaSolidCloudArrowDown />
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
                    <div class="search-box liquid-container">
                        <FaSolidMagnifyingGlass />
                        <input
                            type="text"
                            placeholder="Search title, content or filename:"
                            value={search()}
                            onInput={(e) => {
                                setSearchParams({ search: e.currentTarget.value, page: 1 });
                            }}
                        />
                    </div>
                    <div class="glass-input-group liquid-container" style="width: auto; min-width: 200px;">
                        <FaSolidFilter />
                        <select value={categoryId()} onChange={(e) => {
                            setSearchParams({ categoryId: e.currentTarget.value, page: 1 });
                        }}>
                            <option value="">All Categories</option>
                            <For each={categories()}>
                                {(c) => <option value={c.id}>{c.name}</option>}
                            </For>
                        </select>
                    </div>
                </div>
            </div>

            <div class="liquid-container files-table-wrapper">
                <PaginationSlider
                    currentPage={page()}
                    oldContent={<FileTable data={oldFilesData()} />}
                >
                    <FileTable data={filesData()} />
                </PaginationSlider>
            </div>

            <Pagination
                currentPage={page()}
                totalPages={filesData()?.totalPages || 0}
                onPageChange={(p) => setSearchParams({ page: p })}
            />
        </div>
    );
}
