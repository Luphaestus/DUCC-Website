import { notify, NotificationTypes } from './misc/notification.js';
import { ViewChangedEvent } from './misc/view.js';

// --- State ---

let isServerConnected = true;
let currentNotification = null;
let time_of_last_successful_check = null;

// --- Helper Functions ---

/**
 * Updates the connection status and notifies the user of changes.
 * @param {boolean} newStatus - The new server connection status.
 */
function updateConnectionStatus(newStatus) {
    if (isServerConnected === newStatus) {
        return;
    }
    if (currentNotification) {
        currentNotification();
    }
    isServerConnected = newStatus;
    if (isServerConnected) {
        currentNotification = notify('Connection Restored', 'You are reconnected to the server.', NotificationTypes.SUCCESS, 5000);
    } else {
        currentNotification = notify('Connection Lost', 'You have been disconnected from the server. The page may function incorrectly.', NotificationTypes.ERROR, 5000);
    }
}

// --- Main Update Function ---

/**
 * Checks the server connection by fetching the health endpoint.
 * Throttles requests to once every 10000ms.
 * @returns {Promise<void>}
 */
async function checkServerConnection() {
    if (time_of_last_successful_check && Date.now() - time_of_last_successful_check < 10000) {
        return;
    }

    try {
        const response = await fetch('/api/health');
        updateConnectionStatus(response.ok);
        if (response.ok) {
            time_of_last_successful_check = Date.now();
        }
    } catch (error) {
        updateConnectionStatus(false);
    }
}

// --- Initialization ---

setInterval(checkServerConnection, 30000);

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(() => {
        checkServerConnection();
    });
});



export { isServerConnected, checkServerConnection };