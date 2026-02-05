import { createSignal, createResource, onMount, For, Show, createMemo, batch } from "solid-js";
import { apiRequest } from "@/utils/api";
import { useNotifications } from "@/stores/notifications";
import { ADD_SVG, SEARCH_SVG } from '@/utils/icons';
import Avatar from "@/components/Avatar";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import { useNavigate } from "@solidjs/router";

interface QuoteUser {
    id: number;
    first_name: string;
    last_name: string;
}

interface Quote {
    id: number;
    text: string;
    quoted_user: QuoteUser;
    submitted_by?: QuoteUser;
}

export default function QuotesPage() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const [search, setSearch] = createSignal("");
    const [page, setPage] = createSignal(1);
    const [canManage, setCanManage] = createSignal(false);
    const [users, setUsers] = createSignal<QuoteUser[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = createSignal(false);
    const [oldQuotesData, setOldQuotesData] = createSignal<any>(null);

    const [quotesData, { refetch }] = createResource(
        () => ({ page: page(), search: search() }), 
        async ({ page, search }, { value }) => {
            if (value && search === (quotesData() as any)?.search) {
                setOldQuotesData(value);
            } else {
                setOldQuotesData(null);
            }
            const query = new URLSearchParams({ page: String(page), limit: '12', search });
            const response = await apiRequest('GET', `/api/quotes?${query.toString()}`);
            return { ...response.data, search } as { quotes: Quote[]; totalPages: number, search: string };
        }
    );

    onMount(async () => {
        try {
            const userData = await apiRequest('GET', '/api/user/elements/permissions').catch(() => ({}));
            setCanManage(userData.permissions?.includes('quote.manage') || false);

            const usersRes = await apiRequest('GET', '/api/quotes/users');
            setUsers(usersRes || []);
        } catch (e) { }
    });

    const handleCreateQuote = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const text = formData.get('text') as string;
        const quotedUserId = formData.get('quotedUserId') as string;

        try {
            await apiRequest('POST', '/api/quotes', { text, quotedUserId });
            notify('Success', 'Quote submitted for moderation.', 'success');
            setIsCreateModalOpen(false);
            refetch();
        } catch (err: any) {
            notify('Error', err.message || 'Failed to submit quote.', 'error');
        }
    };

    const QuoteGrid = (props: { data: any }) => (
        <div class="quotes-grid">
            <For each={props.data?.quotes}>
                {(quote) => (
                    <div class="quote-card">
                        <div class="quote-card-header">
                            <Avatar user={quote.quoted_user} classes="mini" />
                            <p class="quote-author">{quote.quoted_user.first_name} {quote.quoted_user.last_name}</p>
                        </div>
                        <p class="quote-text">"{quote.text}"</p>
                        <Show when={quote.submitted_by}>
                            <div class="quote-card-footer">
                                <p class="quote-submitter">Submitted by {quote.submitted_by!.first_name}</p>
                            </div>
                        </Show>
                    </div>
                )}
            </For>
        </div>
    );

    return (
        <div id="quotes-view" class="view small-container">
            <div class="quotes-header">
                <div class="quotes-title-row">
                    <h1>Club Quotes</h1>
                </div>
                <div class="quotes-controls">
                    <Show when={canManage()}>
                        <button class="secondary" onClick={() => navigate('/admin/quotes')}>Manage Quotes</button>
                    </Show>
                    <div class="search-box">
                        <span class="icon" innerHTML={SEARCH_SVG} />
                        <input
                            type="text"
                            placeholder="Search quotes or person:"
                            value={search()}
                            onInput={(e) => {
                                setSearch(e.currentTarget.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <button class="button primary" onClick={() => setIsCreateModalOpen(true)}>
                        <span innerHTML={ADD_SVG} /> Create Quote
                    </button>
                </div>
            </div>

            <div id="quotes-list-container">
                <Show when={quotesData.loading && !quotesData() && !oldQuotesData()}>
                    <div class="loading-spinner"></div>
                </Show>
                <Show when={quotesData.error}>
                    <p class="error-message">Error loading quotes: {quotesData.error.message || 'Unknown error'}</p>
                </Show>
                <Show when={!quotesData.loading && !quotesData.error && quotesData()?.quotes.length === 0}>
                    <p class="no-results">No quotes found.</p>
                </Show>
                
                <PaginationSlider 
                    currentPage={page()} 
                    oldContent={<QuoteGrid data={oldQuotesData()} />}
                >
                    <QuoteGrid data={quotesData()} />
                </PaginationSlider>
            </div>

            <Pagination
                currentPage={page()}
                totalPages={quotesData()?.totalPages || 0}
                onPageChange={setPage}
            />

            <Modal
                isOpen={isCreateModalOpen()}
                title="Submit New Quote"
                onClose={() => setIsCreateModalOpen(false)}
            >
                <form onSubmit={handleCreateQuote} class="modern-form">
                    <div class="form-group">
                        <label for="new-quote-text">Quote</label>
                        <textarea name="text" id="new-quote-text" placeholder="What did they say?" required></textarea>
                    </div>
                    <div class="form-group">
                        <label for="new-quote-user">Who said it?</label>
                        <select name="quotedUserId" id="new-quote-user" required>
                            <option value="" disabled selected>Select a person</option>
                            <For each={users()}>
                                {(u) => <option value={u.id}>{u.first_name} {u.last_name}</option>}
                            </For>
                        </select>
                    </div>
                    <button type="submit" class="button primary full-width">Submit Quote</button>
                </form>
            </Modal>
        </div>
    );
}