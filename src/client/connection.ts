/**
 * connection.js
 * 
 * Monitors connectivity between the client and the backend server.
 * Provides real-time notifications when the connection is lost or restored,
 * and handles automatic view switching to a "no internet" state when necessary.
 */

import { notify, NotificationTypes } from '@/components/notification';
import { ViewChangedEvent, switchView, isCurrentPath } from '@/utils/view';
import { getPreviousPath } from '@/utils/history';
import { apiRequest } from '@/utils/api';
import { NoInternetEvent } from '@/utils/events/events';

let isServerConnected = true;
let currentNotification: (() => void) | null = null;
let reconnectInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Updates the global connection state and alerts the user of changes.
 * If reconnection occurs while the error screen is visible, it reloads the current view.
 * 
 * @param {boolean|null} newStatus - The newly detected connection status.
 */
async function updateConnectionStatus(newStatus: boolean | null): Promise<void> {
    if (newStatus === null) {
        apiRequest('GET', '/api/health', false, true).catch();
        return;
    }        

    if (newStatus === isServerConnected) return;

    if (currentNotification) currentNotification();
    isServerConnected = newStatus;

    if (isServerConnected) {
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        currentNotification = notify('Connection Restored', 'You are reconnected.', NotificationTypes.SUCCESS, 5000);
        NoInternetEvent.notify();
    } else {
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                updateConnectionStatus(null);
            }, 500);
        }

        currentNotification = notify('Connection Lost', 'Disconnected from server.', NotificationTypes.ERROR, 10000);
        NoInternetEvent.notify();
    }
}

document.addEventListener('DOMContentLoaded', () => {
   ViewChangedEvent.subscribe(path => {
        if (path.viewId === "no-connection") return;
        // Break synchronous recursion chain
        setTimeout(() => {
            updateConnectionStatus(null);
        }, 0);
    });
});

export { isServerConnected, updateConnectionStatus };