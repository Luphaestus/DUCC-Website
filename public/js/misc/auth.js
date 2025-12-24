import { ajaxGet } from './ajax.js';
import { switchView } from './view.js';
import { notify, NotificationTypes } from './notification.js';

/**
 * Authentication Helper.
 * Provides client-side protection for routes that require an active session.
 */

/**
 * Checks if the user is authenticated by calling the server status endpoint.
 * If the user is NOT authenticated:
 * 1. A warning notification is shown.
 * 2. The SPA view is switched to '/login'.
 * 
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
        // Error usually implies server is down or network issues
        notify('Error', 'Failed to verify authentication status.', NotificationTypes.ERROR);
        switchView('/login');
        return false;
    }
}
