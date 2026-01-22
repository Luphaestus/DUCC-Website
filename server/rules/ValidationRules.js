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
        if (value === null || value === undefined || value === '') {
            if (required) return `${type} is required.`;
            return null;
        }

        // Specialized Type Validations
        if (type === 'date_of_birth') {
            const d = new Date(value);
            if (isNaN(d.getTime())) return 'Invalid date format.';
            
            const age = new Date().getFullYear() - d.getFullYear();
            if (age < 17) return 'You must be at least 17 years old.';
            if (age > 90) return 'Invalid age.';
            return null;
        }

        if (type === 'boolean') {
            if (typeof value !== 'boolean') return 'Must be a boolean value.';
            return null;
        }

        if (type === 'presence') {
            return null; // Already checked above
        }

        // Pattern-based Validations (Email, Name, Phone)
        const rule = this.validation[type];
        if (rule) {
            if (rule.pattern && !rule.pattern.test(value)) {
                return rule.message;
            }
        }

        return null;
    }
}

module.exports = ValidationRules;
