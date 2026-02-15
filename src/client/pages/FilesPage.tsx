import { createSignal, createResource, onMount, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { FaCloudArrowDown, FaMagnifyingGlass, FaFilter, FaArrowUp, FaArrowDown, FaArrowsUpDown } from 'solid-icons/fa';
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import { useNavigate, useSearchParams } from "@solidjs/router";

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

interface FilesPageData {
    files: FileEntry[];
    totalPages: number;
    search: string;
    categoryId: string;
}

export default function FilesPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const getParam = (key: string) => {
        const val = searchParams[key];
        return Array.isArray(val) ? val[0] : val;
    };

    const search = () => getParam('search') || "";
    const categoryId = () => getParam('categoryId') || "";
    const page = () => parseInt(getParam('page') || "1");
    const sort = () => getParam('sort') || "date";
    const order = () => (getParam('order') as any) || "desc";

    const [canManage, setCanManage] = createSignal(false);
    const [categories, setCategories] = createSignal<FileCategory[]>([]);
    const [oldFilesData, setOldFilesData] = createSignal<any>(null);

    const [filesData] = createResource<FilesPageData, any>(() => ({
        page: page(),
        search: search(),
        categoryId: categoryId(),
        sort: sort(),
        order: order()
    }), async (params, { value }) => {
        if (value && params.search === (filesData as any).latest?.search && params.categoryId === (filesData as any).latest?.categoryId) {
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
        const res = await apiRequest('GET', `/api/files?${query.toString()}`, true);
        return { ...res.data, search: params.search, categoryId: params.categoryId } as { files: FileEntry[]; totalPages: number, search: string, categoryId: string };
    });

    onMount(async () => {
        try {
            const userData = await apiRequest('GET', '/api/user/elements/permissions', null, true).catch(() => ({}));
            const perms = userData.permissions || [];
            setCanManage(perms.includes('file.write') || perms.includes('file.edit') || false);

            const catsRes = await apiRequest('GET', '/api/file-categories', null, true);
            setCategories(catsRes.data || []);
        } catch (e) { }
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
            setSearchParams({ order: order() === 'asc' ? 'desc' : 'asc', page: 1 });
        } else {
            setSearchParams({ sort: field, order: 'asc', page: 1 });
        }
    };

    const FileTable = (props: { data: any }) => (
        <table class="files-table">
            <thead>
                <tr>
                    <th data-label="Title" class="sortable" onClick={() => toggleSort('title')}>
                        Title <Show when={sort() === 'title'} fallback={<FaArrowsUpDown />}><Show when={order() === 'asc'} fallback={<FaArrowDown />}><FaArrowUp /></Show></Show>
                    </th>
                    <th data-label="Author" class="sortable" onClick={() => toggleSort('author')}>
                        Author <Show when={sort() === 'author'} fallback={<FaArrowsUpDown />}><Show when={order() === 'asc'} fallback={<FaArrowDown />}><FaArrowUp /></Show></Show>
                    </th>
                    <th data-label="Date" class="sortable" onClick={() => toggleSort('date')}>
                        Date <Show when={sort() === 'date'} fallback={<FaArrowsUpDown />}><Show when={order() === 'asc'} fallback={<FaArrowDown />}><FaArrowUp /></Show></Show>
                    </th>
                    <th data-label="Size" class="sortable" onClick={() => toggleSort('size')}>
                        Size <Show when={sort() === 'size'} fallback={<FaArrowsUpDown />}><Show when={order() === 'asc'} fallback={<FaArrowDown />}><FaArrowUp /></Show></Show>
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
                                        <FaCloudArrowDown />
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
                        <FaMagnifyingGlass />
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
                        <FaFilter />
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
