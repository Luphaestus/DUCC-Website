import { notify, NotificationTypes } from './misc/notification.js';
import { ViewChangedEvent } from './misc/view.js';

/**
 * Polls server health to monitor connectivity.
 * @module Connection
 */

let isServerConnected = true;
let currentNotification = null;
let time_of_last_successful_check = null;

/**
 * Update connection state and notify user.
 * @param {boolean} newStatus
 */
function updateConnectionStatus(newStatus) {
    if (isServerConnected === newStatus) return;

    if (currentNotification) currentNotification();
    isServerConnected = newStatus;

    if (isServerConnected) {
        currentNotification = notify('Connection Restored', 'You are reconnected.', NotificationTypes.SUCCESS, 5000);
    } else {
        currentNotification = notify('Connection Lost', 'Disconnected from server.', NotificationTypes.ERROR, 5000);
    }
}

/**
 * Verify server availability.
 */
async function checkServerConnection() {
    if (time_of_last_successful_check && Date.now() - time_of_last_successful_check < 10000) return;

    try {
        const response = await fetch('/api/health');
        updateConnectionStatus(response.ok);
        if (response.ok) time_of_last_successful_check = Date.now();
    } catch (error) {
        updateConnectionStatus(false);
    }
}

setInterval(checkServerConnection, 30000);

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(checkServerConnection);
});

export { isServerConnected, checkServerConnection };