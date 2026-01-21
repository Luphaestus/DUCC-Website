import { ajaxGet } from './ajax.js';
import { Event } from "./event.js";
import { updateHistory } from './history.js';

/**
 * SPA router handling URL changes, path resolution, and view visibility.
 * @module View
 */

const ViewChangedEvent = new Event();
const Routes = [];

/**
 * Register a route explicitly.
 * @param {string} pattern - URL pattern (e.g. '/events', '/admin/*', '/user/:id')
 * @param {string} viewId - ID of the view element (without '-view' suffix)
 * @param {Object} options - Additional options for the route
 */
export function addRoute(pattern, viewId, options = {}) {
    const regexString = '^' + pattern
        .replace(/\//g, '\\/') // Escape slashes
        .replace(/:(\w+)/g, '([^/]+)') // Named parameters
        .replace(/\*/g, '.*') + '$'; // Wildcard

    Routes.push({
        pattern,
        regex: new RegExp(regexString),
        viewId,
        isOverlay: options.isOverlay || false
    });
}

/**
 * Find the matching route for a path.
 * @param {string} path 
 * @returns {Object|null} Route object or null
 */
function matchRoute(path) {
    const pathOnly = path.split('?')[0];
    return Routes.find(route => route.regex.test(pathOnly)) || null;
}

/**
 * Check if path matches current location.
 * @param {string} path
 * @returns {boolean}
 */
function isCurrentPath(path) {
    return (window.location.pathname + window.location.search) === path
}

/**
 * Switch active SPA view and sync browser state.
 * @param {string} path
 * @param {boolean} force
 * @returns {boolean}
 */
function switchView(path, force = false) {
    if (!path.startsWith('/')) path = '/' + path

    if (path === '/') {
        ajaxGet('/api/auth/status').then((data) => {
            if (data.authenticated) switchView('/events');
            else switchView('/home');
        }).catch(() => switchView('/home'));
        return true
    }

    updateHistory(path);
    const route = matchRoute(path);

    if (isCurrentPath(path) && !force) return true

    if (path !== "/error" && !isCurrentPath(path)) {
        window.history.pushState({}, path, window.location.origin + path);
    }

    if (!route) return switchView('/error');

    // Toggle views
    const allViews = document.querySelectorAll('.view');
    allViews.forEach(el => {
        if (el.id === route.viewId + '-view') {
            el.classList.remove('hidden');
        } else {
            // Don't hide views if the new route is an overlay
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
    
    const titlePath = path.split('?')[0];
    document.title = `DUCC - ${titlePath.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`

    return true
}

/**
 * Update view from current URL.
 */
function updateContent() {
    switchView(window.location.pathname + window.location.search, true);
}

window.onpopstate = updateContent;
window.onload = updateContent;

document.addEventListener('DOMContentLoaded', () => {
    // Scan for existing views and register them if not already registered
    document.querySelectorAll('.view').forEach(v => {
        const id = v.id;
        if (id.endsWith('-view')) {
            const viewId = id.slice(0, -5);
            // If the ID looks like a path (starts with /), use it as a pattern.
            if (viewId.startsWith('/') && !Routes.some(r => r.pattern === viewId)) {
                addRoute(viewId, viewId);
            }
        }
    });

    document.addEventListener('click', (e) => {
        const link = e.target.closest('[data-nav]');
        if (link) {
            e.preventDefault();
            switchView(link.dataset.nav);
        }
    });
});

export { switchView, ViewChangedEvent };