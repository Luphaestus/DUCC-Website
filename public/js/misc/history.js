/**
 * History Module.
 * Provides manual tracking of navigation history within the SPA.
 * This complements the browser's native History API by maintaining a simple stack of visited paths.
 */

/** @type {string[]} Stack of previous paths */
let previousPath = [];
/** @type {string} The current active path */
let currentPath = window.location.pathname;

/**
 * Updates the navigation state by pushing the current path to the history stack
 * and setting the new path as current.
 * This should be called every time a successful view switch occurs.
 * @param {string} newPath - The new path being navigated to.
 */
function updateHistory(newPath) {
    previousPath.push(currentPath);
    currentPath = newPath;
}

export { updateHistory };

/**
 * Pops and returns the most recent path from the history stack.
 * @returns {string|undefined}
 */
export const getPreviousPath = () => previousPath.pop();

/**
 * Returns the current path without modifying the stack.
 * @returns {string}
 */
export const getCurrentPath = () => currentPath;