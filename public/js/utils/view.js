/**
 * view.js
 * 
 * The central SPA (Single Page Application) router.
 * Handles URL changes, path resolution, view visibility toggling,
 * and emits events when the active view changes.
 */

import { ajaxGet } from './ajax.js';
import { Event } from "./event.js";
import { updateHistory } from './history.js';

/**
 * Event fired whenever the view successfully changes.
 * Subscribers receive an object containing { resolvedPath, viewId, path }.
 * @type {Event}
 */
const ViewChangedEvent = new Event();

/**
 * List of registered application routes.
 * @type {Array<{pattern: string, regex: RegExp, viewId: string, isOverlay: boolean}>}
 */
const Routes = [];

/**
 * Registers a new route in the application. 
 * 
 * @param {string} pattern - URL pattern (e.g. '/events', '/admin/*', '/user/:id').
 * @param {string} viewId - ID of the container element (without '-view' suffix).
 * @param {Object} [options={}] - Route configuration.
 * @param {boolean} [options.isOverlay=false] - If true, previous views are not hidden (used for modals).
 */
export function addRoute(pattern, viewId, options = {}) {
    // Convert pattern to regex
    const regexString = '^' + pattern
        .replace(/\//g, '\\/') // Escape slashes
        .replace(/:(\w+)/g, '([^/]+)') // Handle named parameters like :id
        .replace(/\*/g, '.*') + '$'; // Handle wildcards

    Routes.push({
        pattern,
        regex: new RegExp(regexString),
        viewId,
        isOverlay: options.isOverlay || false
    });
}

/**
 * Internal helper to find a matching route for a given path. 
 * 
 * @param {string} path - The path to match.
 * @returns {Object|null} - The matched route object or null.
 */
function matchRoute(path) {
    const pathOnly = path.split('?')[0]; // Ignore query strings for matching
    return Routes.find(route => route.regex.test(pathOnly)) || null;
}

/**
 * Checks if the provided path is the one currently in the browser address bar.
 * 
 * @param {string}
 * @returns {boolean}
 */
function isCurrentPath(path) {
    return (window.location.pathname + window.location.search) === path;
}

/**
 * Main function to trigger a view switch. Updates browser history,
 * toggles DOM visibility, and notifies subscribers.
 * 
 * @param {string} path - Destination path.
 * @param {boolean} [force=false] - If true, reloads the view even if already active.
 * @returns {boolean} - Returns true if navigation was handled.
 */
function switchView(path, force = false) {
    if (!path.startsWith('/')) path = '/' + path;

    // Handle root path: redirect to events if logged in, home if not
    if (path === '/') {
        ajaxGet('/api/auth/status').then((data) => {
            if (data.authenticated) switchView('/events');
            else switchView('/home');
        }).catch(() => switchView('/home'));
        return true;
    }

    updateHistory(path);
    const route = matchRoute(path);

    // Skip if already there, unless forced
    if (isCurrentPath(path) && !force) return true;

    // Update browser address bar
    if (path !== "/error" && !isCurrentPath(path)) {
        window.history.pushState({}, path, window.location.origin + path);
    }

    // Handle 404
    if (!route) return switchView('/error');

    // Toggle DOM elements
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(el => {
        if (el.id === route.viewId + '-view') {
            el.classList.remove('hidden');
        } else {
            // Don't hide existing views if the target is an overlay (e.g. event modal)
            if (!route.isOverlay) {
                el.classList.add('hidden');
            }
        }
    });

    // Notify application parts of the change
    ViewChangedEvent.notify({
        resolvedPath: route.pattern, 
        viewId: route.viewId, 
        path 
    });
    
    // Update browser tab title
    const titlePath = path.split('?')[0];
    document.title = `DUCC - ${titlePath.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`;

    return true;
}

/**
 * Triggered on popstate (browser back/forward) or initial load.
 * Synchronizes the app state with the current URL.
 */
function updateContent() {
    switchView(window.location.pathname + window.location.search, true);
}

window.onpopstate = updateContent;
window.onload = updateContent;

document.addEventListener('DOMContentLoaded', () => {
    // Auto-discover views in HTML and register them as routes if they follow the naming convention
    document.querySelectorAll('.view').forEach(v => {
        const id = v.id;
        if (id.endsWith('-view')) {
            const viewId = id.slice(0, -5);
            // If the ID looks like a path (starts with /), treat it as a static route
            if (viewId.startsWith('/') && !Routes.some(r => r.pattern === viewId)) {
                addRoute(viewId, viewId);
            }
        }
    });

    // Global click listener for elements with [data-nav] attribute to handle SPA navigation
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-nav]');
        if (link) {
            e.preventDefault();
            switchView(link.dataset.nav);
        }
    });
});

export { switchView, ViewChangedEvent };
