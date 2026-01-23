/**
 * view.js
 * 
 * The central router.
 * Handles URL changes, path resolution, view visibility toggling,
 */

import { apiRequest } from './api.js';
import { ViewChangedEvent } from "./events/events.js";


/**
 * List of registered routes.
 * @type {Array<{pattern: string, regex: RegExp, viewId: string, isOverlay: boolean, titleFunc: (path: string) => string|null}>}
 */
const Routes = [];

/**
 * Registers a new route in the application. 
 * 
 * @param {string} pattern - URL pattern.
 * @param {string} viewId
 * @param {Object} [options={}]
 * @param {boolean} [options.isOverlay=false] - If true, previous views are not hidden. (optional)
 * @param {lambda} [options.titleFunc(path)=>String) - function to set document title dynamically. (optional) 
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
 * find a matching route for a given path. 
 * 
 * @param {string} path 
 * @returns {Object|null}
 */
function matchRoute(path) {
    const pathOnly = path.split('?')[0];
    return Routes.find(route => route.regex.test(pathOnly)) || null;
}

/**
 * Checks if path is different to current path.
 * 
 * @param {string}
 * @returns {boolean}
 */
function isCurrentPath(path) {
    return (window.location.pathname + window.location.search) === path;
}

/**
 * Switches to new view
 * 
 * @param {string} path
 * @param {boolean} [force=false] - reloads the view even if already active.
 * @returns {boolean}
 */
function switchView(path, force = false) {
    if (!path.startsWith('/')) path = '/' + path;

    // Handle root path: redirect to events if logged in, home if not
    if (path === '/') {
        apiRequest('GET', '/api/auth/status').then((data) => {
            if (data.authenticated) switchView('/events');
            else switchView('/home');
        }).catch(() => switchView('/home'));
        return true;
    }


    const route = matchRoute(path);

    if (isCurrentPath(path) && !force) return true;

    if (!route) return switchView('/error');

    if (!isCurrentPath(path)) {
        window.history.pushState(null, '', path);
    }

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

export { switchView, ViewChangedEvent, isCurrentPath };
