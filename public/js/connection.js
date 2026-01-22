/**
 * connection.js
 * 
 * Monitors connectivity between the client and the backend server.
 * Provides real-time notifications when the connection is lost or restored,
 * and handles automatic view switching to a "no internet" state when necessary.
 */

import { notify, NotificationTypes } from '/js/components/notification.js';
import { ViewChangedEvent, switchView } from '/js/utils/view.js';

/** @type {boolean} Current server availability status */
let isServerConnected = true;

/** @type {Function|null} Handle to the current connectivity notification */
let currentNotification = null;

/** @type {number|null} Timestamp of the last successful health check */
let time_of_last_successful_check = null;

/** @type {number} Timestamp of the last route change */
let lastNavigationTime = 0;

/**
 * Updates the global connection state and alerts the user of changes.
 * If reconnection occurs while the error screen is visible, it reloads the current view.
 * 
 * @param {boolean} newStatus - The newly detected connection status.
 */
function updateConnectionStatus(newStatus) {
    if (isServerConnected === newStatus) {
        // Handle case where we are back online but the error screen was stuck
        if (newStatus) {
            const noConnectionView = document.getElementById('no-connection-view');
            if (noConnectionView && !noConnectionView.classList.contains('hidden')) {
                noConnectionView.classList.add('hidden');
                switchView(window.location.pathname, true);
            }
        }
        return;
    }

    // Dismiss existing toast
    if (currentNotification) currentNotification();
    isServerConnected = newStatus;

    if (isServerConnected) {
        currentNotification = notify('Connection Restored', 'You are reconnected.', NotificationTypes.SUCCESS, 5000);
        const noConnectionView = document.getElementById('no-connection-view');
        if (noConnectionView && !noConnectionView.classList.contains('hidden')) {
            noConnectionView.classList.add('hidden');
            // Force reload current view to fetch missing data
            switchView(window.location.pathname, true);
        }
    } else {
        currentNotification = notify('Connection Lost', 'Disconnected from server.', NotificationTypes.ERROR, 5000);
    }
}

/**
 * Explicitly reports a network failure.
 * Used by the AJAX module when a request times out or returns status 0.
 */
function reportConnectionFailure() {
    if (!isServerConnected) {
        if (currentNotification) currentNotification();
        currentNotification = notify('Connection Lost', 'Disconnected from server.', NotificationTypes.ERROR, 5000);
    } else {
        updateConnectionStatus(false);
    }

    // If navigation failed within 2 seconds of a request, show the full-screen error overlay
    if (Date.now() - lastNavigationTime < 2000) {
        const noConnectionView = document.getElementById('no-connection-view');
        if (noConnectionView) {
            noConnectionView.classList.remove('hidden');
        }
    }
}

/**
 * Explicitly reports a network success.
 * Updates the internal status and record timestamp.
 */
function reportConnectionSuccess() {
    updateConnectionStatus(true);
    time_of_last_successful_check = Date.now();
}

/**
 * Actively polls the server health endpoint.
 * Throttled to once every 10 seconds unless triggered by a critical failure.
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

// Background polling loop
setInterval(checkServerConnection, 1000);

document.addEventListener('DOMContentLoaded', () => {
    // Check connection on every navigation
    ViewChangedEvent.subscribe(checkServerConnection);
    ViewChangedEvent.subscribe(() => {
        lastNavigationTime = Date.now();
    });
});

export { isServerConnected, checkServerConnection, reportConnectionFailure, reportConnectionSuccess };