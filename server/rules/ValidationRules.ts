/**
 * ValidationRules.ts
 * 
 * Provides centralized input validation logic.
 */

interface ValidationRule {
    pattern: RegExp;
    message: string;
}

export default class ValidationRules {
    /**
     * Predefined regular expression patterns and error messages.
     */
    static validation: Record<string, ValidationRule> = {
        email: {
            pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
            message: 'Please enter a valid email address.'
        },
        name: {
            pattern: /^[a-zA-Z\s,.'-]{1,100}$/,
            message: 'Invalid name. Allowed characters: letters, spaces, hyphens, apostrophes, dots, and commas.'
        },
        phone: {
            pattern: /^\+?[0-9\s\-()]{7,15}$/,
            message: 'Invalid phone number. Must be 7-15 digits, optionally with +, -, or ().'
        },
        totp: {
            pattern: /^\d{6}$/,
            message: 'Invalid code format. Must be 6 digits.'
        },
        password: {
            pattern: /^.{8,72}$/,
            message: 'Password must be between 8 and 72 characters.'
        }
    };

    /**
     * Evaluates a value against a specific validation type.
     */
    static validate(type: string, value: any, required: boolean = true): string | null {
        if (value === null || value === undefined || value === '') {
            if (required) return `${type} is required.`;
            return null;
        }

        if (type === 'date_of_birth') {
            const d = new Date(value);
            if (isNaN(d.getTime())) return 'Invalid date format.';
            
            const age = new Date().getFullYear() - d.getFullYear();
            if (age < 17) return 'You must be at least 17 years old.';
            if (age > 90) return 'Invalid age.';
            return null;
        }

        if (type === 'boolean') {
            if (typeof value !== 'boolean' && value !== 0 && value !== 1) return 'Must be a boolean value.';
            return null;
        }

        if (type === 'presence') {
            return null;
        }

        const rule = this.validation[type];
        if (rule) {
            if (rule.pattern && !rule.pattern.test(String(value))) {
                return rule.message;
            }
        }

        return null;
    }
}
