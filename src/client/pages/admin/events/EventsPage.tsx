// todo clean up
import { createSignal, createResource, Show, For } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import CalendarWidget, { CalendarViewMode } from "@/widgets/CalendarWidget";
import { 
    UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, FILTER_LIST_SVG, CALENDAR_TODAY_SVG, LIST_SVG, CHECK_SVG,
    IOS_SHARE_SVG, DASHBOARD_SVG, ADD_SVG, ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG
} from '@/utils/icons';
import { showConfirmModal } from "@/utils/modal";
import { useNotifications } from "@/stores/notifications";

interface EventsPageData {
    events: any[];
    totalPages: number;
    viewMode: string;
}

export default function EventsPage() {
    const { notify } = useNotifications();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [showFilters, setShowFilters] = createSignal(false);
    const [oldData, setOldData] = createSignal<any>(null);
    const [currentDate, setCurrentDate] = createSignal(new Date());
    
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
    const minCost = () => getParam('minCost') || '';
    const maxCost = () => getParam('maxCost') || '';
    const difficulty = () => getParam('difficulty') || '';
    const location = () => getParam('location') || '';
    const status = () => getParam('status') || '';

    const [data, { refetch }] = createResource<EventsPageData, any>(
        () => ({ 
            page: page(), search: search(), sort: sort(), order: order(), 
            showPast: showPast(), minCost: minCost(), maxCost: maxCost(), 
            difficulty: difficulty(), location: location(), status: status(),
            view: viewMode()
        }),
        async (params, { value }) => {
            if (params.view === 'calendar') return { events: [], totalPages: 0, viewMode: 'calendar' }; 

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
                showPast: String(params.showPast),
                minCost: params.minCost,
                maxCost: params.maxCost,
                difficulty: params.difficulty,
                location: params.location,
                status: params.status
            });
            const res = await apiRequest('GET', `/api/admin/events?${query.toString()}`);
            return { events: res.events || [], totalPages: res.totalPages || 1, viewMode: params.view };
        }
    );

    const handleSort = (key: string) => {
        const newOrder = (sort() === key && order() === 'asc') ? 'desc' : 'asc';
        setSearchParams({ sort: key, order: newOrder });
    };

    const handleApplyFilters = (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        setSearchParams({
            showPast: formData.get('showPast') as string,
            minCost: formData.get('minCost') as string,
            maxCost: formData.get('maxCost') as string,
            difficulty: formData.get('difficulty') as string,
            location: formData.get('location') as string,
            status: formData.get('status') as string,
            page: 1
        });
        setShowFilters(false);
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

    return (
        <div class="glass-layout">
            <div class="glass-toolbar">
                 <div class="toolbar-content">
                    <div class="toolbar-left">
                        <Show when={viewMode() === 'list'}>
                            <form class="search-bar" onSubmit={(e) => { e.preventDefault(); setSearchParams({ search: (e.target as HTMLFormElement).search.value, page: 1 }); }}>
                                <input type="text" name="search" placeholder="Search events..." value={search()} />
                                <button type="submit" class="search-icon-btn" innerHTML={SEARCH_SVG} />
                            </form>
                        </Show>
                        <div class="toggle-group liquid-container" style={{ "--liquid-padding": "4px", "--liquid-border-radius": "100px" }}>
                            <button classList={{ active: viewMode() === 'list' }} onClick={() => setView('list')}>
                                <span innerHTML={LIST_SVG} /> List
                            </button>
                            <button classList={{ active: viewMode() === 'week' }} onClick={() => setView('week')}>
                                <span innerHTML={CALENDAR_TODAY_SVG} /> Week
                            </button>
                            <button classList={{ active: viewMode() === 'month' }} onClick={() => setView('month')}>
                                <span innerHTML={DASHBOARD_SVG} /> Month
                            </button>
                        </div>
                    </div>

                    <div class="week-navigator">
                        <div class="liquid-container" style={{ "--liquid-padding": "0.4rem 1.25rem", "--liquid-border-radius": "100px" }}>
                            <button class="nav-btn prev-week" onClick={() => handleNavigate(-1)}>
                                <span innerHTML={ARROW_BACK_IOS_NEW_SVG} />
                            </button>
                            <div class="current-week-display" style={{ "min-width": "180px", "text-align": "center" }}>
                                <span>{rangeText()}</span>
                            </div>
                            <button class="nav-btn next-week" onClick={() => handleNavigate(1)}>
                                <span innerHTML={ARROW_FORWARD_IOS_SVG} />
                            </button>
                        </div>
                    </div>
                    
                    <div class="toolbar-right">
                         <div class="button-group mini">
                            <Show when={viewMode() === 'list'}>
                                <button class="small-btn outline secondary" onClick={() => setShowFilters(!showFilters())}>
                                    <span innerHTML={FILTER_LIST_SVG} /> Filters
                                </button>
                            </Show>
                            <button class="small-btn secondary" onClick={handlePublishStaged}>
                                <span innerHTML={CHECK_SVG} /> Publish Staged
                            </button>
                            <button class="small-btn secondary" onClick={() => navigate('/admin/events/share')}>
                                <span innerHTML={IOS_SHARE_SVG} /> Share
                            </button>
                            <button onClick={() => navigate('/admin/event/new')} class="small-btn primary">
                                <span innerHTML={ADD_SVG} /> Create Event
                            </button>
                         </div>
                        
                        <Show when={showFilters() && viewMode() === 'list'}>
                            <div class="liquid-container glass-filter-panel filter-panel-position" style={{ "--liquid-padding": "1.5rem" }}>
                                <form class="filter-grid" onSubmit={handleApplyFilters}>
                                    <label>
                                        Events Display
                                        <select name="showPast" value={String(showPast())}>
                                            <option value="false">Upcoming Only</option>
                                            <option value="true">All Events</option>
                                        </select>
                                    </label>
                                    <label>
                                        Status
                                        <select name="status" value={status()}>
                                            <option value="">Any</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="pending">Draft (Pending)</option>
                                            <option value="scheduled">Scheduled</option>
                                        </select>
                                    </label>
                                    <label>
                                        Difficulty
                                        <input type="number" name="difficulty" value={difficulty()} placeholder="Exact" />
                                    </label>
                                    <label>
                                        Min Cost
                                        <input type="number" name="minCost" value={minCost()} step="0.01" />
                                    </label>
                                    <label>
                                        Max Cost
                                        <input type="number" name="maxCost" value={maxCost()} step="0.01" />
                                    </label>
                                    <label>
                                        Location
                                        <input type="text" name="location" value={location()} placeholder="Contains..." />
                                    </label>
                                    <div class="filter-actions">
                                        <button type="submit" class="small-btn">Apply Filters</button>
                                    </div>
                                </form>
                            </div>
                        </Show>
                    </div>
                </div>
            </div>

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
                
                <Show when={data()?.totalPages}>
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
