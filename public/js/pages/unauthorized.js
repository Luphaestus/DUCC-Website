/**
 * unauthorized.js
 * 
 * Logic for the "Access Denied" view.
 * Displays when a user tries to access a restricted route without sufficient permissions.
 * Provides context-aware call-to-action buttons (Login vs Home).
 * 
 * Registered Route: /unauthorized
 */

import { ViewChangedEvent, addRoute } from '/js/utils/view.js';
import { ajaxGet } from '/js/utils/ajax.js';
import { SHIELD_SVG } from '../../images/icons/outline/icons.js';

// Register route
addRoute('/unauthorized', 'unauthorized');

/** HTML Template for the access denied page */
const HTML_TEMPLATE = /*html*/`
<div id="unauthorized-view" class="view hidden">
    <div class="container">
        <div class="error-icon">
            ${SHIELD_SVG}
        </div>
        <h1>Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <div id="unauthorized-actions" class="error-actions">
            <!-- Buttons injected here based on auth state -->
        </div>
    </div>
</div>`;

/**
 * Updates the action buttons based on whether the user is logged in.
 */
async function updateUnauthorizedButtons() {
    const actionsContainer = document.getElementById('unauthorized-actions');
    if (!actionsContainer) return;

    try {
        const authStatus = await ajaxGet('/api/auth/status');
        if (authStatus.authenticated) {
            // Logged in but insufficient permissions (e.g. non-admin visiting admin page)
            actionsContainer.innerHTML = `
                <button data-nav="/home">Go to Home</button>
                <button class="secondary" data-nav="/events">View Events</button>
            `;
        } else {
            // Not logged in
            actionsContainer.innerHTML = `
                <button data-nav="/login">Login</button>
                <button class="secondary" data-nav="/home">Go to Home</button>
            `;
        }
    } catch (e) {
        actionsContainer.innerHTML = `
            <button data-nav="/home">Go to Home</button>
        `;
    }
}

// Router hook
ViewChangedEvent.subscribe(({ viewId }) => {
    if (viewId === 'unauthorized') {
        updateUnauthorizedButtons();
    }
});

document.querySelector('main').insertAdjacentHTML('beforeend', HTML_TEMPLATE);