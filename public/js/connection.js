import { notify, NotificationTypes } from '/js/components/notification.js';
import { ViewChangedEvent, switchView } from '/js/utils/view.js';

/**
 * Polls server health to monitor connectivity.
 * @module Connection
 */

let isServerConnected = true;
let currentNotification = null;
let time_of_last_successful_check = null;
let lastNavigationTime = 0;

/**
 * Update connection state and notify user.
 * @param {boolean} newStatus
 */
function updateConnectionStatus(newStatus) {
    if (isServerConnected === newStatus) {
        // Even if status hasn't changed, if we are back online and the error screen is up, hide it.
        if (newStatus) {
            const noConnectionView = document.getElementById('no-connection-view');
            if (noConnectionView && !noConnectionView.classList.contains('hidden')) {
                noConnectionView.classList.add('hidden');
                // Reload current view to retry data fetch
                switchView(window.location.pathname, true);
            }
        }
        return;
    }

    if (currentNotification) currentNotification();
    isServerConnected = newStatus;

    if (isServerConnected) {
        currentNotification = notify('Connection Restored', 'You are reconnected.', NotificationTypes.SUCCESS, 5000);
        const noConnectionView = document.getElementById('no-connection-view');
        if (noConnectionView && !noConnectionView.classList.contains('hidden')) {
            noConnectionView.classList.add('hidden');
            // Reload current view to retry data fetch
            switchView(window.location.pathname, true);
        }
    } else {
        currentNotification = notify('Connection Lost', 'Disconnected from server.', NotificationTypes.ERROR, 5000);
    }
}

/**
 * Report a connection failure (e.g. from a failed AJAX request).
 */
function reportConnectionFailure() {
    if (!isServerConnected) {
        if (currentNotification) currentNotification();
        currentNotification = notify('Connection Lost', 'Disconnected from server.', NotificationTypes.ERROR, 5000);
    } else {
        updateConnectionStatus(false);
    }

    // Check if we navigated recently (within 2 seconds)
    if (Date.now() - lastNavigationTime < 2000) {
        const noConnectionView = document.getElementById('no-connection-view');
        if (noConnectionView) {
            noConnectionView.classList.remove('hidden');
        }
    }
}

/**
 * Report a successful connection (e.g. from a successful AJAX request).
 */
function reportConnectionSuccess() {
    updateConnectionStatus(true);
    time_of_last_successful_check = Date.now();
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

setInterval(checkServerConnection, 1000);

document.addEventListener('DOMContentLoaded', () => {
    ViewChangedEvent.subscribe(checkServerConnection);
    ViewChangedEvent.subscribe(() => {
        lastNavigationTime = Date.now();
    });
});

export { isServerConnected, checkServerConnection, reportConnectionFailure, reportConnectionSuccess };