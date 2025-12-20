import { ajaxGet } from './ajax.js';
import { Event } from "./event.js";
import { updateHistory } from './history.js';

const ViewChangedEvent = new Event();
let Paths = []


/**
 * Checks if a given view ID is registered.
 * @param {string} viewID - The ID of the view to check.
 * @returns {boolean} True if the view is registered, false otherwise.
 */
function getViewID(path) {
    if (Paths.includes(path))
        return path;
    for (const registeredPath of Paths) {
        const regex =
            new RegExp('^' + registeredPath.replace(/\?/g, '.').replace(/\*/g, '.*') + '$');
        if (regex.test(path)) {
            return registeredPath;
        }
    }
    return false;
}


/**
 * Checks if a given view ID is the currently active view.
 * Defaults to home if not authenticated, event otherwise.
 * @param {string} path - The path to check.
 * @returns {boolean} True if the path is currently active, false otherwise.
 */
function isCurrentPath(path) {
    return String(window.location.pathname) === path
}

/**
 * Switches the active view to the specified view name.
 * @param {string} viewName - The name of the view to switch to.
 * @returns {boolean} True if the view switch was successful, false otherwise.
 */
function switchView(path, force = false) {
    if (!path.startsWith('/')) path = '/' + path
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

    updateHistory(path);

    const resolvedPath = getViewID(path);

    if (isCurrentPath(path) && !force) {
        return true
    }

    if (path !== "/error" && !isCurrentPath(path)) window.history.pushState({}, path, window.location.origin + path)

    if (!resolvedPath) {
        return switchView('/error');
    }

    for (const p of Paths) {
        const el = document.getElementById(p + "-view");

        if (!el) continue

        if (p === resolvedPath) {
            el.classList.remove('hidden')
        } else {
            el.classList.add('hidden')
        }
    }

    ViewChangedEvent.notify({ resolvedPath, path });

    document.title = `DUCC - ${path.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`


    return true
}

/*
* Update content based on current URL path
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
