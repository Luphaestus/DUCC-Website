/**
 * Formats a number with its ordinal suffix (e.g., 1st, 2nd, 3rd).
 * @param {number|string} n - The number to format.
 * @returns {string} The formatted string or '-' if invalid.
 */
export function getOrdinal(n) {
    if (n === undefined || n === null || n === '-' || n < 1) return '-';
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
