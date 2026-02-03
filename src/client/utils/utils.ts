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
export function getOrdinal(n: number | string): string {
    if (typeof n === 'string') {
        if (n.trim() === '' || n === '-') return '-';
        n = parseInt(n, 10);
    }
    // Return placeholder for invalid/null ranks
    if (n === undefined || n === null || isNaN(n) || n < 1) return '-';
    
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
export function debounce(func: Function, wait: number) {
    let timeout: number | undefined = undefined;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = window.setTimeout(later, wait);
    };
}

/**
 * Retrieves the value of a specific cookie by name.
 * 
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string|null} - The cookie value, or null if not found.
 */
export function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

/**
 * Enforces numeric-only input on an element.
 * 
 * @param {HTMLInputElement} input - The input element to protect.
 */
export function setupNumberInput(input: HTMLInputElement) {
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        // Allow: backspace, delete, tab, escape, enter, dot, dash
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'ArrowUp', 'ArrowDown'];
        
        if (allowedKeys.includes(e.key) ||
            (e.key === 'a' && (e.ctrlKey === true || e.metaKey === true)) || // Ctrl+A
            (e.key === 'c' && (e.ctrlKey === true || e.metaKey === true)) || // Ctrl+C
            (e.key === 'v' && (e.ctrlKey === true || e.metaKey === true)) || // Ctrl+V
            (e.key === 'x' && (e.ctrlKey === true || e.metaKey === true))) { // Ctrl+X
            return;
        }

        const step = input.getAttribute('step');
        const min = input.getAttribute('min');
        const isDecimal = step && step.includes('.');
        const isNegative = min && (parseInt(min) < 0 || min === '-');

        if (isDecimal && e.key === '.') {
            if (input.value.includes('.')) e.preventDefault();
            return;
        }

        if (isNegative && e.key === '-') {
            if (input.selectionStart !== 0 || input.value.includes('-')) e.preventDefault();
            return;
        }

        // Prevent non-numeric
        if (!/^\d$/.test(e.key)) {
            e.preventDefault();
        }
    });

    // Handle paste
    input.addEventListener('paste', (e) => {
        const pasteData = e.clipboardData?.getData('text/plain');
        if (!pasteData) return;
        const step = input.getAttribute('step');
        const min = input.getAttribute('min');
        
        let regexStr = '^\\d*$';
        if (step && step.includes('.')) regexStr = '^-?\\d*\\.?\\d*$';
        else if (min && parseInt(min) < 0) regexStr = '^-?\\d*$';
        
        const regex = new RegExp(regexStr);
        if (!regex.test(pasteData)) {
            e.preventDefault();
        }
    });

    // Handle blur to ensure valid number
    input.addEventListener('blur', () => {
        if (input.value === '.' || input.value === '-') {
            input.value = '';
        }
    });
}

/**
 * Generates and triggers a download for a CSV file.
 * 
 * @param {Array<Array<string>>} data - 2D array of strings.
 * @param {string} filename - Filename including extension.
 */
export function downloadCSV(data: string[][], filename: string) {
    const csvContent = data.map(row => 
        row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
