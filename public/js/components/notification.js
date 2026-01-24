/**
 * notification.js
 * 
 * Provides a global toast-style notification system.
 * Supports updating existing notifications via a uniqueCaller ID.
 */

/**
 * notification severity levels.
 */
class NotificationTypes {
    static INFO = 'info';
    static SUCCESS = 'success';
    static WARNING = 'warning';
    static ERROR = 'error';
}

// Stores references to active notification timeouts and elements to allow updates
const activeCallers = new Map();

/**
 * Removes a notification element with a fade-out effect.
 * 
 * @param {HTMLElement} notification - The notification element to remove.
 */
function closeNotification(notification) {
    if (!notification || notification.classList.contains('fade-out')) return;
    
    // Cleanup reference if this notification was tracked
    const callerId = notification.dataset.caller;
    if (callerId && activeCallers.get(callerId)?.element === notification) {
        activeCallers.delete(callerId);
    }

    const fadeOutListener = () => {
        notification.remove();
    };
    notification.addEventListener('animationend', fadeOutListener, { once: true });
    
    // Fallback if animation fails
    setTimeout(() => { if (notification.parentNode) notification.remove(); }, 500);

    notification.classList.add('fade-out');
}

/**
 * Displays a new notification toast.
 * 
 * @param {string} title - Heading text for the notification.
 * @param {string} message - Detailed body text (optional).
 * @param {string} [type=NotificationTypes.INFO] - Severity level from NotificationTypes.
 * @param {number} [duration=5000] - Visibility time in milliseconds before auto-dismiss.
 * @param {string|null} [uniqueCaller=null] - ID to prevent duplicate toasts and allow updates.
 * @returns {Function} - A function that can be called to manually dismiss this specific notification.
 */
function notify(title, message, type = NotificationTypes.INFO, duration = 5000, uniqueCaller = null) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return () => {};

    let notification;

    // Check for existing notification from the same caller.
    if (uniqueCaller && activeCallers.has(uniqueCaller)) {
        const existing = activeCallers.get(uniqueCaller);
        notification = existing.element;
        clearTimeout(existing.timeout);
        
        notification.className = 'notification';
        notification.classList.add(`notification-${type}`);
    } else {
        notification = document.createElement('div');
        notification.classList.add('notification', `notification-${type}`);
        if (uniqueCaller) notification.dataset.caller = uniqueCaller;

        // Allow user to dismiss by clicking
        notification.addEventListener('click', () => {
            closeNotification(notification);
        });

        notificationContainer.appendChild(notification);
    }

    // Update content
    notification.innerHTML = `<strong>${title}</strong>${message ? `<p>${message}</p>` : ''}`;

    // Schedule automatic removal
    const timeout = setTimeout(() => {
        closeNotification(notification);
    }, duration);

    if (uniqueCaller) {
        activeCallers.set(uniqueCaller, {
            element: notification,
            timeout: timeout
        });
    }

    // Return handle for external dismissal
    return () => {
        clearTimeout(timeout);
        closeNotification(notification);
    };
}

export { notify, NotificationTypes };