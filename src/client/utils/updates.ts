import { createSignal, onCleanup } from "solid-js";

/**
 * updates.ts
 * 
 * Client-side listener for real-time updates via SSE.
 */

type UpdateType = 
    | 'attendance_update' 
    | 'balance_update' 
    | 'event_update' 
    | 'admin_transaction_update'
    | 'stats_update'
    | 'swims_update'
    | 'upcoming_event';

interface UpdateEvent {
    type: UpdateType;
    data: any;
    timestamp: number;
}

const listeners = new Set<(event: UpdateEvent) => void>();

/**
 * Register a listener for real-time updates.
 */
export function onUpdate(callback: (event: UpdateEvent) => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
}

/**
 * Initialize SSE connection.
 */
export function initUpdates() {
    let eventSource: EventSource | null = null;
    let retryCount = 0;

    const connect = () => {
        if (eventSource) eventSource.close();

        eventSource = new EventSource('/api/updates');

        eventSource.onmessage = (e) => {
            try {
                const event: UpdateEvent = JSON.parse(e.data);
                listeners.forEach(l => l(event));
            } catch (err) {
                // Ignore parse errors from heartbeats
            }
        };

        eventSource.onerror = () => {
            eventSource?.close();
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            retryCount++;
            setTimeout(connect, delay);
        };

        eventSource.onopen = () => {
            retryCount = 0;
        };
    };

    connect();

    return () => eventSource?.close();
}
