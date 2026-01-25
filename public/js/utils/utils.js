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
