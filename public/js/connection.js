import { notify, NotificationTypes } from './misc/notification.js';

let isServerConnected = true;

let currentNotification = null;

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
        currentNotification = notify('Connection Lost', 'You have been disconnected from the server.', NotificationTypes.ERROR, 5000);
    }
}

let time_of_last_successful_check = null;

async function checkServerConnection() {
    if (time_of_last_successful_check && Date.now() - time_of_last_successful_check < 500) {
        return;
    }

    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            updateConnectionStatus(true);
            time_of_last_successful_check = Date.now();
        } else {
            updateConnectionStatus(false);
        }
    } catch (error) {
        updateConnectionStatus(false);
    }
}

setInterval(checkServerConnection, 5000);

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkServerConnection, 1000);
});

export { isServerConnected, checkServerConnection };