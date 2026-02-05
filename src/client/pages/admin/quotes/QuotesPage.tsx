import { createSignal, createResource, Show, For } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import { 
    SEARCH_SVG, DELETE_SVG, CHECK_SVG, CLOSE_SVG,
    UNFOLD_MORE_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG 
} from '@/utils/icons';

interface Quote {
    id: number;
    text: string;
    quoted_user: { first_name: string; last_name: string };
    submitted_by: { first_name: string; last_name: string } | null;
    visibility: 'public' | 'hidden' | 'pending';
    created_at: string;
}

export default function QuotesPage() {
    const { notify } = useNotifications();
    const [page, setPage] = createSignal(1);
    const [search, setSearch] = createSignal('');
    const [sort, setSort] = createSignal('created_at');
    const [order, setOrder] = createSignal('desc');
    const [oldData, setOldData] = createSignal<any>(null);

    const [data, { refetch }] = createResource(
        () => ({ page: page(), search: search(), sort: sort(), order: order() }),
        async (params, { value }) => {
            if (value) {
                setOldData(value);
            } else {
                setOldData(null);
            }

            const query = new URLSearchParams({
                page: String(params.page),
                limit: '15',
                search: params.search,
                sort: params.sort,
                order: params.order
            });
            const res = await apiRequest('GET', `/api/admin/quotes?${query.toString()}`);
            return { quotes: res.data.quotes as Quote[], totalPages: res.data.totalPages || 1 };
        }
    );

    const handleSort = (key: string) => {
        if (sort() === key) {
            setOrder(o => o === 'asc' ? 'desc' : 'asc');
        } else {
            setSort(key);
            setOrder('asc');
        }
    };

    const handleAction = async (id: number, action: 'release' | 'hide' | 'delete') => {
        try {
            if (action === 'delete') {
                if (!confirm('Are you sure you want to delete this quote?')) return;
                await apiRequest('DELETE', `/api/admin/quotes/${id}`);
                notify('Success', 'Quote deleted.', 'success');
            } else {
                const newVisibility = action === 'release' ? 'public' : 'hidden';
                await apiRequest('POST', `/api/admin/quotes/${id}/visibility`, { visibility: newVisibility });
                notify('Success', `Quote marked as ${newVisibility}.`, 'success');
            }
            refetch();
        } catch (err: any) {
            notify('Error', err.message || 'Action failed.', 'error');
        }
    };

    const QuoteTable = (props: { data: any }) => (
        <table class="glass-table quotes-table">
            <thead>
                <tr>
                    <th class="sortable" onClick={() => handleSort('text')}>
                        Quote <Show when={sort() === 'text'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('quoted_user')}>
                        Person <Show when={sort() === 'quoted_user'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th>Submitter</th>
                    <th class="sortable" onClick={() => handleSort('visibility')}>
                        Status <Show when={sort() === 'visibility'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="text-right">Actions</th>
                </tr>
            </thead>
            <tbody>
                <Show when={props.data && props.data.quotes.length === 0}>
                    <tr><td colspan="5" class="empty-cell">No quotes found.</td></tr>
                </Show>
                <For each={props.data?.quotes}>
                    {(quote) => (
                        <tr class="quote-row">
                            <td data-label="Quote" class="primary-text quote-text-cell">"{quote.text}"</td>
                            <td data-label="Person">{quote.quoted_user.first_name} {quote.quoted_user.last_name}</td>
                            <td data-label="Submitter">{quote.submitted_by ? `${quote.submitted_by.first_name} ${quote.submitted_by.last_name}` : 'Unknown'}</td>
                            <td data-label="Status">
                                <span class={`status-badge status-${quote.visibility}`}>{quote.visibility}</span>
                            </td>
                            <td data-label="Actions" class="text-right action-cell">
                                <div class="button-group">
                                    <Show when={quote.visibility !== 'public'}>
                                        <button class="button success icon-only mini-btn" onClick={() => handleAction(quote.id, 'release')} title="Release" innerHTML={CHECK_SVG} />
                                    </Show>
                                    <Show when={quote.visibility !== 'hidden'}>
                                        <button class="button warning icon-only mini-btn" onClick={() => handleAction(quote.id, 'hide')} title="Hide" innerHTML={CLOSE_SVG} />
                                    </Show>
                                    <button class="button danger icon-only mini-btn" onClick={() => handleAction(quote.id, 'delete')} title="Delete" innerHTML={DELETE_SVG} />
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
                    <div class="search-bar">
                        <input 
                            type="text" 
                            placeholder="Search quotes..." 
                            value={search()} 
                            onInput={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                        />
                        <button class="search-icon-btn" innerHTML={SEARCH_SVG} />
                    </div>
                </div>
            </div>

            <div class="glass-table-container">
                <div class="table-responsive">
                    <Show when={data.loading && !data() && !oldData()}>
                        <div class="loading-cell text-centre" style="padding: 2rem;">Loading...</div>
                    </Show>
                    <PaginationSlider 
                        currentPage={page()} 
                        oldContent={<QuoteTable data={oldData()} />}
                    >
                        <QuoteTable data={data()} />
                    </PaginationSlider>
                </div>
            </div>

            <Show when={data()?.totalPages}>
                <Pagination 
                    currentPage={page()} 
                    totalPages={data()!.totalPages} 
                    onPageChange={setPage} 
                />
            </Show>
        </div>
    );
}
