/**
 * view.js
 * 
 * The central SPA (Single Page Application) router.
 * Handles URL changes, path resolution, view visibility toggling,
 * and emits events when the active view changes.
 */

import { ajaxGet } from './ajax.js';
import { ViewChangedEvent } from "./events/events.js";
import { updateHistory } from './history.js';


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
 * @param {boolean} [options.isOverlay=false] - If true, previous views are not hidden (used for modals)
 * @param {lambda} [options.titleFunc(path)=>String) - Optional function to set document title dynamically. 
 */
export function addRoute(pattern, viewId, options = {}) {
    const regexString = '^' + pattern
        .replace(/\//g, '\\/')
        .replace(/:(\w+)/g, '([^/]+)')
        .replace(/\*/g, '.*') + '$';

    Routes.push({
        pattern,
        regex: new RegExp(regexString),
        viewId,
        isOverlay: options.isOverlay || false,
        titleFunc: options.titleFunc || null
    });
}

/**
 * Internal helper to find a matching route for a given path. 
 * 
 * @param {string} path - The path to match.
 * @returns {Object|null} - The matched route object or null.
 */
function matchRoute(path) {
    const pathOnly = path.split('?')[0];
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

    if (isCurrentPath(path) && !force) return true;

    if (!route) return switchView('/error');

    const allViews = document.querySelectorAll('.view');
    allViews.forEach(el => {
        if (el.id === route.viewId + '-view') {
            el.classList.remove('hidden');
        } else {
            if (!route.isOverlay) {
                el.classList.add('hidden');
            }
        }
    });

    ViewChangedEvent.notify({
        resolvedPath: route.pattern,
        viewId: route.viewId,
        path
    });

    if (route.titleFunc !== null) {
        document.title = route.titleFunc(path);
    } else {
        const baseLocation = path.match(/\/([a-zA-Z]*)/);
        const formatedBase = baseLocation[1].charAt(0).toUpperCase() + baseLocation[1].slice(1);
        document.title = `DUCC - ${formatedBase}`;
    }

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
    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-nav]');
        if (link) {
            e.preventDefault();
            switchView(link.dataset.nav);
        }
    });
});

export { switchView, ViewChangedEvent };
