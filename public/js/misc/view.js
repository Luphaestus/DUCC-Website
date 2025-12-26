import { ajaxGet } from './ajax.js';
import { Event } from "./event.js";
import { updateHistory } from './history.js';

/**
 * SPA router handling URL changes, path resolution, and view visibility.
 * @module View
 */

const ViewChangedEvent = new Event();
let Paths = []

/**
 * Resolve URL path to a view ID, supporting wildcards.
 * @param {string} path
 * @returns {string|boolean} Resolved ID or false.
 */
function getViewID(path) {
    if (Paths.includes(path)) return path;

    for (const registeredPath of Paths) {
        const regex = new RegExp('^' + registeredPath.replace(/\?/, '.').replace(/\*/, '.*') + '$');
        if (regex.test(path)) return registeredPath;
    }
    return false;
}

/**
 * Check if path matches current location.
 * @param {string} path
 * @returns {boolean}
 */
function isCurrentPath(path) {
    return String(window.location.pathname) === path
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
    const resolvedPath = getViewID(path);

    if (isCurrentPath(path) && !force) return true

    if (path !== "/error" && !isCurrentPath(path)) {
        window.history.pushState({}, path, window.location.origin + path);
    }

    if (!resolvedPath) return switchView('/error');

    for (const p of Paths) {
        const el = document.getElementById(p + "-view");
        if (!el) continue
        if (p === resolvedPath) el.classList.remove('hidden')
        else el.classList.add('hidden')
    }

    ViewChangedEvent.notify({ resolvedPath, path });
    document.title = `DUCC - ${path.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`

    return true
}

/**
 * Update view from current URL.
 */
function updateContent() {
    switchView(String(window.location.pathname), true);
}

window.onpopstate = updateContent;
window.onload = updateContent;

document.addEventListener('DOMContentLoaded', () => {
    Paths = Array.from(document.querySelectorAll('.view')).map(v => String(v.id).replace("-view", ''))
});

export { switchView, ViewChangedEvent };