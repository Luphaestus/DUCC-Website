import { createSignal, createResource, Show, For, onMount, onCleanup, createMemo, createEffect } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { 
    ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG, ADD_SVG, CLOSE_SVG,
    CONTENT_COPY_SVG, DELETE_SVG, EDIT_SVG,
    BLOCK_SVG, CHECK_SVG, CURRENCY_POUND_SVG
} from "@/utils/icons";
import { useNotifications } from "@/stores/notifications";
import { showConfirmModal } from "@/utils/modal";
import ContextMenu from "../components/ContextMenu";

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
    costs_released?: boolean;
}

interface CalendarWidgetProps {
    adminMode?: boolean;
    initialDate?: Date;
    initialMode?: CalendarViewMode;
    onEventClick?: (event: CalendarEvent) => void;
    onDayClick?: (date: Date) => void;
    // New props for external control
    viewMode?: CalendarViewMode;
    date?: Date;
    onDateChange?: (date: Date) => void;
    hideHeader?: boolean;
}

export default function CalendarWidget(props: CalendarWidgetProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { notify } = useNotifications();
    
    // Internal state used if props aren't provided
    const [internalDate, setInternalDate] = createSignal(props.initialDate || new Date());
    const [internalViewMode, setInternalViewMode] = createSignal<CalendarViewMode>(props.initialMode || (localStorage.getItem('cal_view_mode') as any) || 'week');
    
    const currentDate = () => props.date || internalDate();
    const setCurrentDate = (d: Date) => {
        if (props.onDateChange) props.onDateChange(d);
        else setInternalDate(d);
    };

    const viewMode = () => props.viewMode || internalViewMode();
    const setViewMode = (m: CalendarViewMode) => {
        setInternalViewMode(m);
        localStorage.setItem('cal_view_mode', m);
    };

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

    const snapToGrid = (date: Date, minutes = 15): Date => {
        const d = new Date(date);
        const m = d.getMinutes();
        const rounded = Math.round(m / minutes) * minutes;
        d.setMinutes(rounded, 0, 0);
        return d;
    };

    // --- Layout Logic ---

    const getProcessedEvents = (day: Date) => {
        const state = dragState();
        const dayStart = new Date(day); dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(day); dayEnd.setHours(23,59,59,999);

        let dayEvents = events()?.filter(e => {
            const isDragging = state?.type === 'move' && state?.originEvent?.id === e.id;
            if (isDragging) return false;

            const s = new Date(e.start);
            const en = new Date(e.end);
            // Overlap check: event starts before day ends AND ends after day starts
            return s <= dayEnd && en >= dayStart;
        }) || [];

        // If we are dragging an event and it's over THIS day, add it
        if (state?.type === 'move' && state.tempStart && state.originEvent) {
            if (state.tempStart.getDate() === day.getDate() && 
                state.tempStart.getMonth() === day.getMonth() && 
                state.tempStart.getFullYear() === day.getFullYear()) {
                
                dayEvents.push({
                    ...state.originEvent,
                    start: state.tempStart.toISOString(),
                    end: state.tempEnd!.toISOString()
                });
            }
        }

        // Map events to their day-local times for layout
        const localEvents = dayEvents.map(e => {
            const s = new Date(e.start);
            const en = new Date(e.end);
            return {
                ...e,
                // Local start/end for this column
                _localStart: s < dayStart ? dayStart : s,
                _localEnd: en > dayEnd ? dayEnd : en
            };
        });

        const sorted = [...localEvents].sort((a, b) => a._localStart.getTime() - b._localStart.getTime());
        
        const groups: any[][] = [];
        for (const event of sorted) {
            let placed = false;
            for (const group of groups) {
                if (group.some(e => {
                    return (event._localStart < e._localEnd && event._localEnd > e._localStart);
                })) {
                    group.push(event);
                    placed = true;
                    break;
                }
            }
            if (!placed) groups.push([event]);
        }

        const processed: { event: CalendarEvent; col: number; total: number; localStart: Date; localEnd: Date }[] = [];
        for (const group of groups) {
            const columns: any[][] = [];
            for (const event of group) {
                let colIdx = 0;
                while (columns[colIdx]?.some(e => {
                    return (event._localStart < e._localEnd && event._localEnd > e._localStart);
                })) {
                    colIdx++;
                }
                if (!columns[colIdx]) columns[colIdx] = [];
                columns[colIdx].push(event);
            }
            for (let i = 0; i < columns.length; i++) {
                for (const event of columns[i]) {
                    processed.push({ 
                        event, 
                        col: i, 
                        total: columns.length,
                        localStart: event._localStart,
                        localEnd: event._localEnd
                    });
                }
            }
        }
        return processed;
    };

    const getEventStyle = (event: CalendarEvent, col = 0, total = 1, localStart?: Date, localEnd?: Date) => {
        const start = localStart || new Date(event.start);
        const end = localEnd || new Date(event.end);
        
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const top = (startMinutes / 1440) * 100;
        
        let duration = (end.getTime() - start.getTime()) / (1000 * 60);
        if (duration < 30) duration = 30;
        const height = (duration / 1440) * 100;

        const width = 98 / total;
        const left = (col * width) + 1;

        return {
            top: `${top}%`,
            height: `${height}%`,
            left: `${left}%`,
            width: `${width}%`,
            "z-index": 5 + col
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

    const handleUpdateStatus = async (id: number, status: string) => {
        try {
            await apiRequest('PUT', `/api/admin/event/${id}`, { status });
            notify('Success', `Status updated to ${status}`, 'success');
            refetch();
        } catch (e: any) { notify('Error', e.message, 'error'); }
        setContextMenu(null);
    };

    const handleReleaseCosts = async (id: number) => {
        if (await showConfirmModal("Release Costs?", "This will calculate and finalize all finances for this event.")) {
            try {
                await apiRequest('POST', `/api/admin/events/${id}/release-costs`);
                notify('Success', 'Costs released!', 'success');
                refetch();
            } catch (e: any) { notify('Error', e.message, 'error'); }
        }
        setContextMenu(null);
    };

    return (
        <div class="calendar-widget-container" classList={{ 'admin-mode': props.adminMode }}>
            <Show when={!props.hideHeader}>
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
            </Show>

            <div class="calendar-body-wrapper">
                <Show when={viewMode() === 'week'}>
                    <div class="week-view-grid">
                        <div class="time-gutter">
                            <div class="time-header-spacer" style="height: 65px; border-bottom: 1px solid rgba(255,255,255,0.08);"></div>
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

                                            <For each={getProcessedEvents(day)}>
                                                {({ event, col, total, localStart, localEnd }) => {
                                                    const isDragging = dragState()?.type === 'move' && dragState()?.originEvent?.id === event.id;
                                                    const displayStart = isDragging && dragState()?.tempStart ? dragState()!.tempStart! : localStart;
                                                    const displayEnd = isDragging && dragState()?.tempEnd ? dragState()!.tempEnd! : localEnd;
                                                    const style = getEventStyle(event, col, total, displayStart, displayEnd);
                                                    
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
                                                                    <button class="mini-icon-btn" onClick={(e) => { e.stopPropagation(); copyEvent(event); }} title="Copy" innerHTML={CONTENT_COPY_SVG} />
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
                                        onClick={() => {
                                            if (props.onDayClick) props.onDayClick(day);
                                            else {
                                                setCurrentDate(day);
                                                setViewMode('week');
                                            }
                                        }}
                                    >
                                        <span class="day-number">{day.getDate()}</span>
                                        <div class="day-events-dots">
                                            <For each={events()?.filter(e => new Date(e.start).toDateString() === day.toDateString())}>
                                                {(e) => (
                                                    <div 
                                                        class={`event-bar status-${e.status}`} 
                                                        classList={{ 'canceled': e.is_canceled }}
                                                        title={e.title}
                                                        onClick={(ev) => {
                                                            ev.stopPropagation();
                                                            props.onEventClick?.(e);
                                                        }}
                                                        onContextMenu={(ev) => {
                                                            if (!props.adminMode) return;
                                                            ev.preventDefault();
                                                            ev.stopPropagation();
                                                            setContextMenu({ x: ev.clientX, y: ev.clientY, event: e });
                                                        }}
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

            <ContextMenu 
                isOpen={!!contextMenu()} 
                x={contextMenu()?.x || 0} 
                y={contextMenu()?.y || 0} 
                header={contextMenu()?.event.title}
                onClose={() => setContextMenu(null)}
            >
                <button onClick={() => navigate(`/admin/event/${contextMenu()!.event.id}`)}><span innerHTML={EDIT_SVG}/> Edit Details</button>
                <button onClick={() => copyEvent(contextMenu()!.event)}><span innerHTML={CONTENT_COPY_SVG}/> Copy Event</button>
                <div class="divider"></div>
                <Show when={contextMenu()?.event.status !== 'confirmed'}>
                    <button onClick={() => handleUpdateStatus(contextMenu()!.event.id, 'confirmed')}><span innerHTML={CHECK_SVG}/> Confirm/Release</button>
                </Show>
                <Show when={contextMenu()?.event.status !== 'pending'}>
                    <button onClick={() => handleUpdateStatus(contextMenu()!.event.id, 'pending')}><span innerHTML={BLOCK_SVG}/> Move to Draft</button>
                </Show>
                <Show when={!contextMenu()?.event.costs_released}>
                    <button onClick={() => handleReleaseCosts(contextMenu()!.event.id)}><span innerHTML={CURRENCY_POUND_SVG}/> Release Costs</button>
                </Show>
                <div class="divider"></div>
                <button class="delete" onClick={() => setContextMenu(null)}><span innerHTML={CLOSE_SVG}/> Close Menu</button>
            </ContextMenu>
        </div>
    );
}
