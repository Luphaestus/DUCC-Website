import { createSignal, createResource, Show, For } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Avatar from "@/components/Avatar";
import Pagination from "@/components/Pagination";
import { 
    UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, GROUP_SVG
} from '@/utils/icons';
import { useNotifications } from "@/stores/notifications";
import { TabNav } from "@/widgets/TabNav";
import Panel from "@/components/Panel";

export default function UsersPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { notify } = useNotifications();
    const navigate = useNavigate();

    const page = () => parseInt(searchParams.page || '1');
    const search = () => searchParams.search || '';
    const sort = () => searchParams.sort || 'last_name';
    const order = () => searchParams.order || 'asc';
    const tab = () => searchParams.tab || 'default';

    const [data, { refetch }] = createResource(
        () => ({ page: page(), search: search(), sort: sort(), order: order() }),
        async (params) => {
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
                minMoney: Number(globalData.res?.MinMoney?.data || -25)
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

    return (
        <div class="glass-layout">
             <div class="glass-toolbar">
                <div class="toolbar-left">
                    <TabNav class="tab-nav-simple">
                        <button 
                            class={`tab-btn ${tab() !== 'swims' ? 'active' : ''}`} 
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
                    </TabNav>
                </div>
                 <div class="toolbar-right">
                    <form class="search-bar" onSubmit={handleSearch}>
                        <input type="text" placeholder="Search users..." value={search()} />
                        <button type="submit" class="search-icon-btn" innerHTML={SEARCH_SVG} />
                    </form>
                 </div>
            </div>

            <Panel class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table users-table">
                        <thead>
                            <tr>
                                <th class="sortable" onClick={() => handleSort('last_name')}>
                                    Name <Show when={sort() === 'last_name'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                                        <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                                    </Show>
                                </th>
                                <Show when={tab() === 'swims'}>
                                    <th class="sortable" onClick={() => handleSort('swims')}>
                                        Swims <Show when={sort() === 'swims'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                                        </Show>
                                    </th>
                                    <th>Quick Add</th>
                                </Show>
                                <Show when={tab() !== 'swims'}>
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
                                </Show>
                            </tr>
                        </thead>
                        <tbody>
                            <Show when={data.loading}>
                                <tr><td colspan="5" class="loading-cell">Loading...</td></tr>
                            </Show>
                            <Show when={!data.loading && data()?.users.length === 0}>
                                <tr><td colspan="5" class="empty-cell">No users found.</td></tr>
                            </Show>
                            <For each={data()?.users}>
                                {(user) => {
                                    const bal = Number(user.balance || 0);
                                    let balClass = 'text-success';
                                    if (data() && bal < data()!.minMoney) balClass = 'text-danger';
                                    else if (bal < 0) balClass = 'text-warning';
                                    
                                    const lastInitial = user.last_name ? user.last_name.charAt(0) + '.' : '';

                                    return (
                                        <tr class="user-row clickable-row" onClick={() => navigate(`/admin/user/${user.id}?tab=${tab() === 'swims' ? 'swims' : ''}`)}>
                                            <td data-label="Name" class="primary-text name-column">
                                                <div class="user-info-cell">
                                                    <Avatar user={user} classes="mini" />
                                                    <div class="user-names">
                                                        <span class="full-name">{user.first_name} {user.last_name}</span>
                                                        <span class="thin-name">{user.first_name} {lastInitial}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            <Show when={tab() === 'swims'}>
                                                <td data-label="Swims">{user.swims || 0}</td>
                                                <td data-label="Quick Add" class="quick-actions-cell" onClick={(e) => e.stopPropagation()}>
                                                    <button class="small-btn primary mini-btn" onClick={() => handleQuickAdd(user.id, 'swims')}>+1 Swim</button>
                                                    <button class="small-btn secondary mini-btn" onClick={() => handleQuickAdd(user.id, 'booties')}>+1 Bootie</button>
                                                </td>
                                            </Show>

                                            <Show when={tab() !== 'swims'}>
                                                <td data-label="College">{user.college_name || 'N/A'}</td>
                                                <td data-label="Difficulty">
                                                    <span class={`badge difficulty-${user.difficulty_level || 1}`}>{user.difficulty_level || 1}</span>
                                                </td>
                                                <td data-label="Balance" class={balClass}>£{bal.toFixed(2)}</td>
                                            </Show>
                                        </tr>
                                    );
                                }}
                            </For>
                        </tbody>
                    </table>
                </div>
            </Panel>
            
            <Show when={data()?.totalPages}>
                <Pagination 
                    currentPage={page()} 
                    totalPages={data()!.totalPages} 
                    onPageChange={(p) => setSearchParams({ page: p })} 
                />
            </Show>
        </div>
    );
}