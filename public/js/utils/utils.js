/**
 * utils.js
 * 
 * Generic utility functions for the frontend.
 */

/**
 * Formats a number with its corresponding ordinal suffix (e.g., 1 -> 1st, 22 -> 22nd).
 * 
 * @param {number|string} n - The number to format.
 * @returns {string} - The formatted string (e.g., "1st") or "-" if the input is invalid.
 */
export function getOrdinal(n) {
    // Return placeholder for invalid/null ranks
    if (n === undefined || n === null || n === '-' || n < 1) return '-';
    
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    
    // Apply special suffix logic for English ordinals
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Debounces a function call.
 * 
 * @param {Function} func - The function to debounce.
 * @param {number} wait - Debounce time in milliseconds.
 * @returns {Function} - The debounced function.
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Retrieves the value of a specific cookie by name.
 * 
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string|null} - The cookie value, or null if not found.
 */
export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}
