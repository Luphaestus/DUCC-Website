import { createSignal } from "solid-js";

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    title: string;
    message?: string;
    type: NotificationType;
    duration: number;
    caller?: string;
}

const [notifications, setNotifications] = createSignal<Notification[]>([]);

export function useNotifications() {
    const notify = (title: string, message?: string, type: NotificationType = 'info', duration: number = 5000, caller?: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        
        setNotifications(prev => {
            if (caller) {
                const existing = prev.find(n => n.caller === caller);
                if (existing) {
                    return prev.map(n => n.caller === caller ? { ...n, title, message, type, duration, id } : n);
                }
            }
            return [...prev, { id, title, message, type, duration, caller }];
        });

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }

        return id;
    };

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return { notifications, notify, removeNotification };
}
