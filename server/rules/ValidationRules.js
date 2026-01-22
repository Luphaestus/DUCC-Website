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
        // 1. Check for missing/empty values
        if (value === undefined || value === null || value === '') {
            if (required) return 'Field is required.';
            return null;
        }

        // 'presence' type only checks if the field is non-empty
        if (type === 'presence') return null; 

        // 2. Specialized Type Validations
        if (type === 'boolean') {
            if (typeof value !== 'boolean') return 'Invalid value. Must be true or false.';
            return null;
        }

        if (type === 'date_of_birth') {
            const dob = new Date(value);
            if (isNaN(dob.getTime())) return 'Invalid date.';
            
            const today = new Date();
            // Minimum age: 17, Maximum age: 90
            const maxDate = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());
            const minDate = new Date(today.getFullYear() - 90, today.getMonth(), today.getDate());
            
            if (dob < minDate || dob > maxDate) return 'Age must be between 17 and 90.';
            return null;
        }

        // 3. Pattern-based Validations (Email, Name, Phone)
        const rule = this.validation[type];
        if (!rule) return null;

        if (typeof value !== 'string') return 'Invalid format.';

        if (!rule.pattern.test(value)) {
            return rule.message;
        }
        
        return null;
    }
}

module.exports = ValidationRules;