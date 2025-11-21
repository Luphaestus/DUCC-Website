class NotificationTypes {
    static INFO = 'info';
    static SUCCESS = 'success';
    static WARNING = 'warning';
    static ERROR = 'error';
}

function closeNotification(notification) {
    notification.classList.remove('fade-in');
    const fadeOutListener = () => {
        notification.remove();
    };
    notification.addEventListener('animationend', fadeOutListener, { once: true });
    notification.classList.add('fade-out');
}

function notify(title, message, type = NotificationTypes.INFO, duration = 5000) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;

    const notification = document.createElement('div');
    notification.classList.add('notification', `notification-${type}`, 'fade-in');

    const notificationTitle = document.createElement('strong');
    notificationTitle.textContent = title;
    notification.appendChild(notificationTitle);

    const notificationMessage = document.createElement('p');
    notificationMessage.textContent = message;
    notification.appendChild(notificationMessage);

    notification.addEventListener('click', () => {
        closeNotification(notification);
    });

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        closeNotification(notification);
    }, duration);

    return () => {
        closeNotification(notification);
    };

}

export { notify, NotificationTypes };