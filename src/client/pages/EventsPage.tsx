import { createSignal, createResource, For, Show, onMount, onCleanup, createMemo, createEffect } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import {
    ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG,
    REFRESH_SVG, SETTINGS_SVG
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

interface PageData {
    events: EventData[];
    startDate: string;
    endDate: string;
}

export default function EventsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [isRefreshing, setIsRefreshing] = createSignal(false);
    const [oldPageData, setOldData] = createSignal<PageData | null>(null);

    const page = () => {
        const p = searchParams.page;
        const pageStr = Array.isArray(p) ? p[0] : p;
        return parseInt(pageStr || '0');
    };

    const [pageData, { mutate, refetch }] = createResource(page, async (p, { value }) => {
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

    const getGroupedEvents = (data: PageData | null) => {
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

    const EventList = (props: { data: PageData | null }) => (
        <div class="events-page">
            <For each={getGroupedEvents(props.data)}>
                {(group) => (
                    <div class="day-group">
                        <div class="date-strip">
                            <span class="date-num">{group.date.getDate()}</span>
                            <div class="date-text-group">
                                <span class="day-name">{group.date.toLocaleDateString('en-UK', { weekday: 'long' })}</span>
                                <div class="date-line"></div>
                                <span class="month-name">{group.date.toLocaleDateString('en-UK', { month: 'short' })}</span>
                            </div>
                        </div>
                        <div class="day-events-grid">
                            <For each={group.events}>
                                {(event) => <StandardCard event={event} />}
                            </For>
                        </div>
                    </div>
                )}
            </For>
        </div>
    );

    return (
        <div id="events-view" class="view small-container">
            <div class="events-controls-modern">
                <div class="week-navigator glass-panel">
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

                <div class="controls-group glass-panel">
                    <Show when={isAdmin()}>
                        <button class="admin-link-btn" title="Event Admin" onClick={() => navigate('/admin/events')}>
                            <span innerHTML={SETTINGS_SVG} />
                            <span>Admin</span>
                        </button>
                    </Show>
                    
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
                        <span>Today</span>
                    </button>
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
        </div>
    );
}
