import { notify, NotificationTypes } from './misc/notification.js';
import { ViewChangedEvent } from './misc/view.js';

/**
 * Connection Monitor Module.
 * Periodically polls the server's health endpoint to detect if the user has lost connectivity.
 * Notifies the user via persistent toast notifications when the state changes.
 */

// --- State ---

/** @type {boolean} Tracks the current known state of the server connection */
let isServerConnected = true;
/** @type {Function|null} Handle to the currently displayed notification callback */
let currentNotification = null;
/** @type {number|null} Timestamp of the last success to prevent rapid-fire polling */
let time_of_last_successful_check = null;

// --- Helper Functions ---

/**
 * Updates the global connection state and triggers UI notifications.
 * @param {boolean} newStatus - The result of the latest health check.
 */
function updateConnectionStatus(newStatus) {
    // Only act on actual status changes to avoid spamming notifications
    if (isServerConnected === newStatus) {
        return;
    }

    // Dismiss existing toast if it exists
    if (currentNotification) {
        currentNotification();
    }

    isServerConnected = newStatus;

    if (isServerConnected) {
        // Recovery notification
        currentNotification = notify('Connection Restored', 'You are reconnected to the server.', NotificationTypes.SUCCESS, 5000);
    } else {
        // Failure notification (persistent warning)
        currentNotification = notify('Connection Lost', 'You have been disconnected from the server. Some features may not work.', NotificationTypes.ERROR, 5000);
    }
}

// --- Main Update Function ---

/**
 * Performs a lightweight GET request to /api/health.
 * Updates connection state based on response success.
 * Throttles requests to a minimum of 10s intervals if triggered manually.
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
        // Network errors (e.g. DNS failure, Timeout) imply the connection is lost
        updateConnectionStatus(false);
    }
}

// --- Initialization ---

// Set up background polling every 30 seconds
setInterval(checkServerConnection, 30000);

document.addEventListener('DOMContentLoaded', () => {
    // Proactively check connection on every SPA view change
    ViewChangedEvent.subscribe(() => {
        checkServerConnection();
    });
});



export { isServerConnected, checkServerConnection };