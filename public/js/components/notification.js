/**
 * notification.js
 * 
 * Provides a global toast-style notification system.
 * Notifications are glassmorphic, stacked, and support automatic or manual dismissal.
 * Used for feedback on user actions (e.g. "Event Joined") and error reporting.
 */

/**
 * Standard notification severity levels.
 * Maps to CSS classes for specific color coding.
 */
class NotificationTypes {
    static INFO = 'info';
    static SUCCESS = 'success';
    static WARNING = 'warning';
    static ERROR = 'error';
}

/**
 * Initiates the dismissal animation for a notification element.
 * Removes the element from the DOM after the animation completes.
 * 
 * @param {HTMLElement} notification - The notification element to remove.
 */
function closeNotification(notification) {
    if (notification.classList.contains('fade-out')) return;
    
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
 * @returns {Function} - A function that can be called to manually dismiss this specific notification.
 */
function notify(title, message, type = NotificationTypes.INFO, duration = 5000) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;

    const notification = document.createElement('div');
    notification.classList.add('notification', `notification-${type}`);

    const notificationTitle = document.createElement('strong');
    notificationTitle.textContent = title;
    notification.appendChild(notificationTitle);

    if (message) {
        const notificationMessage = document.createElement('p');
        notificationMessage.textContent = message;
        notification.appendChild(notificationMessage);
    }

    // Allow user to dismiss by clicking anywhere on the toast
    notification.addEventListener('click', () => {
        closeNotification(notification);
    });

    notificationContainer.appendChild(notification);

    // Schedule automatic removal
    const autoCloseTimeout = setTimeout(() => {
        closeNotification(notification);
    }, duration);

    // Return handle for external dismissal
    return () => {
        clearTimeout(autoCloseTimeout);
        closeNotification(notification);
    };

}

export { notify, NotificationTypes };