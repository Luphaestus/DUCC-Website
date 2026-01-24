/**
 * auth.js
 * 
 * Provides client-side authentication protection for routes that require a session.
 */

import { apiRequest } from './api.js';
import { switchView } from './view.js';

/**
 * Checks the current authentication status.
 * 
 * @returns {Promise<boolean>} - True if authenticated, false otherwise.
 */
export async function requireAuth() {
    try {
        const data = await apiRequest('GET', '/api/auth/status', true);
        
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