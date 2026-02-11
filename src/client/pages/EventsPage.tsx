// todo clean up
import { createSignal, createResource, For, Show, onMount, onCleanup, createMemo, createEffect, ParentProps } from "solid-js";
import { useSearchParams, useNavigate, useLocation } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import {
    ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG,
    REFRESH_SVG, DASHBOARD_SVG, LIST_SVG, CALENDAR_TODAY_SVG
} from '@/utils/icons';
import { StandardCard, EventData } from '../widgets/StandardCard';
import { useAuth } from "@/stores/auth";
import PaginationSlider from "@/components/PaginationSlider";
import PageTitle from "@/components/PageTitle";
import { TabNav } from "../widgets/TabNav";
import CalendarWidget, { CalendarViewMode } from "../widgets/CalendarWidget";

interface PageData {
    events: EventData[];
    startDate: string;
    endDate: string;
}

export default function EventsPage(props: ParentProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [isRefreshing, setIsRefreshing] = createSignal(false);
    const [oldPageData, setOldData] = createSignal<PageData | null>(null);
    const [isTransitioning, setIsTransitioning] = createSignal(false);
    const [viewMode, setViewMode] = createSignal<'list' | 'week' | 'month'>((localStorage.getItem('events_view_mode') as any) || 'list');
    const [currentDate, setCurrentDate] = createSignal(new Date());

    const setView = (mode: 'list' | 'week' | 'month') => {
        setViewMode(mode);
        localStorage.setItem('events_view_mode', mode);
    };

    const page = () => {
        const p = searchParams.page;
        const pageStr = Array.isArray(p) ? p[0] : p;
        return parseInt(pageStr || '0');
    };

    const [pageData, { mutate, refetch }] = createResource<PageData, number>(page, async (p, { value }) => {
        if (value) setOldData(value);
        return await apiRequest('GET', `/api/events/paged/${p}`, null, true) as PageData;
    });

    const refresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setTimeout(() => setIsRefreshing(false), 600);
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
        
        const data = pageData();
        if (!data && mode === 'list') return "Loading...";
        
        const formatDate = (d: string | Date) => new Date(d).toLocaleDateString('en-UK', { month: 'short', day: 'numeric' });
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const start = mode === 'list' ? new Date(data!.startDate) : new Date(currentDate());
        if (mode === 'week') {
            start.setDate(start.getDate() - start.getDay());
        }
        
        const end = mode === 'list' ? new Date(data!.endDate) : new Date(start);
        if (mode === 'week') {
            end.setDate(start.getDate() + 6);
        }

        if (start.getTime() === today.getTime()) return `Today - ${formatDate(end)}`;
        
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (end.toDateString() === yesterday.toDateString()) return `${formatDate(start)} - Yesterday`;

        return `${formatDate(start)} - ${formatDate(end)}`;
    };

    const getGroupedEvents = (data: PageData | null | undefined) => {
        const events = data?.events || [];
        const groups: { date: Date; events: EventData[] }[] = [];
        let currentGroup: { date: Date; events: EventData[] } | null = null;

        events.forEach(event => {
            const date = new Date(event.start);
            date.setHours(0,0,0,0);

            if (!currentGroup || currentGroup.date.getTime() !== date.getTime()) {
                currentGroup = { date, events: [] };
                groups.push(currentGroup);
            }
            currentGroup.events.push(event);
        });
        return groups;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const getEventStyle = (event: EventData) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const top = (startMinutes / 1440) * 100;
        let duration = (end.getTime() - start.getTime()) / (1000 * 60);
        if (duration < 45) duration = 45; 
        const height = (duration / 1440) * 100;
        return { top: `${top}%`, height: `${height}%`, left: '4px', right: '4px' };
    };

    const EventList = (props: { data: PageData | null | undefined }) => (
        <Show when={viewMode() !== 'list' && isDesktop()} fallback={
            <div class="events-page-content">
                <For each={getGroupedEvents(props.data)}>
                    {(group) => (
                        <div class="day-group">
                            <div class="date-strip-container" style={{ margin: '2.5rem 0 1.5rem 0' }}>
                                <div class="date-strip">
                                    <span class="date-num">{group.date.getDate()}</span>
                                    <div class="date-text-group">
                                        <span class="day-name">{group.date.toLocaleDateString('en-UK', { weekday: 'long' })}</span>
                                        <div class="date-line"></div>
                                        <span class="month-name">{group.date.toLocaleDateString('en-UK', { month: 'short' })}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="day-events-grid">
                                <For each={group.events}>
                                    {(event) => <StandardCard event={event} paused={isTransitioning()} />}
                                </For>
                            </div>
                        </div>
                    )}
                </For>
            </div>
        }>
            <div class="liquid-container events-page-content weekly-mode" style={{ "--liquid-padding": "0", "--liquid-border-radius": "24px", "margin-top": "1rem", "width": "100%", "overflow": "hidden" }}>
                <CalendarWidget 
                    hideHeader={true}
                    date={currentDate()}
                    viewMode={viewMode() as CalendarViewMode}
                    onDateChange={setCurrentDate}
                    onEventClick={(e) => navigate(`/events/${e.id}${location.search}`)} 
                    onDayClick={(day) => {
                        setCurrentDate(day);
                        setView('list');
                    }}
                />
            </div>
        </Show>
    );

    const [isDesktop, setIsDesktop] = createSignal(window.innerWidth > 992);
    const [now, setNow] = createSignal(new Date());

    onMount(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        const handleResize = () => {
            const desktop = window.innerWidth > 992;
            setIsDesktop(desktop);
            if (!desktop && viewMode() !== 'list') {
                setView('list');
            }
        };
        window.addEventListener('resize', handleResize);
        onCleanup(() => {
            clearInterval(timer);
            window.removeEventListener('resize', handleResize);
        });
    });

    return (
        <div id="events-view" class="view small-container">
            <PageTitle text="Upcoming Events" />
            <div class="events-controls-modern">
                <div class="admin-control-wrapper">
                    <Show when={isDesktop()}>
                        <TabNav class="toggle-group-mini" style={{ "--liquid-padding": "4px", "--liquid-border-radius": "100px", "margin-left": "0" }}>
                            <button class="tab-btn" classList={{ active: viewMode() === 'list' }} onClick={() => setView('list')} title="List View"><span innerHTML={LIST_SVG} /></button>
                            <button class="tab-btn" classList={{ active: viewMode() === 'week' }} onClick={() => setView('week')} title="Week View"><span innerHTML={CALENDAR_TODAY_SVG} /></button>
                            <button class="tab-btn" classList={{ active: viewMode() === 'month' }} onClick={() => setView('month')} title="Month View"><span innerHTML={DASHBOARD_SVG} /></button>
                        </TabNav>
                    </Show>
                </div>

                <div class="week-navigator">
                    <div class="liquid-container" style={{ "--liquid-padding": "0.4rem 1.25rem" }} {...{ paused: isTransitioning() } as any}>
                        <button class="nav-btn prev-week" title="Previous" onClick={() => handleNavigate(-1)}>
                            <span innerHTML={ARROW_BACK_IOS_NEW_SVG} />
                        </button>
                        <div class="current-week-display">
                            <span id="page-range-text">{rangeText()}</span>
                        </div>
                        <button class="nav-btn next-week" title="Next" onClick={() => handleNavigate(1)}>
                            <span innerHTML={ARROW_FORWARD_IOS_SVG} />
                        </button>
                    </div>
                </div>

                <div class="today-control-wrapper">
                    <div class="liquid-container" style={{ "--liquid-padding": "0.4rem 0.75rem" }} {...{ paused: isTransitioning() } as any}>
                        <button 
                            class="today-btn" 
                            classList={{ 
                                disabled: viewMode() === 'list' ? page() === 0 : currentDate().toDateString() === new Date().toDateString(), 
                                'spin-active': isRefreshing() 
                            }} 
                            title="Back to Today" 
                            onClick={() => {
                                if (viewMode() === 'list') {
                                    if (page() === 0) refresh();
                                    else setSearchParams({ page: 0 });
                                } else {
                                    setCurrentDate(new Date());
                                }
                            }}
                        >
                            <span innerHTML={REFRESH_SVG} />
                            <span class="btn-text">Today</span>
                        </button>
                    </div>
                </div>
            </div>

            <div id="events-list-container">
                <Show when={pageData.loading && !pageData() && !oldPageData()}>
                     <p class="loading-text">Loading events...</p>
                </Show>
                
                <PaginationSlider 
                    currentPage={page()} 
                    oldContent={<EventList data={oldPageData()} />}
                >
                    <EventList data={pageData()} />
                </PaginationSlider>
            </div>
            {props.children}
        </div>
    );
}