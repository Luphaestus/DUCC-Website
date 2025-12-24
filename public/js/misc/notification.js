/**
 * Notification Module.
 * Provides a toast-style notification system for the frontend.
 * Notifications automatically fade out after a set duration and can be dismissed manually by clicking.
 */

/**
 * Standard notification severity levels.
 */
class NotificationTypes {
    static INFO = 'info';
    static SUCCESS = 'success';
    static WARNING = 'warning';
    static ERROR = 'error';
}

/**
 * Helper to remove a notification element from the DOM with a fade-out animation.
 * @param {HTMLElement} notification - The element to remove.
 */
function closeNotification(notification) {
    notification.classList.remove('fade-in');
    
    // Wait for the CSS fade-out animation to finish before removing from DOM
    const fadeOutListener = () => {
        notification.remove();
    };
    notification.addEventListener('animationend', fadeOutListener, { once: true });
    
    notification.classList.add('fade-out');
}

/**
 * Creates and displays a new notification.
 * @param {string} title - Human-readable title.
 * @param {string} message - Human-readable detail message.
 * @param {string} type - Severity type from NotificationTypes.
 * @param {number} duration - Time in ms before automatic dismissal (default 5s).
 * @returns {Function} A function that can be called to manually dismiss this specific notification.
 */
function notify(title, message, type = NotificationTypes.INFO, duration = 5000) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;

    // Create the notification card
    const notification = document.createElement('div');
    notification.classList.add('notification', `notification-${type}`, 'fade-in');

    const notificationTitle = document.createElement('strong');
    notificationTitle.textContent = title;
    notification.appendChild(notificationTitle);

    const notificationMessage = document.createElement('p');
    notificationMessage.textContent = message;
    notification.appendChild(notificationMessage);

    // Allow manual dismissal on click
    notification.addEventListener('click', () => {
        closeNotification(notification);
    });

    notificationContainer.appendChild(notification);

    // Setup automatic dismissal
    const autoCloseTimeout = setTimeout(() => {
        closeNotification(notification);
    }, duration);

    // Return a handle to programmatically close it
    return () => {
        clearTimeout(autoCloseTimeout);
        closeNotification(notification);
    };

}

export { notify, NotificationTypes };