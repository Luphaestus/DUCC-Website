/**
 * ValidationRules.js
 * 
 * Provides centralized input validation logic for common data types.
 * Used to ensure data integrity before database insertion or processing.
 */

class ValidationRules {
    /**
     * Predefined regular expression patterns and corresponding error messages.
     */
    static validation = {
        email: {
            pattern: /^[^@]+\.[^@]+@durham\.ac\.uk$/i,
            message: 'Invalid email format. Must be a Durham University email (first.last@durham.ac.uk).'
        },
        name: {
            pattern: /^[a-zA-Z\s,.'-]{1,100}$/,
            message: 'Invalid name. Allowed characters: letters, spaces, hyphens, apostrophes, dots, and commas.'
        },
        phone: {
            pattern: /^\+?[0-9\s\-()]{7,15}$/,
            message: 'Invalid phone number. Must be 7-15 digits, optionally with +, -, or ().'
        }
    };

    /**
     * Evaluates a value against a specific validation type.
     * 
     * @param {string} type - Validation type ('email', 'name', 'phone', 'date_of_birth', 'boolean', 'presence').
     * @param {any} value - The input value to validate.
     * @param {boolean} [required=true] - If false, permits null/empty values.
     * @returns {string|null} - Human-readable error message or null if valid.
     */
    static validate(type, value, required = true) {
    // Check for missing/empty values
    if (!value && value !== 0 && value !== false) {
        if (required) return `${label} is required.`;
        return null;
    }

    // Specialized Type Validations
    if (type === 'number') {
        const num = Number(value);
        if (isNaN(num)) return `${label} must be a number.`;
        if (min !== undefined && num < min) return `${label} must be at least ${min}.`;
        if (max !== undefined && num > max) return `${label} must be at most ${max}.`;
    }

    if (type === 'date') {
        const d = new Date(value);
        if (isNaN(d.getTime())) return `${label} must be a valid date.`;
    }

    // Pattern-based Validations (Email, Name, Phone)
    if (pattern && !pattern.test(value)) {
    }
}

module.exports = ValidationRules;