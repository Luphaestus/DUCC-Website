// todo clean up
import { createSignal, createResource, For, Show, onMount, onCleanup, createMemo, createEffect, ParentProps } from "solid-js";
import { useSearchParams, useNavigate, useLocation } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import {
    ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG,
    REFRESH_SVG, SETTINGS_SVG, DASHBOARD_SVG, POOL_SVG
} from '@/utils/icons';
import { StandardCard, EventData } from '../widgets/StandardCard';
import { useAuth } from "@/stores/auth";
import { 
    EventAttendanceChangedEvent, 
    LegalEvent, 
    BalanceChangedEvent,
} from '@/utils/events/events';
import { onUpdate } from "@/utils/updates";
import PaginationSlider from "@/components/PaginationSlider";
import PageTitle from "@/components/PageTitle";
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
    const { user, isAdmin } = useAuth();
    const [isRefreshing, setIsRefreshing] = createSignal(false);
    const [oldPageData, setOldData] = createSignal<PageData | null>(null);
    const [isTransitioning, setIsTransitioning] = createSignal(false);
    const [viewMode, setViewMode] = createSignal<'list' | 'week' | 'month'>((localStorage.getItem('events_view_mode') as any) || 'list');

    const setView = (mode: 'list' | 'week' | 'month') => {
        setViewMode(mode);
        localStorage.setItem('events_view_mode', mode);
    };

    const page = () => {
        const p = searchParams.page;
        const pageStr = Array.isArray(p) ? p[0] : p;
        return parseInt(pageStr || '0');
    };

    createEffect(() => {
        page();
        setIsTransitioning(true);
        const timer = setTimeout(() => setIsTransitioning(false), 600);
        onCleanup(() => clearTimeout(timer));
    });

    const [pageData, { mutate, refetch }] = createResource<PageData, number>(page, async (p, { value }) => {
        if (value) setOldData(value);
        return await apiRequest('GET', `/api/events/paged/${p}`) as PageData;
    });

    const refresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setTimeout(() => setIsRefreshing(false), 600);
    };

    onMount(async () => {
        LegalEvent.subscribe(refresh);
        BalanceChangedEvent.subscribe(refresh);
        EventAttendanceChangedEvent.subscribe(refresh);

        const cleanup = onUpdate((event) => {
            if (event.type === 'event_update') {
                refetch();
            } else if (event.type === 'attendance_update') {
                const { eventId, action } = event.data;
                mutate((prev: any) => {
                    if (!prev || !prev.events) return prev;
                    const updatedEvents = prev.events.map((e: any) => {
                        if (Number(e.id) === Number(eventId)) {
                            const change = action === 'joined' ? 1 : -1;
                            return { ...e, attendee_count: (e.attendee_count || 0) + change };
                        }
                        return e;
                    });
                    return { ...prev, events: updatedEvents };
                });
            }
        });

        onCleanup(() => {
            LegalEvent.unsubscribe(refresh);
            BalanceChangedEvent.unsubscribe(refresh);
            EventAttendanceChangedEvent.unsubscribe(refresh);
            cleanup();
        });
    });

    const rangeText = () => {
        const data = pageData();
        if (!data) return "Loading...";
        
        const formatDate = (d: string) => new Date(d).toLocaleDateString('en-UK', { month: 'short', day: 'numeric' });
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const start = new Date(data.startDate);
        const end = new Date(data.endDate);

        if (start.getTime() === today.getTime()) return `Today - ${formatDate(data.endDate)}`;
        
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (end.toDateString() === yesterday.toDateString()) return `${formatDate(data.startDate)} - Yesterday`;

        return `${formatDate(data.startDate)} - ${formatDate(data.endDate)}`;
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

    const WeeklyGridView = (props: { data: PageData | null | undefined }) => {
        const days = createMemo(() => {
            if (!props.data) return [];
            const start = new Date(props.data.startDate);
            const d = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(start);
                day.setDate(start.getDate() + i);
                d.push(day);
            }
            return d;
        });

        return (
            <div class="events-page-content weekly-mode liquid-container">
                <div class="week-grid-container">
                    <div class="time-gutter">
                        <div class="time-header-spacer" style="height: 60px;"></div>
                        <For each={Array.from({length: 24})}>{(_, i) => (
                            <div class="time-label"><span>{i()}:00</span></div>
                        )}</For>
                    </div>
                    <div class="day-columns">
                        <For each={days()}>
                            {(day) => (
                                <div class="day-column" classList={{ 'today': isToday(day) }}>
                                    <div class="day-header">
                                        <span class="day-name">{day.toLocaleDateString('en-UK', { weekday: 'short' })}</span>
                                        <span class="day-num">{day.getDate()}</span>
                                    </div>
                                    <div class="day-slots">
                                        <For each={Array.from({length: 24})}>{() => <div class="hour-slot"></div>}</For>
                                        <Show when={isToday(day)}>
                                            <div class="current-time-line" style={{ top: `${currentTimePosition()}%` }}>
                                                <div class="time-dot"></div>
                                            </div>
                                        </Show>
                                        <For each={props.data?.events.filter(e => new Date(e.start).toDateString() === day.toDateString()) || []}>
                                            {(event) => (
                                                <div 
                                                    class="grid-event" 
                                                    classList={{ 'canceled': event.is_canceled, 'past': new Date(event.end) < new Date() }}
                                                    style={getEventStyle(event)}
                                                    onClick={() => navigate(`/events/${event.id}${location.search}`)}
                                                >
                                                    <div class="event-time">{new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    <div class="event-title">{event.title}</div>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </div>
            </div>
        );
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
            <CalendarWidget 
                initialMode={viewMode() as CalendarViewMode} 
                onEventClick={(e) => navigate(`/events/${e.id}${location.search}`)} 
            />
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
                    <div class="liquid-container" style={{ "--liquid-padding": "0.4rem 0.75rem" }} {...{ paused: isTransitioning() } as any}>
                        <Show when={isAdmin()}>
                            <button class="admin-link-btn" title="Event Admin" onClick={() => navigate('/admin/events')}>
                                <span innerHTML={SETTINGS_SVG} />
                                <span class="btn-text">Admin</span>
                            </button>
                        </Show>
                        <div class="toggle-group-mini">
                            <button classList={{ active: viewMode() === 'list' }} onClick={() => setView('list')} title="List View"><span innerHTML={LIST_SVG} /></button>
                            <Show when={isDesktop()}>
                                <button classList={{ active: viewMode() === 'week' }} onClick={() => setView('week')} title="Week View"><span innerHTML={CALENDAR_TODAY_SVG} /></button>
                                <button classList={{ active: viewMode() === 'month' }} onClick={() => setView('month')} title="Month View"><span innerHTML={DASHBOARD_SVG} /></button>
                            </Show>
                        </div>
                    </div>
                </div>

                <div class="week-navigator">
                    <div class="liquid-container" style={{ "--liquid-padding": "0.4rem 1.25rem" }} {...{ paused: isTransitioning() } as any}>
                        <button class="nav-btn prev-week" title="Previous Page" onClick={() => setSearchParams({ page: page() - 1 })}>
                            <span innerHTML={ARROW_BACK_IOS_NEW_SVG} />
                        </button>
                        <div class="current-week-display">
                            <span id="page-range-text">{rangeText()}</span>
                        </div>
                        <button class="nav-btn next-week" title="Next Page" onClick={() => setSearchParams({ page: page() + 1 })}>
                            <span innerHTML={ARROW_FORWARD_IOS_SVG} />
                        </button>
                    </div>
                </div>

                <div class="today-control-wrapper">
                    <div class="liquid-container" style={{ "--liquid-padding": "0.4rem 0.75rem" }} {...{ paused: isTransitioning() } as any}>
                        <button 
                            class="today-btn" 
                            classList={{ disabled: page() === 0, 'spin-active': isRefreshing() }} 
                            title="Back to Today" 
                            onClick={() => {
                                if (page() === 0) refresh();
                                else setSearchParams({ page: 0 });
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
