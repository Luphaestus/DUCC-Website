/**
 * errors.js
 * 
 * Registered Routes:
 * - /error (404)
 * - /unauthorised (403)
 * - /no-internet (Offline)
 */

import { addRoute, ViewChangedEvent } from '/js/utils/view.js';
import { apiRequest } from '/js/utils/api.js';
import { BRIGHTNESS_ALERT_SVG, SHIELD_SVG, SIGNAL_DISCONNECTED_SVG } from '../../images/icons/outline/icons.js';

addRoute('/error', 'error', { changeURL: false, titleFunc: () => 'Error - Page Not Found' });
addRoute('/unauthorised', 'unauthorised', { titleFunc: () => 'Error - Access Denied', changeURL: false });
addRoute('/no-internet', 'no-connection', { isOverlay: true, titleFunc: () => 'Error - No Internet Connection', changeURL: false });

/**
 * Generates the HTML structure for an error view.
 * 
 * @param {string} id - The DOM ID for the view (used by router and CSS).
 * @param {string} icon - SVG icon string.
 * @param {string} title - Heading text.
 * @param {string} message - Description text (supports HTML).
 * @returns {string} HTML string.
 */
const createErrorView = (id, icon, title, message) => `
    <div id="${id}" class="view hidden">
        <div class="container">
            <div class="error-icon">
                ${icon}
            </div>
            <h1>${title}</h1>
            <p>${message}</p>
            <div class="error-actions">
                <!-- Buttons injected dynamically -->
            </div>
        </div>
    </div>
`;

const main = document.querySelector('main');

// 404 Error View
main.insertAdjacentHTML('beforeend', createErrorView(
    'error-view',
    BRIGHTNESS_ALERT_SVG,
    '404 - Page Not Found',
    'Oops! The page you are looking for does not exist.<br>It might have been moved, deleted, or you may have typed the address incorrectly.'
));

// Unauthorised View
main.insertAdjacentHTML('beforeend', createErrorView(
    'unauthorised-view',
    SHIELD_SVG,
    'Access Denied',
    'You do not have permission to view this page.'
));

// No Internet View (Overlay)
main.insertAdjacentHTML('beforeend', createErrorView(
    'no-connection-view',
    SIGNAL_DISCONNECTED_SVG,
    'No Internet Connection',
    'Please check your network settings.<br>We\'ll try to reconnect automatically...'
));


/**
 * Handles dynamic content updates when navigating to error views.
 */
async function handleErrorNavigation({ viewId }) {
    // 404 Logic
    if (viewId === 'error') {
        const actions = document.querySelector('#error-view .error-actions');
        if (actions && !actions.hasChildNodes()) {
            actions.innerHTML = `<button data-nav="/home">Go to Homepage</button>`;
        }
    }

    if (viewId !== 'no-connection') {
        const view = viewId === 'unauthorised' ? 'unauthorised-view' : 'error-view';
        const actions = document.querySelector(`#${view} .error-actions`);
        if (!actions) return;

        actions.innerHTML = '<button disabled aria-busy="true" class="secondary outline">Checking...</button>';

        try {
            const auth = await apiRequest('GET', '/api/auth/status');
            if (auth.authenticated) {
                actions.innerHTML = `
                    <button data-nav="/home">Go to Home</button>
                    <button class="secondary outline" data-nav="/events">View Events</button>
                `;
            } else {
                actions.innerHTML = `
                    <button data-nav="/login">Login</button>
                    <button class="secondary outline" data-nav="/home">Go to Home</button>
                `;
            }
        } catch {
            actions.innerHTML = `<button data-nav="/home">Go to Home</button>`;
        }
    }
}

ViewChangedEvent.subscribe(handleErrorNavigation);
