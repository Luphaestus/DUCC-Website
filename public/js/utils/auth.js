/**
 * auth.js
 * 
 * Provides client-side authentication protection for routes that require a session.
 * Integrates with the SPA router to redirect unauthorized users.
 */

import { ajaxGet } from './ajax.js';
import { switchView } from './view.js';

/**
 * Checks the current authentication status with the server.
 * If the user is not authenticated, saves the current path for post-login redirect
 * and moves the application to the unauthorized/login view.
 * 
 * @returns {Promise<boolean>} - True if authenticated, false otherwise.
 */
export async function requireAuth() {
    try {
        const data = await ajaxGet('/api/auth/status', true);
        
        if (!data.authenticated) {
            sessionStorage.setItem('redirect_after_login', window.location.pathname + window.location.search);
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