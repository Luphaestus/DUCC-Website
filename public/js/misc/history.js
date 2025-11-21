let previousPath = null;
let currentPath = window.location.pathname;

/**
 * Updates the navigation history.
 * This should be called by your `switchView` function.
 * @param {string} newPath The new path being navigated to.
 */
function updateHistory(newPath) {
    previousPath = currentPath;
    currentPath = newPath;
}

export { updateHistory };
export const getPreviousPath = () => previousPath;
export const getCurrentPath = () => currentPath;