import { createSignal, createResource, Show, For } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import Pagination from "@/components/Pagination";
import PaginationSlider from "@/components/PaginationSlider";
import CalendarView from "./CalendarView";
import { 
    UNFOLD_MORE_SVG, SEARCH_SVG, ARROW_DROP_DOWN_SVG, ARROW_DROP_UP_SVG, FILTER_LIST_SVG, CALENDAR_TODAY_SVG, LIST_SVG
} from '@/utils/icons';
import LiquidContainer from "@/components/LiquidContainer";

export default function EventsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [showFilters, setShowFilters] = createSignal(false);
    const [oldData, setOldData] = createSignal<any>(null);
    
    // View mode: list or calendar
    const viewMode = () => searchParams.view || 'list';

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

    const [data, { refetch }] = createResource(
        () => ({ 
            page: page(), search: search(), sort: sort(), order: order(), 
            showPast: showPast(), minCost: minCost(), maxCost: maxCost(), 
            difficulty: difficulty(), location: location(), status: status(),
            view: viewMode()
        }),
        async (params, { value }) => {
            if (params.view === 'calendar') return { events: [], totalPages: 0 }; // Calendar handles its own data fetching

            if (value && params.view === (data() as any)?.viewMode) {
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
                        <tr class="event-row clickable-row" onClick={() => navigate(`/admin/event/${event.id}`)}>
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
            <LiquidContainer class="glass-toolbar" padding="0.5rem 1rem" borderRadius={100}>
                 <div class="toolbar-content">
                    <div class="toolbar-left">
                        <Show when={viewMode() === 'list'}>
                            <form class="search-bar" onSubmit={(e) => { e.preventDefault(); setSearchParams({ search: (e.target as HTMLFormElement).search.value, page: 1 }); }}>
                                <input type="text" name="search" placeholder="Search events..." value={search()} />
                                <button type="submit" class="search-icon-btn" innerHTML={SEARCH_SVG} />
                            </form>
                        </Show>
                        <div class="toggle-group">
                            <button class={viewMode() === 'list' ? 'active' : ''} onClick={() => setSearchParams({ view: 'list' })}>
                                <span innerHTML={LIST_SVG} style="vertical-align: middle; margin-right: 0.5rem;" /> List
                            </button>
                            <button class={viewMode() === 'calendar' ? 'active' : ''} onClick={() => setSearchParams({ view: 'calendar' })}>
                                <span innerHTML={CALENDAR_TODAY_SVG} style="vertical-align: middle; margin-right: 0.5rem;" /> Calendar
                            </button>
                        </div>
                    </div>
                    
                    <div class="toolbar-right">
                         <Show when={viewMode() === 'list'}>
                            <button class="small-btn outline secondary" onClick={() => setShowFilters(!showFilters())}>
                                <span innerHTML={FILTER_LIST_SVG} /> Filters
                            </button>
                         </Show>
                         <button onClick={() => navigate('/admin/event/new')} class="small-btn">Create Event</button>
                        
                        <Show when={showFilters() && viewMode() === 'list'}>
                            <LiquidContainer class="glass-filter-panel filter-panel-position" padding="1.5rem">
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
                            </LiquidContainer>
                        </Show>
                    </div>
                </div>
            </LiquidContainer>

            <Show when={viewMode() === 'list'}>
                <LiquidContainer class="table-responsive" padding="0">
                    <Show when={data.loading && !data() && !oldData()}>
                        <div class="loading-cell text-centre" style="padding: 2rem;">Loading...</div>
                    </Show>
                    <PaginationSlider 
                        currentPage={page()} 
                        oldContent={<EventTable data={oldData()} />}
                    >
                        <EventTable data={data()} />
                    </PaginationSlider>
                </LiquidContainer>
                
                <Show when={data()?.totalPages}>
                    <Pagination 
                        currentPage={page()} 
                        totalPages={data()!.totalPages} 
                        onPageChange={(p) => setSearchParams({ page: p })} 
                    />
                </Show>
            </Show>

            <Show when={viewMode() === 'calendar'}>
                <CalendarView />
            </Show>
        </div>
    );
}
