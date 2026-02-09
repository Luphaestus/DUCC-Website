// todo clean up
import { createSignal, createResource, Show, For, onMount, onCleanup, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG, ADD_SVG, CLOSE_SVG } from "@/utils/icons";
import { useNotifications } from "@/stores/notifications";

type ViewMode = 'month' | 'week';

interface CalendarEvent {
    id: number;
    title: string;
    start: string;
    end: string;
    status: string;
    location: string;
    difficulty_level: number;
}

export default function CalendarView() {
    const navigate = useNavigate();
    const { notify } = useNotifications();
    const [currentDate, setCurrentDate] = createSignal(new Date());
    const [viewMode, setViewMode] = createSignal<ViewMode>('week');
    const [dragState, setDragState] = createSignal<{
        type: 'create' | 'move' | 'resize';
        start?: Date;
        end?: Date;
        originEvent?: CalendarEvent;
        tempStart?: Date;
    } | null>(null);

    const [clipboard, setClipboard] = createSignal<CalendarEvent | null>(null);
    const [contextMenu, setContextMenu] = createSignal<{ x: number, y: number, event: CalendarEvent } | null>(null);

    // Fetch events
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
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday start or Sunday? Google uses local. Let's assume Sunday start for simplicity matching getDaysInView
                start.setDate(start.getDate() - start.getDay());
                end.setDate(start.getDate() + 6);
            }

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            const query = new URLSearchParams({
                search: '',
                showPast: 'true',
                limit: '500' 
            });
            
            const res = await apiRequest('GET', `/api/admin/events?${query.toString()}`);
            const allEvents = (res.events || []) as CalendarEvent[];
            
            return allEvents.filter(e => {
                const eStart = new Date(e.start);
                const eEnd = new Date(e.end);
                return eStart <= end && eEnd >= start;
            });
        }
    );

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
        const date = new Date(currentDate());
        const mode = viewMode();

        let start = new Date(date);
        
        if (mode === 'month') {
            start.setDate(1);
            start.setDate(start.getDate() - start.getDay()); 
        } else {
            start.setDate(start.getDate() - start.getDay());
        }
        start.setHours(0,0,0,0);

        const count = mode === 'month' ? 35 : 7; // 5 weeks or 1 week
        // Note: Month view might need 42 days (6 weeks) sometimes
        
        for (let i = 0; i < count; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    // --- Drag & Interaction Logic ---

    const snapToGrid = (date: Date, minutes = 10): Date => {
        const d = new Date(date);
        const m = d.getMinutes();
        const rounded = Math.round(m / minutes) * minutes;
        d.setMinutes(rounded, 0, 0);
        return d;
    };

    const getEventStyle = (event: CalendarEvent, dayStart: Date) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        
        // Calculate top offset (minutes from start of day)
        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const top = (startMinutes / 1440) * 100;
        
        // Calculate height
        let duration = (end.getTime() - start.getTime()) / (1000 * 60);
        if (duration < 30) duration = 30; // Min height
        const height = (duration / 1440) * 100;

        return {
            top: `${top}%`,
            height: `${height}%`,
            left: '2px',
            right: '2px'
        };
    };

    // Week View Grid Interactions
    let gridRef: HTMLDivElement | undefined;

    const handleGridMouseDown = (e: MouseEvent, day: Date) => {
        if (e.button !== 0) return; // Only left click
        if ((e.target as HTMLElement).closest('.calendar-event')) return; // Ignore if clicking event

        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percentage = y / rect.height;
        const minutes = percentage * 24 * 60;
        
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        start.setMinutes(minutes);
        const snappedStart = snapToGrid(start);
        
        // Initial end is start + 60m
        const end = new Date(snappedStart);
        end.setMinutes(end.getMinutes() + 60);

        setDragState({
            type: 'create',
            start: snappedStart,
            end: end
        });
    };

    const handleMouseMove = (e: MouseEvent) => {
        const state = dragState();
        if (!state) return;

        if (state.type === 'create') {
            // Find which day column we are over
            // Complex logic omitted for simplicity, assume we stay in same day column for creation or user drags vertically
            // For now, let's just update end time based on Y position relative to the START day element
            // Ideally we need to track the current target element
        }
    };

    // Since tracking global mouse move for grid dates is hard without refs to all columns,
    // we will implement "Click and Drag" within the column locally.

    const handleColumnMouseMove = (e: MouseEvent, day: Date) => {
        const state = dragState();
        if (!state || state.type !== 'create') return;
        
        // Only update if we are in the same day (simplification)
        if (state.start && state.start.getDate() === day.getDate()) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const y = e.clientY - rect.top;
            const percentage = y / rect.height;
            const minutes = percentage * 24 * 60;
            
            const current = new Date(day);
            current.setHours(0,0,0,0);
            current.setMinutes(minutes);
            const snapped = snapToGrid(current);
            
            if (snapped > state.start) {
                setDragState({ ...state, end: snapped });
            }
        }
    };

    const handleMouseUp = () => {
        const state = dragState();
        if (state) {
            if (state.type === 'create' && state.start && state.end) {
                // Navigate to create new event
                navigate(`/admin/event/new?start=${state.start.toISOString()}&end=${state.end.toISOString()}`);
            } else if (state.type === 'move' && state.originEvent && state.tempStart) {
                // Save move
                updateEventTime(state.originEvent.id, state.tempStart);
            }
            setDragState(null);
        }
    };

    const updateEventTime = async (id: number, newStart: Date) => {
        try {
            const ev = events()?.find(e => e.id === id);
            if (!ev) return;
            
            const duration = new Date(ev.end).getTime() - new Date(ev.start).getTime();
            const newEnd = new Date(newStart.getTime() + duration);

            // Optimistic UI
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

    const stagePreviousWeek = async () => {
        if (await showConfirmModal("Stage Previous Week?", "This will copy all events from last week to this week as 'pending' (staged).")) {
            try {
                const prev = new Date(currentDate());
                prev.setDate(prev.getDate() - 7);
                await apiRequest('POST', '/api/admin/events/duplicate-week', {
                    sourceDate: prev.toISOString(),
                    targetDate: currentDate().toISOString()
                });
                notify('Success', 'Previous week staged!', 'success');
                refetch();
            } catch (err: any) {
                notify('Error', err.message, 'error');
            }
        }
    };

    const [longPressTimer, setLongPressTimer] = createSignal<any>(null);

    const handleEventMouseDown = (e: MouseEvent, event: CalendarEvent) => {
        if (e.button !== 0) return; // Only left click for dragging
        e.stopPropagation();
        e.preventDefault();
        setDragState({
            type: 'move',
            originEvent: event,
            tempStart: new Date(event.start)
        });
    };

    const handleTouchStart = (e: TouchEvent, event: CalendarEvent) => {
        const touch = e.touches[0];
        const timer = setTimeout(() => {
            setContextMenu({ x: touch.clientX, y: touch.clientY, event });
            setLongPressTimer(null);
        }, 500); // 500ms for long press
        setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
        const timer = longPressTimer();
        if (timer) {
            clearTimeout(timer);
            setLongPressTimer(null);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            setContextMenu(null);
            setDragState(null);
        }
        if (e.key === 'c' && (e.ctrlKey || e.metaKey) && contextMenu()) {
            copyEvent(contextMenu()!.event);
        }
    };

    // --- Global Click to close context menu ---
    onMount(() => {
        const handleGlobalClick = () => setContextMenu(null);
        window.addEventListener('click', handleGlobalClick);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        onCleanup(() => {
            window.removeEventListener('click', handleGlobalClick);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
        });
    });

    // Helper for move drag
    const handleColumnMoveDrag = (e: MouseEvent, day: Date) => {
        const state = dragState();
        if (!state || state.type !== 'move') return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percentage = y / rect.height;
        const minutes = percentage * 24 * 60;
        
        const newStart = new Date(day);
        newStart.setHours(0,0,0,0);
        newStart.setMinutes(minutes);
        
        // Snap
        const snapped = snapToGrid(newStart);
        setDragState({ ...state, tempStart: snapped });
    };

    const copyEvent = (e: CalendarEvent) => {
        setClipboard(e);
        notify('Copied', 'Event copied to clipboard', 'success');
        setContextMenu(null);
    };

    const pasteEvent = async (day: Date, timeStr?: string) => {
        const clip = clipboard();
        if (!clip) return;

        // Calculate new times
        const duration = new Date(clip.end).getTime() - new Date(clip.start).getTime();
        const newStart = new Date(day);
        if (timeStr) {
            const [h, m] = timeStr.split(':').map(Number);
            newStart.setHours(h, m);
        } else {
            // Default to same time as original but on new day
            const orig = new Date(clip.start);
            newStart.setHours(orig.getHours(), orig.getMinutes());
        }
        
        const newEnd = new Date(newStart.getTime() + duration);

        try {
            await apiRequest('POST', '/api/admin/event', {
                ...clip,
                id: undefined,
                title: clip.title + ' (Copy)',
                start: newStart.toISOString(),
                end: newEnd.toISOString(),
                status: 'pending' // Default to draft
            });
            notify('Success', 'Event pasted', 'success');
            refetch();
        } catch (e: any) {
            notify('Error', e.message || 'Failed to paste', 'error');
        }
        setContextMenu(null);
    };

    return (
        <div class="calendar-container glass-panel">
            {/* Header */}
            <div class="calendar-header-toolbar">
                <div class="cal-controls">
                    <button class="icon-btn" onClick={() => changeDate(-1)}><span innerHTML={ARROW_BACK_IOS_NEW_SVG}/></button>
                    <button class="icon-btn" onClick={() => changeDate(1)}><span innerHTML={ARROW_FORWARD_IOS_SVG}/></button>
                    <h2 class="cal-title">
                        {currentDate().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
                <div class="cal-actions" style={{ gap: '0.5rem', display: 'flex' }}>
                    <Show when={viewMode() === 'week'}>
                        <button class="outline secondary" onClick={stagePreviousWeek}>Stage Prev Week</button>
                    </Show>
                    <Show when={clipboard()}>
                        <button class="primary" onClick={() => pasteEvent(new Date())}>Paste Event</button>
                    </Show>
                    <button class={viewMode() === 'month' ? 'primary' : 'outline'} style={{ "min-width": "80px" }} onClick={() => setViewMode('month')}>Month</button>
                    <button class={viewMode() === 'week' ? 'primary' : 'outline'} style={{ "min-width": "80px" }} onClick={() => setViewMode('week')}>Week</button>
                </div>
            </div>

            {/* Week View */}
            <Show when={viewMode() === 'week'}>
                <div class="week-view-grid">
                    {/* Time Gutter */}
                    <div class="time-gutter">
                        <For each={Array.from({length: 24})}>{(_, i) => (
                            <div class="time-label"><span>{i()}:00</span></div>
                        )}</For>
                    </div>

                    {/* Days */}
                    <For each={getDaysInView()}>
                        {(day) => (
                            <div class="day-column" 
                                classList={{ 'today': isToday(day) }}
                            >
                                <div class="day-header">
                                    <span class="day-name">{day.toLocaleDateString('en-UK', { weekday: 'short' })}</span>
                                    <span class="day-num">{day.getDate()}</span>
                                </div>
                                
                                <div class="day-slots"
                                    onMouseDown={(e) => handleGridMouseDown(e, day)}
                                    onMouseMove={(e) => {
                                        handleColumnMouseMove(e, day);
                                        handleColumnMoveDrag(e, day);
                                    }}
                                >
                                    <For each={Array.from({length: 24})}>{() => <div class="hour-slot"></div>}</For>
                                    
                                    {/* Render Events */}
                                    <For each={events()?.filter(e => {
                                        const s = new Date(e.start);
                                        return s.getDate() === day.getDate() && s.getMonth() === day.getMonth();
                                    })}>
                                        {(event) => {
                                            const isDragging = dragState()?.type === 'move' && dragState()?.originEvent?.id === event.id;
                                            // If dragging, show at temp pos
                                            const displayStart = isDragging && dragState()?.tempStart ? dragState()!.tempStart! : new Date(event.start);
                                            // Recalc style for dragging
                                            const style = getEventStyle({ ...event, start: displayStart.toISOString() }, day);
                                            
                                            return (
                                                <div 
                                                    class={`calendar-event status-${event.status}`}
                                                    style={style}
                                                    onMouseDown={(e) => handleEventMouseDown(e, event)}
                                                    onTouchStart={(e) => handleTouchStart(e, event)}
                                                    onTouchEnd={handleTouchEnd}
                                                    onContextMenu={(e) => {
                                                        e.preventDefault();
                                                        setContextMenu({ x: e.clientX, y: e.clientY, event });
                                                    }}
                                                >
                                                    <div class="ev-time">{displayStart.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                                    <div class="ev-title">{event.title}</div>
                                                    <div class="copy-btn" onClick={(e) => { e.stopPropagation(); copyEvent(event); }} title="Copy">
                                                        <span innerHTML={ADD_SVG} style="transform: rotate(45deg)"/>
                                                    </div>
                                                </div>
                                            );
                                        }}
                                    </For>

                                    {/* Render Ghost Event (Creating) */}
                                    <Show when={dragState()?.type === 'create' && dragState()?.start?.getDate() === day.getDate()}>
                                        <div class="calendar-event ghost-create" style={getEventStyle({
                                            id: 0, title: '(New Event)', status: 'draft', location: '', difficulty_level: 0,
                                            start: dragState()!.start!.toISOString(),
                                            end: dragState()!.end!.toISOString()
                                        }, day)}>
                                            <div class="ev-time">{dragState()!.start!.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                            <div class="ev-title">(New Event)</div>
                                        </div>
                                    </Show>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
            
            {/* Simple Month View (Fallback/Alt) */}
            <Show when={viewMode() === 'month'}>
                 <div class="month-view-grid">
                    <div class="weekdays-row">
                        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                    </div>
                    <div class="days-grid">
                        <For each={getDaysInView()}>
                            {(day) => (
                                <div class="month-day" 
                                    classList={{ 'today': isToday(day), 'other-month': day.getMonth() !== currentDate().getMonth() }}
                                    onClick={() => {
                                        setCurrentDate(day);
                                        setViewMode('week');
                                    }}
                                >
                                    <span class="day-number">{day.getDate()}</span>
                                    <div class="day-events-dots">
                                        <For each={events()?.filter(e => new Date(e.start).toDateString() === day.toDateString())}>
                                            {(e) => <div class={`event-dot status-${e.status}`} title={e.title}></div>}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                 </div>
            </Show>

            {/* Context Menu */}
            <Show when={contextMenu()}>
                <div class="context-menu" style={{ top: `${contextMenu()!.y}px`, left: `${contextMenu()!.x}px` }}>
                    <button onClick={() => copyEvent(contextMenu()!.event)}><span innerHTML={ADD_SVG}/> Copy</button>
                    <button class="delete" onClick={() => setContextMenu(null)}><span innerHTML={CLOSE_SVG}/> Close</button>
                </div>
            </Show>

            {/* Global Paste Button (if clipboard exists) */}
            <Show when={clipboard()}>
                <div class="clipboard-fab" onClick={() => pasteEvent(new Date())}>
                    Paste Copied Event
                </div>
            </Show>
        </div>
    );
}