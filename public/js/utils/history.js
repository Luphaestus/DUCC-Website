/**
 * history.js
 * 
 * Manages an internal navigation history stack for the SPA.
 * Allows components (like the event modal) to determine if they can go back
 * in history or if they should perform a default navigation.
 */

/** @type {string[]} Stack of previous pathnames */
let previousPath = [];

/** @type {string} The currently active path */
let currentPath = window.location.pathname + window.location.search;

/**
 * Pushes the current path to the history stack and updates the current tracked path.
 * Called automatically by the router on every view change.
 * 
 * @param {string} newPath - The destination path.
 */
function updateHistory(newPath) {
    previousPath.push(currentPath);
    currentPath = newPath;
}

/**
 * Pops and returns the last path from the history stack.
 * 
 * @returns {string|undefined} - The previous path if available.
 */
export const getPreviousPath = () => previousPath.pop();

/**
 * Checks if there is any history in the internal stack.
 * 
 * @returns {boolean} - True if the stack is not empty.
 */
export const hasHistory = () => previousPath.length > 0;

/**
 * Returns the currently tracked pathname.
 * 
 * @returns {string}
 */
export const getCurrentPath = () => currentPath;

export { updateHistory };