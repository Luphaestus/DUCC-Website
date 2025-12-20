let previousPath = [];
let currentPath = window.location.pathname;

/**
 * Updates the navigation history.
 * This should be called by your `switchView` function.
 * @param {string} newPath The new path being navigated to.
 */
function updateHistory(newPath) {
    previousPath.push(currentPath);
    currentPath = newPath;
}

export { updateHistory };
export const getPreviousPath = () => previousPath.pop();
export const getCurrentPath = () => currentPath;