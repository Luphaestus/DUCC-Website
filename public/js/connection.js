/**
 * connection.js
 * 
 * Monitors connectivity between the client and the backend server.
 * Provides real-time notifications when the connection is lost or restored,
 * and handles automatic view switching to a "no internet" state when necessary.
 */

import { notify, NotificationTypes } from '/js/components/notification.js';
import { ViewChangedEvent, switchView, isCurrentPath } from '/js/utils/view.js';
import { getPreviousPath } from '/js/utils/history.js';
import { ajaxGet } from '/js/utils/ajax.js';

let isServerConnected = true;
let currentNotification = null;
let reconnectInterval = null;

/**
 * Updates the global connection state and alerts the user of changes.
 * If reconnection occurs while the error screen is visible, it reloads the current view.
 * 
 * @param {boolean|null} newStatus - The newly detected connection status.
 */
async function updateConnectionStatus(newStatus) {
    if (newStatus === null) {
        ajaxGet('/api/health', false).catch();
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
        
        if (isCurrentPath('/no-internet')) {
            const prev = getPreviousPath();
            switchView(prev || '/home');
        } else {
            switchView(window.location.pathname, true);
        }
    } else {
        if (!reconnectInterval) {
            reconnectInterval = setInterval(() => {
                updateConnectionStatus(null);
            }, 500);
        }

        currentNotification = notify('Connection Lost', 'Disconnected from server.', NotificationTypes.ERROR, 10000);
        switchView('/no-internet');
    }
}

document.addEventListener('DOMContentLoaded', () => {
   ViewChangedEvent.subscribe(path => {
        if (path.viewId === "no-connection") return;
        updateConnectionStatus(null);
    });
});

export { isServerConnected, updateConnectionStatus };