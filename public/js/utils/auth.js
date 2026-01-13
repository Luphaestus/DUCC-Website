import { ajaxGet } from './ajax.js';
import { switchView } from './view.js';
import { notify, NotificationTypes } from '/js/components/notification.js';

/**
 * Client-side authentication protection.
 */

/**
 * Verifies session status; redirects to login if unauthenticated.
 * @returns {Promise<boolean>}
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