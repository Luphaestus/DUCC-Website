import { useNotifications } from "../stores/notifications";

// This is a bridge to allow legacy code to still use notify()
// while we migrate everything to SolidJS components.

export const NotificationTypes = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

export function notify(title: string, message?: string, type: any = 'info', duration: number = 5000, caller?: string) {
    // We use the store's notify function
    const { notify: solidNotify, removeNotification } = useNotifications();
    const id = solidNotify(title, message, type, duration, caller);
    return () => removeNotification(id);
}
