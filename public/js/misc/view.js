import { ajaxGet } from './ajax.js';
import { Event } from "./event.js";
import { updateHistory } from './history.js';

/**
 * View/Router Module.
 * Implements a simple Single Page Application (SPA) router.
 * It handles URL changes, resolves paths to specific views (including wildcards),
 * and manages the visibility of view elements in the DOM.
 */

// Event emitted whenever the active view changes
const ViewChangedEvent = new Event();

// List of all registered view paths (extracted from DOM on load)
let Paths = []


/**
 * Resolves a URL path to a registered view ID.
 * Supports wildcards '*' (match everything) and '?' (match any single character).
 * @param {string} path - The URL path to resolve.
 * @returns {string|boolean} The resolved view ID or false if not found.
 */
function getViewID(path) {
    // Exact match check
    if (Paths.includes(path))
        return path;

    // Pattern match check (for routes like /event/*)
    for (const registeredPath of Paths) {
        const regex =
            new RegExp('^' + registeredPath.replace(/\?/, '.').replace(/\*/, '.*') + '$');
        if (regex.test(path)) {
            return registeredPath;
        }
    }
    return false;
}


/**
 * Checks if the provided path matches the current browser location.
 * @param {string} path
 * @returns {boolean}
 */
function isCurrentPath(path) {
    return String(window.location.pathname) === path
}

/**
 * Main function to switch the currently active SPA view.
 * Handles:
 * 1. Default routing for root '/'.
 * 2. History stack updates.
 * 3. Browser History API sync (pushState).
 * 4. Toggling 'hidden' class on view elements.
 * 5. Page title updates.
 * 
 * @param {string} path - Target path.
 * @param {boolean} force - If true, re-renders even if already on the path.
 * @returns {boolean}
 */
function switchView(path, force = false) {
    // Canonicalize path
    if (!path.startsWith('/')) path = '/' + path

    // Special case: Root redirects based on auth status
    if (path === '/') {
        ajaxGet('/api/auth/status').then((data) => {
            if (data.authenticated) {
                switchView('/events');
            } else {
                switchView('/home');
            }
        }).catch(() => {
            switchView('/home');
        });
        return true
    }

    // Update internal history stack
    updateHistory(path);

    // Resolve which physical view should be shown
    const resolvedPath = getViewID(path);

    // Optimization: Don't re-render if we are already there
    if (isCurrentPath(path) && !force) {
        return true
    }

    // Sync with browser URL bar
    if (path !== "/error" && !isCurrentPath(path)) {
        window.history.pushState({}, path, window.location.origin + path);
    }

    // Handle 404
    if (!resolvedPath) {
        return switchView('/error');
    }

    // Toggle visibility: show the resolved view, hide all others
    for (const p of Paths) {
        const el = document.getElementById(p + "-view");

        if (!el) continue

        if (p === resolvedPath) {
            el.classList.remove('hidden')
        } else {
            el.classList.add('hidden')
        }
    }

    // Signal other components that the view has changed
    ViewChangedEvent.notify({ resolvedPath, path });

    // Update the browser tab title
    document.title = `DUCC - ${path.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`


    return true
}

/**
 * Triggers a view update based on the current physical URL.
 * Used for handling browser 'back' button and initial load.
 */
function updateContent() {
    switchView(String(window.location.pathname), true);
}


// Event listeners for history navigation and initial load
window.onpopstate = updateContent;
window.onload = updateContent;

document.addEventListener('DOMContentLoaded', () => {
    // Discover all views in the document based on their ID convention (e.g., /home-view)
    Paths = Array.from(document.querySelectorAll('.view')).map(v => String(v.id).replace("-view", ''))
});


export { switchView, ViewChangedEvent };
