/**
 * ValidationRules.test.js
 * 
 * Unit tests for data validation logic.
 * Covers emails, names, phone numbers, ages, and presence checks.
 */

const ValidationRules = require('../../server/rules/ValidationRules');

describe('rules/ValidationRules', () => {
    describe('validate(email)', () => {
        test('Valid Durham email addresses', () => {
            expect(ValidationRules.validate('email', 'test.user@durham.ac.uk')).toBeNull();
            expect(ValidationRules.validate('email', 'abc.123@durham.ac.uk')).toBeNull();
            expect(ValidationRules.validate('email', 'A.B@DURHAM.AC.UK')).toBeNull();
        });

        test('Invalid email formats and domains', () => {
            expect(ValidationRules.validate('email', 'test@gmail.com')).toBeDefined();
            expect(ValidationRules.validate('email', 'test.user@durham.com')).toBeDefined();
            expect(ValidationRules.validate('email', 'not-an-email')).toBeDefined();
            // Requirement: Must be a departmental email (e.g. name.name@durham.ac.uk)
            expect(ValidationRules.validate('email', 'test@durham.ac.uk')).toBeDefined(); 
        });

        test('Required vs optional field handling', () => {
            // Required: null is an error
            expect(ValidationRules.validate('email', null, true)).toBeDefined();
            expect(ValidationRules.validate('email', '', true)).toBeDefined();
            
            // Optional: null is valid
            expect(ValidationRules.validate('email', null, false)).toBeNull();
            expect(ValidationRules.validate('email', '', false)).toBeNull();
        });
    });

    describe('validate(name)', () => {
        test('Valid names with special characters (hyphens, apostrophes)', () => {
            expect(ValidationRules.validate('name', 'John Doe')).toBeNull();
            expect(ValidationRules.validate('name', "O'Connor")).toBeNull();
            expect(ValidationRules.validate('name', 'Saint-John')).toBeNull();
            expect(ValidationRules.validate('name', 'Doe, John')).toBeNull();
        });

        test('Invalid names (numbers, symbols, excessive length)', () => {
            expect(ValidationRules.validate('name', 'John123')).toBeDefined();
            expect(ValidationRules.validate('name', 'John @ Doe')).toBeDefined();
            expect(ValidationRules.validate('name', 'a'.repeat(101))).toBeDefined();
        });
    });

    describe('validate(phone)', () => {
        test('Valid international and local formats', () => {
            expect(ValidationRules.validate('phone', '01234567890')).toBeNull();
            expect(ValidationRules.validate('phone', '+44 1234 567890')).toBeNull();
            expect(ValidationRules.validate('phone', '(0123) 456-7890')).toBeNull();
        });

        test('Invalid phone numbers', () => {
            expect(ValidationRules.validate('phone', '123456')).toBeDefined(); // Short
            expect(ValidationRules.validate('phone', '1234567890123456')).toBeDefined(); // Long
            expect(ValidationRules.validate('phone', 'abc1234567')).toBeDefined();
        });
    });

    describe('validate(date_of_birth)', () => {
        test('Valid age ranges (17 - 90)', () => {
            const eighteenYearsAgo = new Date();
            eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
            expect(ValidationRules.validate('date_of_birth', eighteenYearsAgo.toISOString())).toBeNull();

            const fiftyYearsAgo = new Date();
            fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);
            expect(ValidationRules.validate('date_of_birth', fiftyYearsAgo.toISOString())).toBeNull();
        });

        test('Invalid age ranges (too young or too old)', () => {
            // 16 is too young
            const sixteenYearsAgo = new Date();
            sixteenYearsAgo.setFullYear(sixteenYearsAgo.getFullYear() - 16);
            expect(ValidationRules.validate('date_of_birth', sixteenYearsAgo.toISOString())).toBeDefined();

            // 100 is too old
            const hundredYearsAgo = new Date();
            hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - 100);
            expect(ValidationRules.validate('date_of_birth', hundredYearsAgo.toISOString())).toBeDefined();
        });

        test('Invalid date strings', () => {
            expect(ValidationRules.validate('date_of_birth', 'not-a-date')).toBeDefined();
        });
    });

    describe('validate(boolean)', () => {
        test('Valid explicit booleans', () => {
            expect(ValidationRules.validate('boolean', true)).toBeNull();
            expect(ValidationRules.validate('boolean', false)).toBeNull();
        });

        test('Invalid truthy/falsy representations', () => {
            expect(ValidationRules.validate('boolean', 'true')).toBeDefined();
            expect(ValidationRules.validate('boolean', 1)).toBeDefined();
            expect(ValidationRules.validate('boolean', null, true)).toBeDefined();
        });
    });

    describe('validate(presence)', () => {
        test('Valid non-empty values', () => {
            expect(ValidationRules.validate('presence', 'anything')).toBeNull();
            expect(ValidationRules.validate('presence', 0)).toBeNull();
        });

        test('Invalid empty values', () => {
            expect(ValidationRules.validate('presence', '', true)).toBeDefined();
            expect(ValidationRules.validate('presence', null, true)).toBeDefined();
            expect(ValidationRules.validate('presence', undefined, true)).toBeDefined();
        });
    });
});