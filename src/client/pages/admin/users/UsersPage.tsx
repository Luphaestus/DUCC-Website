// todo clean up
import { createSignal, createResource, Show, For } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Avatar from "@/components/Avatar";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import { 
    UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, GROUP_SVG
} from '@/utils/icons';
import { useNotifications } from "@/stores/notifications";
import { TabNav } from "@/widgets/TabNav";
import Modal from "@/components/Modal";
import { ProfilePictureChangedEvent } from "@/utils/events/events";
import { onCleanup, onMount } from "solid-js";

interface UsersPageData {
    users: any[];
    totalPages: number;
    minMoney: number;
    tab: string;
}

export default function UsersPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotifications();
    const navigate = useNavigate();
    const [oldData, setOldData] = createSignal<any>(null);

    const page = () => parseInt((searchParams.page as string) || '1');
    const search = () => (searchParams.search as string) || '';
    const sort = () => (searchParams.sort as string) || 'last_name';
    const order = () => (searchParams.order as string) || 'asc';
    const tab = () => (searchParams.tab as string) || 'default';

    onMount(() => {
        const ppCleanup = ProfilePictureChangedEvent.subscribe(() => {
            refetch();
        });
        onCleanup(ppCleanup);
    });

    const [data, { refetch }] = createResource<UsersPageData, any>(
        () => ({ page: page(), search: search(), sort: sort(), order: order(), tab: tab() }),
        async (params, { value }) => {
            if (value && params.tab === (data as any).latest?.tab) {
                setOldData(value);
            } else {
                setOldData(null);
            }

            const [userData, globalData] = await Promise.all([
                apiRequest('GET', `/api/admin/users?${new URLSearchParams({
                    page: String(params.page),
                    limit: '15',
                    search: params.search,
                    sort: params.sort,
                    order: params.order
                }).toString()}`),
                apiRequest('GET', '/api/globals/MinMoney').catch(() => ({ res: { MinMoney: { data: -25 } } }))
            ]);
            return { 
                users: userData.users || [], 
                totalPages: userData.totalPages || 1,
                minMoney: Number(globalData.res?.MinMoney?.data || -25),
                tab: params.tab
            };
        }
    );

    const handleSort = (key: string) => {
        const currentSort = sort();
        const currentOrder = order();
        const newOrder = (currentSort === key && currentOrder === 'asc') ? 'desc' : 'asc';
        setSearchParams({ sort: key, order: newOrder });
    };

    const handleSearch = (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const input = form.querySelector('input') as HTMLInputElement;
        setSearchParams({ search: input.value, page: 1 });
    };

    const handleQuickAdd = async (userId: number, type: 'swims' | 'booties') => {
        try {
            await apiRequest('POST', `/api/user/${userId}/${type}`, { count: 1 });
            notify('Success', `${type === 'swims' ? 'Swim' : 'Bootie'} added.`, 'success');
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const [transactionUser, setTransactionUser] = createSignal<any | null>(null);
    const handleQuickTransaction = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const userId = transactionUser()?.id;
        try {
            await apiRequest('POST', `/api/admin/user/${userId}/transaction`, {
                amount: parseFloat(formData.get('amount') as string),
                description: formData.get('description') as string
            });
            notify('Success', 'Transaction recorded.', 'success');
            setTransactionUser(null);
            refetch();
        } catch (err: any) {
            notify('Error', err.message, 'error');
        }
    };

    const UserTable = (props: { data: any }) => (
        <table class="glass-table users-table">
            <thead>
                <tr>
                    <th class="sortable" onClick={() => handleSort('last_name')}>
                        Name <Show when={sort() === 'last_name'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <Switch>
                        <Match when={tab() === 'swims'}>
                            <th class="sortable" onClick={() => handleSort('swims')}>
                                Swims <Show when={sort() === 'swims'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                                    <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                                </Show>
                            </th>
                            <th>Quick Add</th>
                        </Match>
                        <Match when={tab() === 'transactions'}>
                            <th class="sortable" onClick={() => handleSort('balance')}>
                                Balance <Show when={sort() === 'balance'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                                    <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                                </Show>
                            </th>
                            <th>Quick Actions</th>
                        </Match>
                        <Match when={true}>
                            <th class="sortable" onClick={() => handleSort('college_id')}>
                                College <Show when={sort() === 'college_id'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                                        <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                                </Show>
                            </th>
                            <th class="sortable" onClick={() => handleSort('difficulty_level')}>
                                Difficulty <Show when={sort() === 'difficulty_level'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                                    <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                                </Show>
                            </th>
                            <th class="sortable" onClick={() => handleSort('balance')}>
                                Balance <Show when={sort() === 'balance'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                                    <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                                </Show>
                            </th>
                        </Match>
                    </Switch>
                </tr>
            </thead>
            <tbody>
                <Show when={props.data && props.data.users.length === 0}>
                    <tr><td colspan="5" class="empty-cell">No users found.</td></tr>
                </Show>
                <For each={props.data?.users}>
                    {(user) => {
                        const bal = Number(user.balance || 0);
                        let balClass = 'text-success';
                        if (props.data && bal < props.data.minMoney) balClass = 'text-danger';
                        else if (bal < 0) balClass = 'text-warning';
                        
                        const lastInitial = user.last_name ? user.last_name.charAt(0) + '.' : '';

                        return (
                            <tr class="user-row clickable-row" onClick={() => navigate(`/admin/user/${user.id}${tab() === 'swims' ? '?tab=swims' : (tab() === 'transactions' ? '?tab=finance' : '')}`)}>
                                <td data-label="Name" class="primary-text name-column">
                                    <div class="user-info-cell">
                                        <Avatar user={user} classes="mini" />
                                        <div class="user-names">
                                            <span class="full-name">{user.first_name} {user.last_name}</span>
                                            <span class="thin-name">{user.first_name} {lastInitial}</span>
                                        </div>
                                    </div>
                                </td>
                                
                                <Switch>
                                    <Match when={tab() === 'swims'}>
                                        <td data-label="Swims">{user.swims || 0}</td>
                                        <td data-label="Quick Add" class="quick-actions-cell" onClick={(e) => e.stopPropagation()}>
                                            <button class="small-btn primary mini-btn" onClick={() => handleQuickAdd(user.id, 'swims')} title="Add 1 Swim">+1 Swim</button>
                                            <button class="small-btn secondary mini-btn" onClick={() => handleQuickAdd(user.id, 'booties')} title="Add 1 Bootie">+1 Bootie</button>
                                        </td>
                                    </Match>
                                    <Match when={tab() === 'transactions'}>
                                        <td data-label="Balance" class={balClass}>£{bal.toFixed(2)}</td>
                                        <td data-label="Quick Actions" class="quick-actions-cell" onClick={(e) => e.stopPropagation()}>
                                            <button class="small-btn primary mini-btn" onClick={() => setTransactionUser(user)} title="Add Transaction">Add</button>
                                            <button class="small-btn secondary mini-btn" onClick={() => navigate(`/admin/user/${user.id}?tab=finance`)} title="Manage Transactions">Manage</button>
                                        </td>
                                    </Match>
                                    <Match when={true}>
                                        <td data-label="College">{user.college_name || 'N/A'}</td>
                                        <td data-label="Difficulty">
                                            <span class={`badge difficulty-${user.difficulty_level || 1}`}>{user.difficulty_level || 1}</span>
                                        </td>
                                        <td data-label="Balance" class={balClass}>£{bal.toFixed(2)}</td>
                                    </Match>
                                </Switch>
                            </tr>
                        );
                    }}
                </For>
            </tbody>
        </table>
    );

    return (
        <div>
             <div class="liquid-container glass-toolbar" style={{ "--liquid-padding": "0.5rem 1rem", "--liquid-border-radius": "100px" }}>
                <div class="toolbar-content">
                    <div class="toolbar-left">
                        <TabNav class="tab-nav-simple">
                            <button 
                                class={`tab-btn ${tab() === 'default' ? 'active' : ''}`} 
                                onClick={() => setSearchParams({ tab: 'default' })}
                            >
                                Details
                            </button>
                            <button 
                                class={`tab-btn ${tab() === 'swims' ? 'active' : ''}`} 
                                onClick={() => setSearchParams({ tab: 'swims' })}
                            >
                                Swims
                            </button>
                            <button 
                                class={`tab-btn ${tab() === 'transactions' ? 'active' : ''}`} 
                                onClick={() => setSearchParams({ tab: 'transactions' })}
                            >
                                Transactions
                            </button>
                        </TabNav>
                    </div>
                    <div class="toolbar-right">
                        <form class="search-bar" onSubmit={handleSearch}>
                            <input type="text" placeholder="Search users..." value={search()} />
                            <button type="submit" class="search-icon-btn" innerHTML={SEARCH_SVG} />
                        </form>
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
                        oldContent={<UserTable data={oldData()} />}
                    >
                        <UserTable data={data()} />
                    </PaginationSlider>
                </div>
            </div>
            
            <Show when={data()?.totalPages}>
                <Pagination 
                    currentPage={page()} 
                    totalPages={data()!.totalPages} 
                    onPageChange={(p) => setSearchParams({ page: p })} 
                />
            </Show>

            <Modal 
                isOpen={!!transactionUser()} 
                onClose={() => setTransactionUser(null)} 
                title={`Quick Transaction: ${transactionUser()?.first_name}`}
            >
                <form onSubmit={handleQuickTransaction} class="modern-form">
                    <label>Amount (£)
                        <input name="amount" type="number" step="0.01" placeholder="5.00 or -5.00" required autofocus />
                    </label>
                    <label>Description
                        <input name="description" type="text" placeholder="Reason for transaction" required />
                    </label>
                    <button type="submit" class="primary full-width mt-4">Record Transaction</button>
                </form>
            </Modal>
        </div>
    );
}