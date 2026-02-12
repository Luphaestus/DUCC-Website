// todo clean up
import { createSignal, createResource, Show, For, onMount, onCleanup } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import CalendarWidget, { CalendarViewMode } from "@/widgets/CalendarWidget";
import { 
    UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, FILTER_LIST_SVG, CALENDAR_TODAY_SVG, LIST_SVG, CHECK_SVG,
    IOS_SHARE_SVG, DASHBOARD_SVG, ADD_SVG, ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG, REFRESH_SVG
} from '@/utils/icons';
import { showConfirmModal } from "@/utils/modal";
import { useNotifications } from "@/stores/notifications";
import { TabNav } from "@/widgets/TabNav";
import PageTitle from "@/components/PageTitle";
import { EventsHeaderControls } from "@/widgets/EventsHeaderControls";

interface EventsPageData {
    events: any[];
    totalPages: number;
    viewMode: string;
}

export default function EventsPage() {
    const { notify } = useNotifications();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [oldData, setOldData] = createSignal<any>(null);
    const [currentDate, setCurrentDate] = createSignal(new Date());
    const [isRefreshing, setIsRefreshing] = createSignal(false);
    
    // View mode: list or calendar
    const viewMode = () => (searchParams.view as any) || 'list';

    const setView = (mode: string) => {
        setSearchParams({ view: mode, page: 1 });
    };

    const handleNavigate = (delta: number) => {
        const mode = viewMode();
        if (mode === 'list') {
            setSearchParams({ page: page() + delta });
        } else if (mode === 'week') {
            const d = new Date(currentDate());
            d.setDate(d.getDate() + (delta * 7));
            setCurrentDate(d);
        } else if (mode === 'month') {
            const d = new Date(currentDate());
            d.setMonth(d.getMonth() + delta);
            setCurrentDate(d);
        }
    };

    const rangeText = () => {
        const mode = viewMode();
        if (mode === 'month') {
            return currentDate().toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        
        if (mode === 'week') {
            const start = new Date(currentDate());
            start.setDate(start.getDate() - start.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            const f = (d: Date) => d.toLocaleDateString('en-UK', { month: 'short', day: 'numeric' });
            return `${f(start)} - ${f(end)}`;
        }

        return `Page ${page()}`;
    };

    const getParam = (key: string) => {
        const val = searchParams[key];
        return Array.isArray(val) ? val[0] : val;
    };

    const page = () => parseInt(getParam('page') || '1');
    const search = () => getParam('search') || '';
    const sort = () => getParam('sort') || 'start';
    const order = () => getParam('order') || 'asc';
    const showPast = () => searchParams.showPast === 'true';

    const [data, { refetch }] = createResource<EventsPageData, any>(
        () => ({ 
            page: page(), search: search(), sort: sort(), order: order(), 
            showPast: showPast(),
            view: viewMode()
        }),
        async (params, { value }) => {
            if (params.view === 'week' || params.view === 'month') return { events: [], totalPages: 0, viewMode: params.view }; 

            if (value && params.view === (data as any).latest?.viewMode) {
                setOldData(value);
            } else {
                setOldData(null);
            }

            const query = new URLSearchParams({
                page: String(params.page),
                limit: '10',
                search: params.search,
                sort: params.sort,
                order: params.order,
                showPast: String(params.showPast)
            });
            const res = await apiRequest('GET', `/api/admin/events?${query.toString()}`);
            return { events: res.events || [], totalPages: res.totalPages || 1, viewMode: params.view };
        }
    );

    const refresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setTimeout(() => setIsRefreshing(false), 600);
    };

    const handleSort = (key: string) => {
        const newOrder = (sort() === key && order() === 'asc') ? 'desc' : 'asc';
        setSearchParams({ sort: key, order: newOrder });
    };

    const handlePublishStaged = async () => {
        if (await showConfirmModal("Publish All Staged?", "This will confirm all current draft/pending events and make them visible to users.")) {
            try {
                await apiRequest('POST', '/api/admin/events/publish-staged');
                notify('Success', 'Events published!', 'success');
                refetch();
            } catch (err: any) {
                notify('Error', err.message, 'error');
            }
        }
    };

    const EventTable = (props: { data: any }) => (
        <table class="glass-table">
            <thead>
                <tr>
                    <th class="sortable" onClick={() => handleSort('title')}>
                        Title <Show when={sort() === 'title'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('status')}>Status</th>
                    <th class="sortable" onClick={() => handleSort('start')}>
                        Date <Show when={sort() === 'start'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('location')}>
                        Location <Show when={sort() === 'location'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('difficulty_level')}>
                        Difficulty <Show when={sort() === 'difficulty_level'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                    <th class="sortable" onClick={() => handleSort('upfront_cost')}>
                        Cost <Show when={sort() === 'upfront_cost'} fallback={<span innerHTML={UNFOLD_MORE_SVG}/>}>
                            <span innerHTML={order() === 'asc' ? ARROW_DROP_UP_SVG : ARROW_DROP_DOWN_SVG} />
                        </Show>
                    </th>
                </tr>
            </thead>
            <tbody>
                <Show when={props.data && props.data.events.length === 0}>
                    <tr><td colspan="6" class="empty-cell">No events found.</td></tr>
                </Show>
                <For each={props.data?.events}>
                    {(event) => (
                        <tr class="event-row clickable" onClick={() => navigate(`/admin/event/${event.id}`)}>
                            <td data-label="Title" class="primary-text">{event.title}</td>
                            <td data-label="Status">
                                <span class={`badge ${event.status === 'confirmed' ? 'success' : event.status === 'scheduled' ? 'warning' : 'neutral'}`}>
                                    {event.status}
                                </span>
                            </td>
                            <td data-label="Date">{new Date(event.start).toLocaleString('en-GB')}</td>
                            <td data-label="Location">{event.location}</td>
                            <td data-label="Difficulty">
                                <span class={`badge difficulty-${event.difficulty_level}`}>{event.difficulty_level}</span>
                            </td>
                            <td data-label="Cost">£{event.upfront_cost.toFixed(2)}</td>
                        </tr>
                    )}
                </For>
            </tbody>
        </table>
    );

    const [isDesktop, setIsDesktop] = createSignal(window.innerWidth > 992);

    onMount(() => {
        const handleResize = () => setIsDesktop(window.innerWidth > 992);
        window.addEventListener('resize', handleResize);
        onCleanup(() => window.removeEventListener('resize', handleResize));
    });

    return (
        <div class="glass-layout">
            <EventsHeaderControls 
                viewMode={viewMode as Accessor<'list' | 'week' | 'month'>}
                setView={setView as any}
                rangeText={rangeText}
                onNavigate={handleNavigate}
                onToday={() => {
                    if (viewMode() === 'list') {
                        if (page() === 1) refresh();
                        else setSearchParams({ page: 1 });
                    } else {
                        setCurrentDate(new Date());
                    }
                }}
                isToday={() => viewMode() === 'list' ? page() === 1 : currentDate().toDateString() === new Date().toDateString()}
                isRefreshing={isRefreshing}
                isDesktop={isDesktop}
                secondary={
                    <>
                        <Show when={viewMode() === 'list'}>
                            <form class="search-bar-compact" onSubmit={(e) => { e.preventDefault(); setSearchParams({ search: (e.target as HTMLFormElement).search.value, page: 1 }); }}>
                                <div class="glass-input-group" style={{ "max-width": "100%", "--liquid-padding": "0", "--liquid-border-radius": "100px" }}>
                                    <span class="icon" innerHTML={SEARCH_SVG} />
                                    <input type="text" name="search" placeholder="Search..." value={search()} style={{ "padding-left": "2.75rem !important" }} />
                                </div>
                            </form>
                        </Show>
                        
                        <div class="actions-group">
                            <button class="small-btn secondary outline hide-mobile" onClick={handlePublishStaged} title="Publish All Staged">
                                <span innerHTML={CHECK_SVG} /> <span class="btn-text">Publish</span>
                            </button>
                            <button class="small-btn secondary outline hide-mobile" onClick={() => navigate('/admin/events/share')} title="Share Week">
                                <span innerHTML={IOS_SHARE_SVG} /> <span class="btn-text">Share</span>
                            </button>
                            <button class="small-btn primary" onClick={() => navigate('/admin/event/new')}>
                                <span innerHTML={ADD_SVG} /> <span class="btn-text">Create</span>
                            </button>
                        </div>
                    </>
                }
            />

            <Show when={viewMode() === 'list'}>
                <div class="glass-table-container">
                    <div class="table-responsive">
                        <Show when={data.loading && !data() && !oldData()}>
                            <div class="loading-cell text-centre" style="padding: 2rem;">Loading...</div>
                        </Show>
                        <PaginationSlider 
                            currentPage={page()} 
                            oldContent={<EventTable data={oldData()} />}
                        >
                            <EventTable data={data()} />
                        </PaginationSlider>
                    </div>
                </div>
                
                <Show when={data()?.totalPages && data()!.totalPages > 1}>
                    <Pagination 
                        currentPage={page()} 
                        totalPages={data()!.totalPages} 
                        onPageChange={(p) => setSearchParams({ page: p })} 
                    />
                </Show>
            </Show>

            <Show when={viewMode() === 'week' || viewMode() === 'month'}>
                <CalendarWidget 
                    adminMode={true} 
                    hideHeader={true}
                    viewMode={viewMode() as CalendarViewMode}
                    date={currentDate()}
                    onDateChange={setCurrentDate}
                    onDayClick={(d) => {
                        if (viewMode() === 'month') {
                            setCurrentDate(d);
                            setView('week');
                        }
                    }}
                    onEventClick={(e) => navigate(`/admin/event/${e.id}`)}
                />
            </Show>
        </div>
    );
}