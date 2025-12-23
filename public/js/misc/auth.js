import { ajaxGet } from './ajax.js';
import { switchView } from './view.js';
import { notify, NotificationTypes } from './notification.js';

/**
 * Checks if the user is authenticated.
 * If not, redirects to the login page and displays a notification.
 * @returns {Promise<boolean>} True if authenticated, false otherwise.
 */
export async function requireAuth() {
    try {
        const data = await ajaxGet('/api/auth/status');
        if (!data.authenticated) {
            notify('Access Denied', 'You need to log in to access that page', NotificationTypes.WARNING);
            switchView('/login');
            return false;
        }
        return true;
    } catch (error) {
        console.error("Auth check failed:", error);
        notify('Error', 'Failed to verify authentication status.', NotificationTypes.ERROR);
        switchView('/login');
        return false;
    }
}
