import { createSignal, createResource, Show, For, createEffect } from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import { apiRequest } from "@/utils/api";
import { ADD_SVG, ARROW_BACK_IOS_NEW_SVG, ARROW_FORWARD_IOS_SVG } from "@/utils/icons";

export default function CalendarView() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = createSignal(new Date());
    const [viewMode, setViewMode] = createSignal<'month' | 'week'>('month');

    // Fetch events for the current view range
    const [events, { refetch }] = createResource(
        () => ({ date: currentDate(), mode: viewMode() }),
        async ({ date, mode }) => {
            // Calculate start/end based on viewMode
            const start = new Date(date);
            const end = new Date(date);
            
            if (mode === 'month') {
                start.setDate(1); // 1st of month
                start.setDate(start.getDate() - start.getDay()); // Start of first week (Sunday)
                end.setMonth(end.getMonth() + 1);
                end.setDate(0); // Last of month
                end.setDate(end.getDate() + (6 - end.getDay())); // End of last week
            } else {
                start.setDate(start.getDate() - start.getDay()); // Start of week
                end.setDate(start.getDate() + 6);
            }

            // Set times to min/max
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            const query = new URLSearchParams({
                search: '', // Fetch all
                showPast: 'true',
                limit: '1000' // Get plenty
            });
            
            // Using admin endpoint to see all events including drafts
            const res = await apiRequest('GET', `/api/admin/events?${query.toString()}`);
            const allEvents = res.events || [];
            
            // Filter client-side for the specific range to avoid complex API logic for now
            return allEvents.filter((e: any) => {
                const eStart = new Date(e.start);
                return eStart >= start && eStart <= end;
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
        let end = new Date(date);

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
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        let current = new Date(start);
        while (current <= end) {
            days.push(new Date(current));
            current.setDate(current.getDate() + 1);
        }
        return days;
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const isSameMonth = (date: Date) => {
        return date.getMonth() === currentDate().getMonth();
    };

    const getEventsForDay = (date: Date) => {
        const evs = events() || [];
        return evs.filter((e: any) => {
            const eDate = new Date(e.start);
            return eDate.getDate() === date.getDate() &&
                   eDate.getMonth() === date.getMonth() &&
                   eDate.getFullYear() === date.getFullYear();
        }).sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
    };

    return (
        <div class="calendar-container">
            <div class="calendar-header">
                <div class="calendar-controls">
                    <button class="icon-btn" onClick={() => changeDate(-1)} innerHTML={ARROW_BACK_IOS_NEW_SVG} />
                    <h2>
                        {currentDate().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button class="icon-btn" onClick={() => changeDate(1)} innerHTML={ARROW_FORWARD_IOS_SVG} />
                </div>
                
                <div class="view-toggles">
                    <button class={viewMode() === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>Month</button>
                    <button class={viewMode() === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>Week</button>
                </div>
            </div>

            <div class={`calendar-grid ${viewMode()}`}>
                <div class="weekdays-row">
                    <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>
                <div class="days-grid">
                    <For each={getDaysInView()}>
                        {(day) => (
                            <div 
                                class="calendar-day" 
                                classList={{ 
                                    'today': isToday(day),
                                    'other-month': !isSameMonth(day)
                                }}
                                onClick={() => navigate(`/admin/event/new?date=${day.toISOString()}`)}
                            >
                                <span class="day-number">{day.getDate()}</span>
                                <div class="day-events">
                                    <For each={getEventsForDay(day)}>
                                        {(event: any) => (
                                            <div 
                                                class={`event-chip status-${event.status || 'confirmed'}`}
                                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/event/${event.id}`); }}
                                                title={`${event.title} (${new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}
                                                draggable="true"
                                                onDragStart={(e) => {
                                                    e.dataTransfer?.setData('text/plain', JSON.stringify({ id: event.id, originStart: event.start }));
                                                }}
                                            >
                                                <span class="event-time">{new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                <span class="event-title">{event.title}</span>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </div>

            {/* Floating Action Button */}
            <button 
                class="fab-btn" 
                onClick={() => navigate('/admin/event/new')}
                title="Add Event"
                innerHTML={ADD_SVG}
            />
        </div>
    );
}
