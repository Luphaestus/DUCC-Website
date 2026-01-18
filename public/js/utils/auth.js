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
            switchView('/unauthorized');
            return false;
        }
        return true;
    } catch (error) {
        console.error("Auth check failed:", error);
        switchView('/unauthorized');
        return false;
    }
}