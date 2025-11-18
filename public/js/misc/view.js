import { ajaxGet } from './ajax.js';

let Views = []
let CurrentView = ""

/**
 * @returns {string[]} An array of registered view IDs.
 */
function getViews() {
    return Views.slice()
}

/**
 * Checks if a given view ID is registered.
 * @param {string} viewID - The ID of the view to check.
 * @returns {boolean} True if the view is registered, false otherwise.
 */
function isView(viewID) {
    return Views.includes(viewID)
}

/**
 * Checks if a given view ID is the currently active view.
 * Defaults to home if not authenticated, event otherwise.
 * @param {string} viewID - The ID of the view to check.
 * @returns {boolean} True if the view is currently active, false otherwise.
 */
function isCurrentView(viewID) {
    return CurrentView === viewID
}

/**
 * Switches the active view to the specified view name.
 * @param {string} viewName - The name of the view to switch to.
 * @returns {boolean} True if the view switch was successful, false otherwise.
 */
function switchView(viewName) {
    if (viewName === '') {
        ajaxGet('/api/user/loggedin', (data) => {
            if (data.loggedIn) {
                switchView('events');
            } else {
                switchView('home');
            }
        },
            () => {
                switchView('home');
            });
        return false
    }

    const viewID = viewName + "-view"

    if (!isView(viewID)) {
        switchView('error')
        return false
    }

    if (isCurrentView(viewID)) {
        return true
    }

    window.history.pushState({}, viewID, window.location.origin + '/' + viewName)

    for (const v of Views) {
        const el = document.getElementById(v)
        if (!el) continue

        if (v === viewID) {
            el.classList.remove('hidden')
        } else {
            el.classList.add('hidden')
        }
    }

    CurrentView = viewID
    document.title = `DUCC - ${viewName.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`


    return true
}


document.addEventListener('DOMContentLoaded', () => {
    Views = Array.from(document.querySelectorAll('.view')).map(v => v.id)
});

/*
* Update content based on current URL path
*/
function updateContent() {
    switchView(String(window.location.pathname).substring(1));
}

window.onpopstate = updateContent;
window.onload = updateContent;

export { getViews, isView, isCurrentView, switchView }
