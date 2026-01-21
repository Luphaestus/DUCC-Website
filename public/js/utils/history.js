/**
 * Tracks SPA navigation history via a path stack.
 */

let previousPath = [];
let currentPath = window.location.pathname + window.location.search;

/**
 * Pushes current path to history stack and updates current path.
 * @param {string} newPath
 */
function updateHistory(newPath) {
    previousPath.push(currentPath);
    currentPath = newPath;
}

export { updateHistory };

/**
 * Pop and return the previous path.
 * @returns {string|undefined}
 */
export const getPreviousPath = () => previousPath.pop();

/**
 * Check if there is any previous path in the stack.
 * @returns {boolean}
 */
export const hasHistory = () => previousPath.length > 0;

/**
 * Return the current path.
 * @returns {string}
 */
export const getCurrentPath = () => currentPath;