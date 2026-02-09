import { createSignal, createResource, Show, For, onMount, onCleanup, createMemo, createEffect } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { 
    ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG, ADD_SVG, CLOSE_SVG,
    CONTENT_COPY_SVG, DELETE_SVG, EDIT_SVG, PUBLIC_SVG, VISIBILITY_OFF_SVG
} from "@/utils/icons";
import { useNotifications } from "@/stores/notifications";
import { showConfirmModal } from "@/utils/modal";

export type CalendarViewMode = 'month' | 'week';

interface CalendarEvent {
    id: number;
    title: string;
    start: string;
    end: string;
    status: string;
    location: string;
    difficulty_level: number;
    is_canceled?: boolean;
}

interface CalendarWidgetProps {
    adminMode?: boolean;
    initialDate?: Date;
    initialMode?: CalendarViewMode;
    onEventClick?: (event: CalendarEvent) => void;
}

export default function CalendarWidget(props: CalendarWidgetProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { notify } = useNotifications();
    
    const [currentDate, setCurrentDate] = createSignal(props.initialDate || new Date());
    const [viewMode, setViewMode] = createSignal<CalendarViewMode>(props.initialMode || (localStorage.getItem('cal_view_mode') as any) || 'week');
    const [now, setNow] = createSignal(new Date());
    
    const [dragState, setDragState] = createSignal<{
        type: 'create' | 'move';
        start?: Date;
        end?: Date;
        originEvent?: CalendarEvent;
        tempStart?: Date;
        tempEnd?: Date;
    } | null>(null);

    const [clipboard, setClipboard] = createSignal<CalendarEvent | null>(null);
    const [contextMenu, setContextMenu] = createSignal<{ x: number, y: number, event: CalendarEvent } | null>(null);

    // Persist view mode
    createEffect(() => {
        localStorage.setItem('cal_view_mode', viewMode());
    });

    // Update 'now' for the live line
    onMount(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        onCleanup(() => clearInterval(timer));
    });

    // Data Fetching
    const [events, { refetch, mutate }] = createResource(
        () => ({ date: currentDate(), mode: viewMode() }),
        async ({ date, mode }) => {
            const start = new Date(date);
            const end = new Date(date);
            
            if (mode === 'month') {
                start.setDate(1);
                start.setDate(start.getDate() - start.getDay());
                end.setMonth(end.getMonth() + 1);
                end.setDate(0);
                end.setDate(end.getDate() + (6 - end.getDay()));
            } else {
                start.setDate(start.getDate() - start.getDay());
                end.setDate(start.getDate() + 6);
            }

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            const endpoint = props.adminMode ? '/api/admin/events' : '/api/events/paged/0'; // Simplified for widget
            // Note: If normal view needs specific paging, we might need to adjust props
            
            const query = new URLSearchParams({
                search: '',
                showPast: 'true',
                limit: '500' 
            });
            
            const res = await apiRequest('GET', `${endpoint}?${query.toString()}`);
            let allEvents = (props.adminMode ? res.events : res.events) as CalendarEvent[];
            
            return allEvents.filter(e => {
                const eStart = new Date(e.start);
                const eEnd = new Date(e.end);
                return eStart <= end && eEnd >= start;
            });
        }
    );

    // Navigation
    const changeDate = (delta: number) => {
        const newDate = new Date(currentDate());
        if (viewMode() === 'month') {
            newDate.setMonth(newDate.getMonth() + delta);
        } else {
            newDate.setDate(newDate.getDate() + (delta * 7));
        }
        setCurrentDate(newDate);
    };

    const getDaysInView = () => {
        const days = [];
        const start = new Date(currentDate());
        const mode = viewMode();

        if (mode === 'month') {
            start.setDate(1);
            start.setDate(start.getDate() - start.getDay()); 
        } else {
            start.setDate(start.getDate() - start.getDay());
        }
        start.setHours(0,0,0,0);

        const count = mode === 'month' ? 35 : 7; 
        for (let i = 0; i < count; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const isToday = (date: Date) => {
        const t = new Date();
        return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
    };

    const currentTimePosition = () => {
        const d = now();
        return ((d.getHours() * 60 + d.getMinutes()) / 1440) * 100;
    };

    // Styling
    const snapToGrid = (date: Date, minutes = 15): Date => {
        const d = new Date(date);
        const m = d.getMinutes();
        const rounded = Math.round(m / minutes) * minutes;
        d.setMinutes(rounded, 0, 0);
        return d;
    };

    const getEventStyle = (event: CalendarEvent) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const top = (startMinutes / 1440) * 100;
        let duration = (end.getTime() - start.getTime()) / (1000 * 60);
        if (duration < 30) duration = 30;
        const height = (duration / 1440) * 100;

        return {
            top: `${top}%`,
            height: `${height}%`,
            left: '2px',
            right: '2px'
        };
    };

    // --- Admin Interactions ---

    const handleGridMouseDown = (e: MouseEvent, day: Date) => {
        if (!props.adminMode || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.calendar-event')) return;

        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const snappedStart = snapToGrid(new Date(day.getTime() + (y / rect.height) * 86400000));
        
        const end = new Date(snappedStart.getTime() + 3600000); // +1h

        setDragState({ type: 'create', start: snappedStart, end: end });
    };

    const handleEventMouseDown = (e: MouseEvent, event: CalendarEvent) => {
        if (!props.adminMode || e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        setDragState({
            type: 'move',
            originEvent: event,
            tempStart: new Date(event.start),
            tempEnd: new Date(event.end)
        });
    };

    const handleMouseMove = (e: MouseEvent, day: Date) => {
        const state = dragState();
        if (!state) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const currentPosDate = snapToGrid(new Date(day.getTime() + (y / rect.height) * 86400000));

        if (state.type === 'create') {
            if (currentPosDate > state.start!) {
                setDragState({ ...state, end: currentPosDate });
            }
        } else if (state.type === 'move' && state.originEvent) {
            const duration = new Date(state.originEvent.end).getTime() - new Date(state.originEvent.start).getTime();
            const newStart = currentPosDate;
            const newEnd = new Date(newStart.getTime() + duration);
            setDragState({ ...state, tempStart: newStart, tempEnd: newEnd });
        }
    };

    const handleMouseUp = async () => {
        const state = dragState();
        if (!state) return;

        if (state.type === 'create' && state.start && state.end) {
            navigate(`/admin/event/new?start=${state.start.toISOString()}&end=${state.end.toISOString()}`);
        } else if (state.type === 'move' && state.originEvent && state.tempStart) {
            await updateEventTime(state.originEvent.id, state.tempStart, state.tempEnd!);
        }
        setDragState(null);
    };

    const updateEventTime = async (id: number, newStart: Date, newEnd: Date) => {
        try {
            mutate((prev) => prev?.map(e => e.id === id ? { ...e, start: newStart.toISOString(), end: newEnd.toISOString() } : e));
            await apiRequest('PUT', `/api/admin/event/${id}`, {
                start: newStart.toISOString(),
                end: newEnd.toISOString()
            });
            notify('Success', 'Event moved', 'success');
        } catch (e) {
            notify('Error', 'Failed to move event', 'error');
            refetch();
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setContextMenu(null);
            setDragState(null);
        }
    };

    onMount(() => {
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        onCleanup(() => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
        });
    });

    const copyEvent = (e: CalendarEvent) => {
        setClipboard(e);
        notify('Copied', 'Event copied', 'success');
        setContextMenu(null);
    };

    const pasteEvent = async (day: Date) => {
        const clip = clipboard();
        if (!clip) return;
        const duration = new Date(clip.end).getTime() - new Date(clip.start).getTime();
        const orig = new Date(clip.start);
        const newStart = new Date(day);
        newStart.setHours(orig.getHours(), orig.getMinutes());
        const newEnd = new Date(newStart.getTime() + duration);

        try {
            await apiRequest('POST', '/api/admin/event', {
                ...clip, id: undefined, title: clip.title + ' (Copy)',
                start: newStart.toISOString(), end: newEnd.toISOString(), status: 'pending'
            });
            notify('Success', 'Event pasted', 'success');
            refetch();
        } catch (e: any) { notify('Error', e.message, 'error'); }
    };

    return (
        <div class="calendar-widget-container" classList={{ 'admin-mode': props.adminMode }}>
            <div class="calendar-header-toolbar">
                <div class="cal-controls">
                    <button class="icon-btn" onClick={() => changeDate(-1)}><span innerHTML={ARROW_BACK_IOS_NEW_SVG}/></button>
                    <button class="icon-btn" onClick={() => changeDate(1)}><span innerHTML={ARROW_FORWARD_IOS_SVG}/></button>
                    <h2 class="cal-title">
                        {currentDate().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                <div class="cal-actions">
                    <Show when={clipboard()}>
                        <button class="small-btn primary mr-2" onClick={() => pasteEvent(new Date())}>Paste</button>
                    </Show>
                    <div class="toggle-group liquid-container" style={{ "--liquid-padding": "4px", "--liquid-border-radius": "100px" }}>
                        <button class={`tab-btn ${viewMode() === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Week</button>
                        <button class={`tab-btn ${viewMode() === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Month</button>
                    </div>
                </div>
            </div>

            <div class="calendar-body-wrapper">
                <Show when={viewMode() === 'week'}>
                    <div class="week-view-grid">
                        <div class="time-gutter">
                            <For each={Array.from({length: 24})}>{(_, i) => (
                                <div class="time-label"><span>{i()}:00</span></div>
                            )}</For>
                        </div>

                        <div class="day-columns">
                            <For each={getDaysInView()}>
                                {(day) => (
                                    <div class="day-column" classList={{ 'today': isToday(day) }}>
                                        <div class="day-header">
                                            <span class="day-name">{day.toLocaleDateString('en-UK', { weekday: 'short' })}</span>
                                            <span class="day-num">{day.getDate()}</span>
                                        </div>
                                        
                                        <div class="day-slots"
                                            onMouseDown={(e) => handleGridMouseDown(e, day)}
                                            onMouseMove={(e) => handleMouseMove(e, day)}
                                        >
                                            <For each={Array.from({length: 24})}>{() => <div class="hour-slot"></div>}</For>
                                            
                                            <Show when={isToday(day)}>
                                                <div class="current-time-line" style={{ top: `${currentTimePosition()}%` }}>
                                                    <div class="time-dot"></div>
                                                </div>
                                            </Show>

                                            <For each={events()?.filter(e => {
                                                const s = new Date(e.start);
                                                return s.getDate() === day.getDate() && s.getMonth() === day.getMonth();
                                            })}>
                                                {(event) => {
                                                    const isDragging = dragState()?.type === 'move' && dragState()?.originEvent?.id === event.id;
                                                    const displayStart = isDragging && dragState()?.tempStart ? dragState()!.tempStart! : new Date(event.start);
                                                    const displayEnd = isDragging && dragState()?.tempEnd ? dragState()!.tempEnd! : new Date(event.end);
                                                    const style = getEventStyle({ ...event, start: displayStart.toISOString(), end: displayEnd.toISOString() });
                                                    
                                                    return (
                                                        <div 
                                                            class={`calendar-event status-${event.status}`}
                                                            classList={{ 'is-dragging': isDragging, 'canceled': event.is_canceled, 'past': new Date(event.end) < now() }}
                                                            style={style}
                                                            onMouseDown={(e) => handleEventMouseDown(e, event)}
                                                            onClick={() => props.onEventClick ? props.onEventClick(event) : navigate(`/events/${event.id}`)}
                                                            onContextMenu={(e) => {
                                                                if (!props.adminMode) return;
                                                                e.preventDefault();
                                                                setContextMenu({ x: e.clientX, y: e.clientY, event });
                                                            }}
                                                        >
                                                            <div class="ev-time">{displayStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                                            <div class="ev-title">{event.title}</div>
                                                            <Show when={props.adminMode}>
                                                                <div class="ev-actions-overlay">
                                                                    <button class="mini-icon-btn" onClick={(e) => { e.stopPropagation(); copyEvent(event); }} title="Copy">{CONTENT_COPY_SVG}</button>
                                                                </div>
                                                            </Show>
                                                        </div>
                                                    );
                                                }}
                                            </For>

                                            <Show when={dragState()?.type === 'create' && dragState()?.start?.toDateString() === day.toDateString()}>
                                                <div class="calendar-event ghost-create" style={getEventStyle({
                                                    id: 0, title: '(New Event)', status: 'draft', location: '', difficulty_level: 0,
                                                    start: dragState()!.start!.toISOString(),
                                                    end: dragState()!.end!.toISOString()
                                                })}>
                                                    <div class="ev-title">(New Event)</div>
                                                </div>
                                            </Show>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </Show>

                <Show when={viewMode() === 'month'}>
                    <div class="month-view-grid">
                        <div class="weekdays-row">
                            <For each={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']}>{(d) => <span>{d}</span>}</For>
                        </div>
                        <div class="days-grid">
                            <For each={getDaysInView()}>
                                {(day) => (
                                    <div class="month-day" 
                                        classList={{ 'today': isToday(day), 'other-month': day.getMonth() !== currentDate().getMonth() }}
                                        onClick={() => { setCurrentDate(day); setViewMode('week'); }}
                                    >
                                        <span class="day-number">{day.getDate()}</span>
                                        <div class="day-events-dots">
                                            <For each={events()?.filter(e => new Date(e.start).toDateString() === day.toDateString())}>
                                                {(e) => (
                                                    <div 
                                                        class={`event-bar status-${e.status}`} 
                                                        classList={{ 'canceled': e.is_canceled }}
                                                        title={e.title}
                                                    >
                                                        {e.title}
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </Show>
            </div>

            <Show when={contextMenu()}>
                <div class="context-menu glass-panel" style={{ top: `${contextMenu()!.y}px`, left: `${contextMenu()!.x}px` }}>
                    <div class="cm-header">{contextMenu()!.event.title}</div>
                    <button onClick={() => navigate(`/admin/event/${contextMenu()!.event.id}`)}><span innerHTML={EDIT_SVG}/> Edit</button>
                    <button onClick={() => copyEvent(contextMenu()!.event)}><span innerHTML={CONTENT_COPY_SVG}/> Copy</button>
                    <div class="divider"></div>
                    <button class="delete" onClick={() => setContextMenu(null)}><span innerHTML={CLOSE_SVG}/> Close</button>
                </div>
            </Show>
        </div>
    );
}
