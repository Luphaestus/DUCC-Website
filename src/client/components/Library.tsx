import { createSignal, createResource, For, Show } from "solid-js";
import { apiRequest } from "@/utils/api";
import { FaSolidSearch, FaSolidFilter } from "solid-icons/fa";

interface LibraryProps {
    onSelect: (data: { url: string; id: number }) => void;
    exclude?: string[];
}

export default function Library(props: LibraryProps) {
    const [search, setSearch] = createSignal('');
    const [category, setCategory] = createSignal('');

    const [categories] = createResource(async () => {
        const res = await apiRequest('GET', '/api/file-categories');
        return res.data || [];
    });

    const [files] = createResource(() => ({
        search: search(),
        categoryId: category()
    }), async (params) => {
        const query = new URLSearchParams({
            limit: '50',
            search: params.search,
            categoryId: params.categoryId,
            includeUsed: 'true'
        });
        const res = await apiRequest('GET', `/api/files?${query.toString()}`);
        let list = res.data?.files || [];
        
        if (props.exclude) {
            list = list.filter((f: any) => !props.exclude?.includes(f.id.toString()));
        }
        
        return list;
    });

    const handleSelect = (file: any) => {
        props.onSelect({
            url: `/api/files/${file.id}/download?view=true`,
            id: file.id
        });
    };

    return (
        <div class="library-container">
            <div class="library-controls" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
                <div class="glass-input-group liquid-container search-box" style="flex: 1;">
                    <span class="icon" style="padding: 0 0.75rem;"><FaSolidSearch /></span>
                    <input
                        type="text"
                        placeholder="Search images..."
                        value={search()}
                        onInput={e => setSearch(e.currentTarget.value)}
                        style="margin-bottom: 0;"
                    />
                </div>
                <div class="glass-input-group liquid-container category-filter" style="width: 250px;">
                    <span class="icon" style="padding: 0 0.75rem;"><FaSolidFilter /></span>
                    <select 
                        value={category()} 
                        onChange={e => setCategory(e.currentTarget.value)}
                        style="margin-bottom: 0;"
                    >
                        <option value="">All Categories</option>
                        <For each={categories()}>
                            {cat => <option value={cat.id}>{cat.name}</option>}
                        </For>
                    </select>
                </div>
            </div>

            <div class="library-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; max-height: 500px; overflow-y: auto; padding: 0.5rem;">
                <Show when={files.loading}>
                    <div class="loading-cell text-centre" style="grid-column: 1/-1; padding: 3rem;">Loading Library...</div>
                </Show>
                <Show when={!files.loading && files()?.length === 0}>
                    <div class="empty-cell text-centre" style="grid-column: 1/-1; padding: 3rem;">No images found.</div>
                </Show>
                <For each={files()}>
                    {file => (
                        <div class="library-item clickable" onClick={() => handleSelect(file)} style="cursor: pointer; transition: transform 0.2s;">
                            <div class="lib-img-wrapper" style="aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: rgba(0,0,0,0.1); border: 1px solid rgba(var(--pico-color-rgb), 0.1);">
                                <img src={`/api/files/${file.id}/download?view=true`} style="width: 100%; height: 100%; object-fit: cover;" />
                            </div>
                            <span style="display: block; font-size: 0.8rem; margin-top: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.8;">{file.title}</span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}
