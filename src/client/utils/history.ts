/**
 * history.js
 * 
 * Manages an internal navigation history stack for the SPA.
 * in history or if they should perform a default navigation.
 */

import { ViewChangedEvent } from './events/events.js';

let previousPath: string[] = [];
let currentPath: string = window.location.pathname + window.location.search;

/**
 * Updates the internal history stack.
 * Listens to ViewChangedEvent to track navigation.
 */
ViewChangedEvent.subscribe(({ path }: any) => {
    previousPath.push(currentPath);
    currentPath = path;
});

/**
 * Pops and returns the last path from the history stack.
 * 
 * @returns {string|undefined} - The previous path if available.
 */
export const getPreviousPath = (): string | undefined => previousPath.pop();

/**
 * Checks if there is any history in the internal stack.
 * 
 * @returns {boolean} - True if the stack is not empty.
 */
export const hasHistory = (): boolean => previousPath.length > 0;

/**
 * Returns the currently tracked pathname.
 * 
 * @returns {string}
 */
export const getCurrentPath = (): string => currentPath;