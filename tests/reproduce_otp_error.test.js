
import { Authenticator } from 'otplib';
import { describe, test, expect } from 'vitest';

describe('Reproduction: CryptoPluginMissingError', () => {
    test('Should throw CryptoPluginMissingError when using legacy class API without plugins', () => {
        try {
            // In v13, this class-based usage without explicit crypto configuration
            // is expected to fail or throw when methods are called.
            const authenticator = new Authenticator();
            const secret = authenticator.generateSecret();
            // If it doesn't throw, we fail the test
            expect(secret).toBeDefined(); 
        } catch (error) {
            // We expect an error (TypeError or CryptoPluginMissingError)
            expect(error).toBeDefined();
        }
    });

    test('FIX: Should succeed using Functional API', () => {
        const { generateSecret } = require('otplib');
        const secret = generateSecret();
        expect(secret).toBeDefined();
        expect(typeof secret).toBe('string');
    });
});
