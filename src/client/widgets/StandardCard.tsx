import { useNavigate, useLocation } from "@solidjs/router";
import {
    FaSolidCheck, FaSolidLocationDot, FaSolidClock, FaSolidUsers, FaSolidPoundSign
} from 'solid-icons/fa';
import { Tag } from './Tag';
import { Show, For } from "solid-js";

export interface EventData {
    id: number;
    start: string | Date;
    end: string | Date;
    is_canceled: boolean;
    tags?: any[];
    is_offsite: boolean;
    image_url?: string;
    title: string;
    attendee_count?: number | string;
    max_attendees: number;
    enable_waitlist: boolean;
    upfront_cost: number;
    can_attend?: boolean;
    is_attending?: boolean;
    location?: string;
}

export function StandardCard(props: { event: EventData, paused?: boolean }) {
    const navigate = useNavigate();
    
    const startDate = () => new Date(props.event.start);
    const endDate = () => new Date(props.event.end);
    const isPast = () => endDate() < new Date();
    const isCanceled = () => props.event.is_canceled;
    const isCurrent = () => {
        const now = new Date();
        return now >= startDate() && now <= endDate() && !isCanceled();
    };

    const progress = () => {
        if (!isCurrent()) return 0;
        const now = new Date().getTime();
        const start = startDate().getTime();
        const end = endDate().getTime();
        return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    };

    const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const startTime = () => startDate().toLocaleTimeString('en-UK', timeOptions);
    const endTime = () => endDate().toLocaleTimeString('en-UK', timeOptions);

    const imageUrl = () => props.event.image_url || '/api/files/1/download?view=true';
    
    const count = () => props.event.attendee_count !== undefined ? Number(props.event.attendee_count) : 0;
    const max = () => props.event.max_attendees;
    const attendanceDisplay = () => max() > 0 ? `${count()}/${max()}` : `${count()}/∞`;
    const attendanceTitle = () => max() > 0 ? `${count()}/${max()} Attending` : `${count()} / Unlimited Attending`;

    const isFull = () => max() > 0 && count() >= max();
    const isWaitlistActive = () => isFull() && props.event.enable_waitlist;

    return (
        <div 
            class="liquid-container"
            classList={{
                'event-card': true,
                'past-event': isPast(),
                'canceled-event': isCanceled(),
                'in-progress': isCurrent(),
                'waitlist-active': isWaitlistActive(),
                'unavailable-event': props.event.can_attend === false && !props.event.is_attending
            }} 
            style={{ "--progress": `${progress()}%` }}
            onClick={() => navigate(`/events/${props.event.id}${location.search}`)} 
            role="button" 
            tabindex="0"
            {...{ paused: props.paused } as any}
        >
            <Show when={isCurrent()}>
                <div class="event-progress-bar">
                    <div class="progress-fill" style={{ width: `${progress()}%` }}></div>
                </div>
            </Show>
            <div class="event-image-container">
                <div class="event-image event-image-header" style={{ "--event-image-url": `url('${imageUrl()}')` }}></div>
                <div class="image-overlay"></div>
                <div class="event-image-content">
                    <div class="event-tags">
                        <Show when={props.event.is_offsite}>
                            <span class="badge primary small-badge mr-2">External Trip</span>
                        </Show>
                        <For each={props.event.tags || []}>
                            {(tag) => <Tag name={tag.name} color={tag.color} />}
                        </For>
                    </div>
                    <h3 class={`event-title-bold ${isCanceled() ? 'strikethrough error' : ''}`}>
                        {props.event.title || 'Untitled Event'}
                    </h3>
                </div>
            </div>

            <div class="event-card-content">
                <div class="event-info-block">
                    <div class="info-item time">
                        <FaSolidClock />
                        <span>{startTime()} - {endTime()}</span>
                    </div>
                    <div class="info-item location">
                        <FaSolidLocationDot />
                        <span>{props.event.location || 'Location TBD'}</span>
                    </div>
                    <Show when={props.event.upfront_cost > 0}>
                        <div class="info-item cost" title="Upfront Cost">
                            <FaSolidPoundSign />
                            <span>£{props.event.upfront_cost.toFixed(2)}</span>
                        </div>
                    </Show>
                </div>

                <div class="card-footer">
                    <div class="footer-left">
                        <div class="attendance-count" classList={{ highlight: isWaitlistActive() }} title={attendanceTitle()}>
                            <FaSolidUsers /> <span>{attendanceDisplay()}</span>
                        </div>
                        <Show when={props.event.is_attending}>
                            <div class="attendance-status">
                                <FaSolidCheck /> Attending
                            </div>
                        </Show>
                    </div>
                    <div class="footer-right">
                        <Show when={isCanceled()}>
                            <span class="status-badge error">Canceled</span>
                        </Show>
                        <Show when={!isCanceled() && isPast()}>
                            <span class="status-badge neutral">Unavailable</span>
                        </Show>
                        <Show when={!isCanceled() && !isPast() && isWaitlistActive()}>
                            <span class="status-badge warning">Waitlist</span>
                        </Show>
                        <Show when={!isCanceled() && !isPast() && !isWaitlistActive() && props.event.can_attend === false && !props.event.is_attending}>
                            <span class="status-badge neutral">Unavailable</span>
                        </Show>
                    </div>
                </div>
            </div>
        </div>
    );
}
