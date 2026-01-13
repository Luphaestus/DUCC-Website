/**
 * Tracks SPA navigation history via a path stack.
 */

let previousPath = [];
let currentPath = window.location.pathname;

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
 * Return the current path.
 * @returns {string}
 */
export const getCurrentPath = () => currentPath;